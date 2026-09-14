import { createHash } from "node:crypto";

export type GameSyncInput = {
  status: string;
  currentDay: number;
  currentPhase: string;
  nightStep: number;
  speakerIndex: number;
  winningFaction: string | null;
  scenarioSnapshot: string;
  players: { id: string; alive: boolean; roleKey: string }[];
  actions: {
    id: string;
    reversed: boolean;
    actionType: string;
    targetPlayerId: string | null;
    dayNumber: number;
    metadata?: string | null;
  }[];
  votes: { id: string; count: number; targetPlayerId: string; voteType: string; dayNumber: number }[];
  draws: { id: string }[];
};

export function gameSyncStamp(game: GameSyncInput) {
  const raw = [
    game.status,
    String(game.currentDay),
    game.currentPhase,
    String(game.nightStep),
    String(game.speakerIndex),
    game.winningFaction ?? "",
    game.scenarioSnapshot,
    ...[...game.players]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((player) => `${player.id}:${player.alive ? 1 : 0}:${player.roleKey}`),
    ...game.actions.map(
      (action) =>
        `${action.id}:${action.reversed ? 1 : 0}:${action.actionType}:${action.targetPlayerId ?? ""}:${action.dayNumber}:${action.metadata ?? ""}`,
    ),
    ...[...game.votes]
      .sort((a, b) => a.id.localeCompare(b.id))
      .map((vote) => `${vote.id}:${vote.count}:${vote.targetPlayerId}:${vote.voteType}:${vote.dayNumber}`),
    ...[...game.draws].map((draw) => draw.id).sort(),
  ].join("|");
  return createHash("sha1").update(raw).digest("hex");
}
