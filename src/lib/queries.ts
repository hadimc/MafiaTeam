import { prisma } from "./db";
import type { SessionUser } from "./auth";

export { snapshotFromScenario, readSnapshot, phaseLabel } from "./scenario";
export type { ScenarioSnapshot } from "./scenario";

export async function listEvents() {
  return prisma.event.findMany({
    orderBy: { date: "asc" },
    include: {
      narrator: true,
      scenario: true,
      registrations: true,
      games: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
}

export async function getEventBySlug(slug: string) {
  return prisma.event.findUnique({
    where: { slug },
    include: {
      narrator: true,
      scenario: { include: { roles: { orderBy: { nightOrder: "asc" } } } },
      registrations: { include: { user: true }, orderBy: { registeredAt: "asc" } },
      games: { orderBy: { createdAt: "desc" }, take: 1 },
    },
  });
}

export async function listScenarios() {
  return prisma.scenario.findMany({
    where: { active: true },
    include: { roles: true },
    orderBy: { supportedPlayerCount: "asc" },
  });
}

export async function listUsers() {
  return prisma.user.findMany({ orderBy: { displayName: "asc" } });
}

export function isNarrator(user: SessionUser, event: { narratorId: string | null }) {
  return user.isAdmin || event.narratorId === user.id;
}

export async function getGameForNarrator(gameId: string, user: SessionUser) {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      event: { include: { narrator: true } },
      players: { include: { user: true }, orderBy: { seatNumber: "asc" } },
      actions: { where: { reversed: false }, orderBy: { createdAt: "asc" } },
      votes: true,
      draws: { orderBy: { drawnAt: "asc" } },
    },
  });
  if (!game) return null;
  if (!isNarrator(user, game.event)) return null;
  return game;
}

export async function getMyGamePlayer(gameId: string, userId: string) {
  return prisma.gamePlayer.findUnique({
    where: { gameId_userId: { gameId, userId } },
    include: { game: { include: { event: true } }, user: true },
  });
}
