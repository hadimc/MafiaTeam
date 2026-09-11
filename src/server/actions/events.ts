"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth";
import { getEventBySlug, isNarrator } from "@/lib/queries";
import { MAX_NARRATORS } from "@/lib/roster";
import { isRosterOpen, canReopenScenario } from "@/lib/stats";
import {
  EXIT_CARDS,
  defaultConfig,
  parseRoleQuantities,
  playerCount,
  roleCreates,
} from "@/lib/catalog";

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48) || `event-${Date.now()}`;
}

function touchEvent(slug: string) {
  revalidatePath(`/events/${slug}`);
  revalidatePath(`/events/${slug}/players`);
  revalidatePath("/dashboard");
}

async function eventWithNarrators(eventId: string) {
  return prisma.event.findUnique({
    where: { id: eventId },
    include: { narrators: true },
  });
}

function rosterUnlocked(event: { status: string; narrators: { userId: string }[] }) {
  return isRosterOpen(event.status) || (event.narrators.length === 0 && event.status === "scenario_finalized");
}

function canManageRoster(
  actor: { id: string; isAdmin: boolean },
  event: { createdById: string; narrators: { userId: string }[] },
) {
  return actor.isAdmin || event.createdById === actor.id || isNarrator(actor, event);
}

export async function joinEventAction(eventId: string) {
  const user = await requireUser();
  const event = await eventWithNarrators(eventId);
  if (!event) return { error: "not_found" };
  if (!rosterUnlocked(event)) return { error: "closed" };

  const existing = await prisma.eventRegistration.findUnique({
    where: { eventId_userId: { eventId, userId: user.id } },
  });
  if (!existing) {
    await prisma.eventRegistration.create({ data: { eventId, userId: user.id } });
  }
  touchEvent(event.slug);
  return { ok: true as const };
}

export async function addPlayerToEventAction(eventId: string, userId: string) {
  await requireAdmin();
  const event = await eventWithNarrators(eventId);
  if (!event) return { error: "not_found" };
  if (!rosterUnlocked(event)) return { error: "closed" };

  const member = await prisma.user.findUnique({ where: { id: userId } });
  if (!member || !member.enabled) return { error: "not_found" };

  const existing = await prisma.eventRegistration.findUnique({
    where: { eventId_userId: { eventId, userId } },
  });
  if (!existing) {
    await prisma.eventRegistration.create({ data: { eventId, userId } });
  }
  touchEvent(event.slug);
  return { ok: true as const };
}

export async function removePlayerFromEventAction(eventId: string, userId: string) {
  await requireAdmin();
  const event = await eventWithNarrators(eventId);
  if (!event) return { error: "not_found" };
  if (!rosterUnlocked(event)) return { error: "closed" };

  await prisma.eventNarrator.deleteMany({ where: { eventId, userId } });
  await prisma.eventRegistration.deleteMany({ where: { eventId, userId } });
  touchEvent(event.slug);
  return { ok: true as const };
}

export async function leaveEventAction(eventId: string) {
  const user = await requireUser();
  const event = await eventWithNarrators(eventId);
  if (!event) return { error: "not_found" };
  if (!rosterUnlocked(event)) return { error: "closed" };

  const existing = await prisma.eventRegistration.findUnique({
    where: { eventId_userId: { eventId, userId: user.id } },
  });
  if (existing) {
    await prisma.eventNarrator.deleteMany({ where: { eventId, userId: user.id } });
    await prisma.eventRegistration.delete({ where: { id: existing.id } });
  }
  touchEvent(event.slug);
  return { ok: true as const };
}

export async function rsvpAction(eventId: string) {
  const event = await eventWithNarrators(eventId);
  if (!event) return { error: "not_found" };
  if (!rosterUnlocked(event)) return { error: "closed" };
  const user = await requireUser();
  const existing = await prisma.eventRegistration.findUnique({
    where: { eventId_userId: { eventId, userId: user.id } },
  });
  if (existing) return leaveEventAction(eventId);
  return joinEventAction(eventId);
}

