"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import {
  EXIT_CARDS,
  defaultConfig,
  parseRoleQuantities,
  playerCount,
  roleCreates,
} from "@/lib/catalog";

function parseMeta(formData: FormData) {
  const nameEn = String(formData.get("nameEn") ?? "").trim();
  const host = Math.min(1, Math.max(0, Number(formData.get("qty_host")) || 0));
  const assistant = Math.min(1, Math.max(0, Number(formData.get("qty_assistant")) || 0));
  const narratorCount = Math.min(2, Math.max(1, host + assistant || 1));
  const qty = parseRoleQuantities(formData);
  const players = playerCount(qty);
  const attendeeCount = narratorCount + players;
  return { nameEn, narratorCount, qty, players, attendeeCount };
}

export async function createScenarioAction(formData: FormData) {
  await requireAdmin();
  const { nameEn, narratorCount, qty, players, attendeeCount } = parseMeta(formData);
  if (!nameEn) return { error: "missing" };
  if (players < 1) return { error: "roles" };
  const exists = await prisma.scenario.findUnique({ where: { nameEn } });
  if (exists) return { error: "exists" };

  const scenario = await prisma.scenario.create({
    data: {
      name: nameEn,
      nameEn,
      descriptionEn: String(formData.get("notes") ?? "").trim(),
      description: String(formData.get("notes") ?? "").trim(),
      attendeeCount,
      narratorCount,
      supportedPlayerCount: players,
      configuration: JSON.stringify(defaultConfig(qty)),
      roles: { create: roleCreates(qty) },
      exitCards: {
        create: EXIT_CARDS.map(([key, name, nameEn, description, descriptionEn]) => ({
          key,
          name,
          nameEn,
          description,
          descriptionEn,
        })),
      },
    },
  });
  revalidatePath("/admin/scenarios");
  return { id: scenario.id };
}

export async function updateScenarioAction(id: string, formData: FormData) {
  await requireAdmin();
  const { nameEn, narratorCount, qty, players, attendeeCount } = parseMeta(formData);
  if (!nameEn) return { error: "missing" };
  if (players < 1) return { error: "roles" };
  const clash = await prisma.scenario.findFirst({ where: { nameEn, NOT: { id } } });
  if (clash) return { error: "exists" };

  await prisma.$transaction([
    prisma.role.deleteMany({ where: { scenarioId: id } }),
    prisma.scenario.update({
      where: { id },
      data: {
        name: nameEn,
        nameEn,
        descriptionEn: String(formData.get("notes") ?? "").trim(),
        description: String(formData.get("notes") ?? "").trim(),
        attendeeCount,
        narratorCount,
        supportedPlayerCount: players,
        configuration: JSON.stringify(defaultConfig(qty)),
        version: { increment: 1 },
        roles: { create: roleCreates(qty) },
      },
    }),
  ]);
  revalidatePath("/admin/scenarios");
  revalidatePath(`/admin/scenarios/${id}`);
  return { ok: true as const };
}

export async function deleteScenarioAction(id: string) {
  await requireAdmin();
  const used = await prisma.event.count({ where: { scenarioId: id } });
  if (used > 0) return { error: "in_use" };
  await prisma.scenario.delete({ where: { id } });
  revalidatePath("/admin/scenarios");
  return { ok: true };
}
