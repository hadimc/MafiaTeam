"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin, requireUser } from "@/lib/auth";
import { getEventBySlug, isNarrator } from "@/lib/queries";

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48) || `event-${Date.now()}`;
}

export async function rsvpAction(eventId: string) {
  const user = await requireUser();
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return { error: "not_found" };
  if (!["draft", "registration_open"].includes(event.status)) return { error: "closed" };

  const existing = await prisma.eventRegistration.findUnique({
    where: { eventId_userId: { eventId, userId: user.id } },
  });
  if (existing) {
    if (event.narratorId === user.id) {
      await prisma.event.update({ where: { id: eventId }, data: { narratorId: null } });
    }
    await prisma.eventRegistration.delete({ where: { id: existing.id } });
  } else {
    await prisma.eventRegistration.create({ data: { eventId, userId: user.id } });
  }
  revalidatePath(`/events/${event.slug}`);
  revalidatePath("/dashboard");
}

export async function volunteerNarratorAction(eventId: string) {
  const user = await requireUser();
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return { error: "not_found" };

  const reg = await prisma.eventRegistration.findUnique({
    where: { eventId_userId: { eventId, userId: user.id } },
  });
  if (!reg) return { error: "not_registered" };

  const volunteering = !reg.narratorVolunteer;
  await prisma.eventRegistration.update({
    where: { id: reg.id },
    data: { narratorVolunteer: volunteering },
  });
  if (volunteering && !event.narratorId) {
    await prisma.event.update({ where: { id: eventId }, data: { narratorId: user.id } });
  }
  if (!volunteering && event.narratorId === user.id) {
    await prisma.event.update({ where: { id: eventId }, data: { narratorId: null } });
  }
  revalidatePath(`/events/${event.slug}`);
}

export async function assignNarratorAction(eventId: string, userId: string) {
  const actor = await requireUser();
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) return { error: "not_found" };
  if (!actor.isAdmin && event.createdById !== actor.id) return { error: "forbidden" };

  await prisma.event.update({ where: { id: eventId }, data: { narratorId: userId } });
  await prisma.eventRegistration.updateMany({
    where: { eventId, userId },
    data: { narratorVolunteer: true },
  });
  revalidatePath(`/events/${event.slug}`);
}

export async function selectScenarioAction(eventId: string, scenarioId: string) {
  const user = await requireUser();
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || !isNarrator(user, event)) return { error: "forbidden" };
  if (event.status === "scenario_finalized" && !user.isAdmin) return { error: "locked" };

  await prisma.event.update({
    where: { id: eventId },
    data: { scenarioId, status: event.status === "registration_open" ? "scenario_pending" : event.status },
  });
  revalidatePath(`/events/${event.slug}`);
}

export async function finalizeScenarioAction(eventId: string) {
  const user = await requireUser();
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event || !isNarrator(user, event)) return { error: "forbidden" };
  if (!event.scenarioId || !event.narratorId) return { error: "incomplete" };

  await prisma.event.update({
    where: { id: eventId },
    data: { status: "scenario_finalized" },
  });
  revalidatePath(`/events/${event.slug}`);
}

export async function createEventAction(formData: FormData) {
  const admin = await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  const titleEn = String(formData.get("titleEn") ?? "").trim() || title;
  const location = String(formData.get("location") ?? "").trim();
  const locationEn = String(formData.get("locationEn") ?? "").trim() || location;
  const dateRaw = String(formData.get("date") ?? "");
  if (!title || !dateRaw) return { error: "missing" };

  const slugBase = slugify(String(formData.get("slug") ?? (titleEn || title)));
  let slug = slugBase;
  let n = 1;
  while (await prisma.event.findUnique({ where: { slug } })) {
    slug = `${slugBase}-${++n}`;
  }

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
    },
  });
  revalidatePath("/admin/events");
  revalidatePath("/dashboard");
  return { slug: event.slug };
}

export async function loadEvent(slug: string) {
  return getEventBySlug(slug);
}
