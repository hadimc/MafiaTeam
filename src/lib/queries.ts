import { prisma } from "./db";
import type { SessionUser } from "./auth";
import { isEventNarrator } from "./roster";

export { snapshotFromScenario, readSnapshot, phaseLabel } from "./scenario";
export type { ScenarioSnapshot } from "./scenario";

const gameWithPlayers = {
  orderBy: { createdAt: "desc" as const },
  take: 1,
  include: {
    players: { include: { user: true }, orderBy: { seatNumber: "asc" as const } },
  },
};

export async function listEvents() {
  return prisma.event.findMany({
    orderBy: { date: "asc" },
    include: {
      narrators: { include: { user: true }, orderBy: { createdAt: "asc" } },
      scenario: true,
      registrations: true,
      games: gameWithPlayers,
    },
  });
}

export async function getEventBySlug(slug: string) {
  return prisma.event.findUnique({
    where: { slug },
    include: {
      narrators: { include: { user: true }, orderBy: { createdAt: "asc" } },
      scenario: { include: { roles: { orderBy: { nightOrder: "asc" } } } },
      registrations: { include: { user: true }, orderBy: { registeredAt: "asc" } },
      games: gameWithPlayers,
    },
  });
}

export async function listFinishedGames() {
  return prisma.game.findMany({
    where: { status: "finished", winningFaction: { not: null } },
    include: {
      event: { include: { narrators: true } },
      players: { include: { user: true } },
    },
    orderBy: { finishedAt: "desc" },
  });
}

export async function listScenarios() {
  return prisma.scenario.findMany({
    where: { active: true },
    include: { roles: true },
    orderBy: [{ attendeeCount: "asc" }, { nameEn: "asc" }],
  });
}

export async function listScenariosForEvent(scenarioId?: string | null) {
  const active = await listScenarios();
  if (!scenarioId || active.some((scenario) => scenario.id === scenarioId)) return active;
  const extra = await prisma.scenario.findUnique({
    where: { id: scenarioId },
    include: { roles: true },
  });
  return extra ? [...active, extra] : active;
}

export async function listAllScenarios() {
  return prisma.scenario.findMany({
    where: { active: true },
    include: { roles: true, _count: { select: { events: true } } },
    orderBy: [{ attendeeCount: "asc" }, { nameEn: "asc" }],
  });
}

export async function getScenario(id: string) {
  return prisma.scenario.findUnique({
    where: { id },
    include: { roles: true, _count: { select: { events: true } } },
  });
}

export async function listUsers() {
  return prisma.user.findMany({ orderBy: { displayNameEn: "asc" } });
}

export async function listRules() {
  return prisma.houseRule.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
}

export function isNarrator(user: { id: string }, event: { narrators: { userId: string }[] }) {
  return isEventNarrator(user.id, event);
}

export async function getGameForNarrator(gameId: string, user: SessionUser) {
  const game = await prisma.game.findUnique({
    where: { id: gameId },
    include: {
      event: { include: { narrators: true } },
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
