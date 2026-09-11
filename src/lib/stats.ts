import type { Faction } from "@/engine";

export type FinishedGame = {
  winningFaction: string | null;
  event: { narrators: { userId: string }[] };
  players: {
    userId: string;
    faction: string;
    user: { displayName: string; displayNameEn: string };
  }[];
};

export type SideWins = { citizen: number; mafia: number; independent: number };

export type PlayerRecord = {
  userId: string;
  name: string;
  played: number;
  wins: number;
  winsBySide: SideWins;
};

const EMPTY_SIDES: SideWins = { citizen: 0, mafia: 0, independent: 0 };

function bump(sides: SideWins, faction: string) {
  if (faction === "citizen" || faction === "mafia" || faction === "independent") {
    sides[faction] += 1;
  }
}

export function computeStats(
  games: FinishedGame[],
  meId: string,
  members: { id: string; displayName: string; displayNameEn: string }[] = [],
) {
  const clubWins: SideWins = { ...EMPTY_SIDES };
  const byUser = new Map<string, PlayerRecord>();

  for (const member of members) {
    byUser.set(member.id, {
      userId: member.id,
      name: member.displayNameEn?.trim() || member.displayName,
      played: 0,
      wins: 0,
      winsBySide: { ...EMPTY_SIDES },
    });
  }

  for (const game of games) {
    const winner = game.winningFaction;
    if (winner) bump(clubWins, winner);
    const narratorSet = new Set(game.event.narrators.map((n) => n.userId));

    for (const player of game.players) {
      if (narratorSet.has(player.userId)) continue;
      const name = player.user.displayNameEn?.trim() || player.user.displayName;
      const row = byUser.get(player.userId) ?? {
        userId: player.userId,
        name,
        played: 0,
        wins: 0,
        winsBySide: { ...EMPTY_SIDES },
      };
      row.played += 1;
      if (winner && player.faction === winner) {
        row.wins += 1;
        bump(row.winsBySide, player.faction);
      }
      byUser.set(player.userId, row);
    }
  }

  const table = [...byUser.values()].sort((a, b) => {
    if (b.wins !== a.wins) return b.wins - a.wins;
    const aLosses = a.played - a.wins;
    const bLosses = b.played - b.wins;
    if (aLosses !== bLosses) return aLosses - bLosses;
    return a.name.localeCompare(b.name);
  });
  const me = byUser.get(meId) ?? {
    userId: meId,
    name: "",
    played: 0,
    wins: 0,
    winsBySide: { ...EMPTY_SIDES },
  };

  return {
    nights: games.length,
    clubWins,
    me,
    table,
  };
}

export function countSides(players: { faction: string }[]): SideWins {
  const sides: SideWins = { ...EMPTY_SIDES };
  for (const player of players) bump(sides, player.faction);
  return sides;
}

export function durationLabel(startedAt?: string | Date | null, finishedAt?: string | Date | null) {
  if (!startedAt || !finishedAt) return null;
  const start = new Date(startedAt).getTime();
  const end = new Date(finishedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  const mins = Math.round((end - start) / 60000);
  if (mins < 60) return `${Math.max(0, mins)} min`;
  const hours = Math.floor(mins / 60);
  const rest = mins % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export function sideLine(sides: SideWins) {
  return `Citizen ${sides.citizen} · Mafia ${sides.mafia} · Independent ${sides.independent}`;
}

export function gameOverview(game: {
  currentDay: number;
  startedAt?: string | Date | null;
  finishedAt?: string | Date | null;
  players: { faction: string; alive: boolean }[];
}) {
  const living = game.players.filter((player) => player.alive);
  return {
    seated: game.players.length,
    living: living.length,
    out: game.players.length - living.length,
    days: game.currentDay,
    livingBySide: countSides(living),
    dealtBySide: countSides(game.players),
    durationLabel: durationLabel(game.startedAt, game.finishedAt),
  };
}

export function eventLane(status: string): "open" | "live" | "past" {
  if (status === "finished") return "past";
  if (status === "in_progress") return "live";
  return "open";
}

export function gameHasStarted(status: string) {
  return status === "in_progress" || status === "finished";
}

export function rolesDealt(status: string) {
  return status === "roles_assigned" || gameHasStarted(status);
}

export function isRosterOpen(status: string) {
  return status === "draft" || status === "registration_open" || status === "scenario_pending";
}

export function isJoinable(status: string) {
  return isRosterOpen(status);
}

export function canDeal(status: string) {
  return status === "scenario_finalized";
}

export function canReopenScenario(status: string) {
  return status === "scenario_finalized" || status === "roles_assigned" || status === "in_progress";
}

export function hasFinalizedScenario(status: string) {
  return (
    status === "scenario_finalized" ||
    status === "roles_assigned" ||
    status === "in_progress" ||
    status === "finished"
  );
}

export function factionLabel(faction: string) {
  if (faction === "mafia") return "Mafia";
  if (faction === "independent") return "Independent";
  if (faction === "citizen") return "Citizen";
  return faction;
}

export function asFaction(value: string): Faction | undefined {
  if (value === "citizen" || value === "mafia" || value === "independent") return value;
}