export async function switchSeatAction(eventId: string) {
  const user = await requireUser();
  const event = await eventWithNarrators(eventId);
  if (!event) return { error: "not_found" };
  if (!rosterUnlocked(event)) return { error: "locked" };

  const registered = await prisma.eventRegistration.findUnique({
    where: { eventId_userId: { eventId, userId: user.id } },
  });
  if (!registered) return { error: "not_registered" };

  const already = event.narrators.some((n) => n.userId === user.id);
  if (already) {
    await prisma.eventNarrator.delete({ where: { eventId_userId: { eventId, userId: user.id } } });
    await prisma.eventRegistration.update({
      where: { id: registered.id },
      data: { narratorVolunteer: false },
    });
  } else {
    if (event.narrators.length >= MAX_NARRATORS) return { error: "max" };
    await prisma.eventNarrator.create({ data: { eventId, userId: user.id } });
    await prisma.eventRegistration.update({
      where: { id: registered.id },
      data: { narratorVolunteer: true },
    });
  }
  touchEvent(event.slug);
}

export async function volunteerNarratorAction(eventId: string) {
  return switchSeatAction(eventId);
}

export async function assignNarratorAction(eventId: string, userId: string) {
  const actor = await requireUser();
  const event = await eventWithNarrators(eventId);
  if (!event) return { error: "not_found" };
  if (!rosterUnlocked(event)) return { error: "locked" };
  if (!canManageRoster(actor, event) && actor.id !== userId) return { error: "forbidden" };

  const registered = await prisma.eventRegistration.findUnique({
    where: { eventId_userId: { eventId, userId } },
  });
  if (!registered) return { error: "not_registered" };

  const already = event.narrators.some((n) => n.userId === userId);
  if (already) {
    await prisma.eventNarrator.delete({ where: { eventId_userId: { eventId, userId } } });
    await prisma.eventRegistration.update({
      where: { id: registered.id },
      data: { narratorVolunteer: false },
    });
  } else {
    if (event.narrators.length >= MAX_NARRATORS) return { error: "max" };
    await prisma.eventNarrator.create({ data: { eventId, userId } });
    await prisma.eventRegistration.update({
      where: { id: registered.id },
      data: { narratorVolunteer: true },
    });
  }
  touchEvent(event.slug);
}

export async function reopenScenarioAction(eventId: string) {
  const user = await requireUser();
  const event = await eventWithNarrators(eventId);
  if (!event || !isNarrator(user, event)) return { error: "forbidden" };
  if (!canReopenScenario(event.status)) return { error: "locked" };

  await prisma.$transaction([
    prisma.game.deleteMany({ where: { eventId: event.id } }),
    prisma.event.update({
      where: { id: event.id },
      data: { status: "scenario_pending" },
    }),
  ]);
  touchEvent(event.slug);
  return { ok: true as const };
}

export async function selectScenarioAction(eventId: string, scenarioId: string) {
  const user = await requireUser();
  const event = await eventWithNarrators(eventId);
  if (!event || !isNarrator(user, event)) return { error: "forbidden" };
  if (!rosterUnlocked(event)) return { error: "locked" };

  await prisma.event.update({
    where: { id: eventId },
    data: {
      scenarioId,
      status: event.status === "registration_open" || event.status === "draft" ? "scenario_pending" : event.status,
    },
  });
  touchEvent(event.slug);
}

