export type Faction = "citizen" | "mafia" | "independent";

export type RoleDef = {
  key: string;
  name: string;
  nameEn: string;
  faction: Faction;
  description: string;
  descriptionEn: string;
  quantity: number;
  nightOrder: number;
};

export type ScenarioConfig = {
  speakSeconds: number;
  challengeSeconds: number;
  defenseSeconds: number;
  challengesPerDay: number;
  statusInquiries: number;
  nightOrder: string[];
};

export type Phase =
  | "lobby"
  | "intro_day"
  | "intro_night"
  | "day_discussion"
  | "defense_vote"
  | "defense"
  | "elimination_vote"
  | "tie_break"
  | "exit_card"
  | "night"
  | "night_resolution"
  | "morning_report"
  | "game_over";

const NEXT: Record<Phase, Phase[]> = {
  lobby: ["intro_day"],
  intro_day: ["intro_night"],
  intro_night: ["day_discussion"],
  day_discussion: ["defense_vote"],
  defense_vote: ["defense", "elimination_vote"],
  defense: ["elimination_vote"],
  elimination_vote: ["tie_break", "exit_card", "night", "game_over"],
  tie_break: ["exit_card", "night", "game_over"],
  exit_card: ["night", "game_over"],
  night: ["night_resolution"],
  night_resolution: ["morning_report"],
  morning_report: ["day_discussion", "game_over"],
  game_over: [],
};

export function canTransition(from: Phase, to: Phase) {
  return NEXT[from]?.includes(to) ?? false;
}

export function defaultNext(from: Phase): Phase | null {
  return NEXT[from]?.[0] ?? null;
}

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function buildRolePool(roles: RoleDef[]) {
  const pool: Omit<RoleDef, "quantity">[] = [];
  for (const role of roles) {
    for (let i = 0; i < role.quantity; i++) {
      const { quantity: _, ...rest } = role;
      pool.push(rest);
    }
  }
  return shuffle(pool);
}

export function assignRoles(playerIds: string[], roles: RoleDef[]) {
  const pool = buildRolePool(roles);
  if (pool.length !== playerIds.length) {
    throw new Error(`ROLE_COUNT_MISMATCH:${pool.length}:${playerIds.length}`);
  }
  const seats = shuffle(playerIds);
  return seats.map((userId, index) => ({
    userId,
    seatNumber: index + 1,
    role: pool[index],
  }));
}

export function defenseThreshold(livingCount: number) {
  return Math.ceil(livingCount / 2);
}

export function defenseQualifiers(
  votes: { playerId: string; count: number }[],
  livingCount: number,
) {
  const threshold = defenseThreshold(livingCount);
  return votes.filter((v) => v.count > threshold).sort((a, b) => b.count - a.count);
}

export function eliminationResult(votes: { playerId: string; count: number }[]) {
  const max = Math.max(0, ...votes.map((v) => v.count));
  if (max === 0) return { type: "none" as const };
  const top = votes.filter((v) => v.count === max);
  if (top.length === 1) return { type: "eliminate" as const, playerId: top[0].playerId };
  return { type: "tie" as const, playerIds: top.map((v) => v.playerId) };
}

export function randomRedBlue(): "red" | "blue" {
  return Math.random() < 0.5 ? "red" : "blue";
}

export function parseConfig(raw: string): ScenarioConfig {
  const parsed = JSON.parse(raw || "{}") as Partial<ScenarioConfig>;
  return {
    speakSeconds: parsed.speakSeconds ?? 60,
    challengeSeconds: parsed.challengeSeconds ?? 30,
    defenseSeconds: parsed.defenseSeconds ?? 60,
    challengesPerDay: parsed.challengesPerDay ?? 1,
    statusInquiries: parsed.statusInquiries ?? 2,
    nightOrder: parsed.nightOrder ?? [],
  };
}
