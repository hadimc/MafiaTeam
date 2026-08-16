"use server";

import { refresh } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function pullEventAction(eventId: string, seen: string) {
  await requireUser();
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: {
      status: true,
      scenarioId: true,
      registrations: { select: { userId: true } },
      narrators: { select: { userId: true } },
      games: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, status: true, _count: { select: { players: true } } },
      },
    },
  });
  if (!event) return seen;
  const stamp = [
    event.status,
    event.scenarioId ?? "",
    event.registrations.map((row) => row.userId).sort().join(","),
    event.narrators.map((row) => row.userId).sort().join(","),
    event.games[0]?.id ?? "",
    event.games[0]?.status ?? "",
    String(event.games[0]?._count.players ?? 0),
  ].join("|");
  if (seen && stamp !== seen) refresh();
  return stamp;
}

export async function pullDashboardAction(seen: string) {
  await requireUser();
  const events = await prisma.event.findMany({
    where: { status: { not: "finished" } },
    select: {
      id: true,
      status: true,
      _count: { select: { registrations: true, narrators: true, games: true } },
    },
    orderBy: { id: "asc" },
  });
  const stamp = events
    .map(
      (event) =>
        `${event.id}:${event.status}:${event._count.registrations}:${event._count.narrators}:${event._count.games}`,
    )
    .join(";");
  if (seen && stamp !== seen) refresh();
  return stamp;
}