export async function finalizeScenarioAction(eventId: string, formData: FormData) {
  const user = await requireUser();
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { narrators: true, registrations: true, scenario: true },
  });
  if (!event || !isNarrator(user, event)) return { error: "forbidden" };
  if (event.narrators.length < 1) return { error: "incomplete" };
  if (!rosterUnlocked(event)) return { error: "locked" };

  const scenarioId = String(formData.get("scenarioId") || event.scenarioId || "");
  const base = await prisma.scenario.findUnique({
    where: { id: scenarioId },
    include: { exitCards: true },
  });
  if (!base) return { error: "incomplete" };

  const qty = parseRoleQuantities(formData);
  const players = playerCount(qty);
  const seated = event.registrations.length - event.narrators.length;
  if (players !== seated) return { error: "count", expected: seated, actual: players };

  const attendees = event.narrators.length + seated;
  const nameEn = `${event.titleEn} · ${base.nameEn}`.slice(0, 90);
  const exitCards =
    base.exitCards.length > 0
      ? base.exitCards.map(({ key, name, nameEn, description, descriptionEn }) => ({
          key,
          name,
          nameEn,
          description,
          descriptionEn,
        }))
      : EXIT_CARDS.map(([key, name, nameEn, description, descriptionEn]) => ({
          key,
          name,
          nameEn,
          description,
          descriptionEn,
        }));

  const reuse = event.scenario && !event.scenario.active && event.scenarioId;
  if (reuse && event.scenarioId) {
    await prisma.$transaction([
      prisma.game.deleteMany({ where: { eventId } }),
      prisma.role.deleteMany({ where: { scenarioId: event.scenarioId } }),
      prisma.scenario.update({
        where: { id: event.scenarioId },
        data: {
          name: nameEn,
          nameEn: `${nameEn} · ${event.slug}`,
          attendeeCount: attendees,
          narratorCount: event.narrators.length,
          supportedPlayerCount: players,
          configuration: JSON.stringify(defaultConfig(qty)),
          version: { increment: 1 },
          roles: { create: roleCreates(qty) },
        },
      }),
      prisma.event.update({
        where: { id: eventId },
        data: { status: "scenario_finalized" },
      }),
    ]);
  } else {
    const clone = await prisma.scenario.create({
      data: {
        name: nameEn,
        nameEn: `${nameEn} · ${event.slug}`,
        description: base.description,
        descriptionEn: base.descriptionEn,
        attendeeCount: attendees,
        narratorCount: event.narrators.length,
        supportedPlayerCount: players,
        configuration: JSON.stringify(defaultConfig(qty)),
        active: false,
        roles: { create: roleCreates(qty) },
        exitCards: { create: exitCards },
      },
    });
    await prisma.$transaction([
      prisma.game.deleteMany({ where: { eventId } }),
      prisma.event.update({
        where: { id: eventId },
        data: { scenarioId: clone.id, status: "scenario_finalized" },
      }),
    ]);
  }
  revalidatePath(`/events/${event.slug}`);
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function createEventAction(formData: FormData) {
  const admin = await requireAdmin();
  const titleEn = String(formData.get("title") ?? "").trim();
  const title = titleEn;
  const locationEn = String(formData.get("location") ?? "").trim();
  const location = locationEn;
  const dateRaw = String(formData.get("date") ?? "");
  if (!title || !dateRaw) return { error: "missing" };

  const slugBase = slugify(String(formData.get("slug") ?? titleEn));
  let slug = slugBase;
  let n = 1;
  while (await prisma.event.findUnique({ where: { slug } })) {
    slug = `${slugBase}-${++n}`;
  }

  const showHints = formData.get("showHints") === "on";

  const event = await prisma.event.create({
    data: {
      slug,
      title,
      titleEn,
      location,
      locationEn,
      date: new Date(dateRaw),
      createdById: admin.id,
      status: "registration_open",
      showHints,
    },
  });
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  revalidatePath("/admin/events");
  return { slug: event.slug };
}

export async function setEventShowHintsAction(eventId: string, showHints: boolean) {
  await requireAdmin();
  const event = await prisma.event.update({ where: { id: eventId }, data: { showHints } });
  revalidatePath("/admin");
  revalidatePath("/admin/events");
  revalidatePath(`/events/${event.slug}`);
  revalidatePath("/dashboard");
  return { ok: true as const, showHints: event.showHints };
}

export async function deleteEventAction(eventId: string) {
  await requireAdmin();
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return { error: "not_found" };

  await prisma.event.delete({ where: { id: eventId } });
  revalidatePath("/dashboard");
  revalidatePath("/past");
  revalidatePath("/admin");
  revalidatePath("/admin/events");
  revalidatePath(`/events/${event.slug}`);
  return { ok: true as const };
}

export async function loadEvent(slug: string) {
  return getEventBySlug(slug);
}
