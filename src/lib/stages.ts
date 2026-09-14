import { DEFAULT_ZODIAC_RULES, zodiacShootsOnNight, type ZodiacRules, type ZodiacShootNights } from "./zodiac";

export type Stage = { kind: "day" | "night"; n: number };

export type StageTask = {
  key: string;
  nameEn: string;
  nameFa: string;
  summaryEn: string;
  notesEn: string;
};

const DAY_TASKS: StageTask[] = [
  {
    key: "nightBrief",
    nameEn: "Night briefing",
    nameFa: "شرح نتایج شب",
    summaryEn: "Announce who must leave, and who returns. Names only, except say who an independent was.",
    notesEn: "From day 2. Seats already updated. Do not explain why. If an independent left, announce the role.",
  },
  {
    key: "inquiry",
    nameEn: "Inquiry",
    nameFa: "استعلام",
    summaryEn: "Report how many Citizen, Mafia, and Independent roles are out — and how many remain.",
    notesEn: "From day 2. The table may ask only twice. Record each time they ask.",
  },
  {
    key: "speak",
    nameEn: "Speaking & Challenge",
    nameFa: "صحبت و چالش",
    summaryEn: "Each living player speaks in turn. Use the 1-minute timer. Optional 30-second challenge during a speech.",
    notesEn: "Challenge from day 1. Max one given and one received per person per day.",
  },
  {
    key: "dayShot",
    nameEn: "Day shot",
    nameFa: "شلیک روز",
    summaryEn: "Gun holder may shoot during a challenge. A live round eliminates. The round is spent either way.",
    notesEn: "Optional.",
  },
  {
    key: "defenseVote",
    nameEn: "Defense vote",
    nameFa: "رای گیری دفاع",
    summaryEn: "After speaking, vote who goes to defense.",
    notesEn: "Need at least half minus 1 votes.",
  },
  {
    key: "defense",
    nameEn: "Defense",
    nameFa: "دفاع",
    summaryEn: "Defenders speak. Use the 1-minute timer. Devil option if more than one defender.",
    notesEn: "1 minute each.",
  },
  {
    key: "elimVote",
    nameEn: "Elimination vote",
    nameFa: "رای گیری خروج",
    summaryEn: "Vote whether someone leaves. If Mayor is in, this vote is midday sleep (eyes closed).",
    notesEn: "One defender: half minus 1. Several: highest votes leave.",
  },
  {
    key: "mayorVeto",
    nameEn: "Mayor vote",
    nameFa: "تغییر رای",
    summaryEn: "Mayor has one coupon to change a vote — cancel it or force someone out.",
    notesEn: "Record when the coupon is used. This step then leaves later days.",
  },
  {
    key: "lottery",
    nameEn: "Exit lottery",
    nameFa: "قرعه خروج",
    summaryEn: "If two defenders tie, draw a Blue or Green card. When someone leaves, their side also loses that ability.",
    notesEn: "Hold a card to peek. Blue / Green.",
  },
  {
    key: "exitCard",
    nameEn: "Exit card",
    nameFa: "کارت کشیدن",
    summaryEn: "The person voted out draws one remaining exit card. Hold to peek. Drawn cards leave the deck.",
    notesEn: "Day-vote exits. If Handcuffs is drawn, pick any living player — they cannot use their night ability tonight.",
  },
  {
    key: "removePlayers",
    nameEn: "Remove players",
    nameFa: "حذف بازیکن",
    summaryEn: "Tap everyone who leaves from the day vote, lottery, or a day shot.",
    notesEn: "Last night’s leavers were already removed when that night ended.",
  },
];

const NIGHT_TASKS: StageTask[] = [
  {
    key: "faceChange",
    nameEn: "Face-off",
    nameFa: "تغییر چهره",
    summaryEn: "One Face-off only: pick one player outside and one player inside. Their roles swap.",
    notesEn: "Outside = eliminated. Inside = still seated. Jack’s curse stays on the person, not the card. Cancel only on the night of the swap. After that, this step does not appear again.",
  },
  {
    key: "nostradamus",
    nameEn: "Nostradamus",
    nameFa: "عملیات نوستراداموس",
    summaryEn: "First-night inquiry and side choice, as the role card says.",
    notesEn: "Intro night only.",
  },
  {
    key: "jack",
    nameEn: "Jack",
    nameFa: "عملیات جک",
    summaryEn: "Each night curse a new living player. When everyone remaining has been cursed, a new round starts.",
    notesEn: "Must switch every night. Curse stays on the person if cards swap. Freezes if Jack is shown.",
  },
  {
    key: "zodiac",
    nameEn: "Zodiac",
    nameFa: "عملیات زودیاک",
    summaryEn: "Intro night: thumbs-up only. Even nights: shoot one player from either side.",
    notesEn: "Skip on odd nights — the Zodiac is not woken. Night-immune to the Mafia shot and Leon's shot. Shooting Watson kills the Zodiac instead. Only a day vote or the Gunner's real round removes the Zodiac.",
  },
  {
    key: "mafia",
    nameEn: "Mafia",
    nameFa: "عملیات مافیا",
    summaryEn: "Say the lines for Mafia roles that are in this scenario. Main action is one of: shot, sixth sense, or purchase. Then Lecter save and Matador block if those roles exist.",
    notesEn: "Night 1+. Skip roles that were never in this scenario. If a dealt role is out but not publicly known, still say the wake line. Do not record an ability after its holder has left: no sixth sense without Godfather, no purchase without Saul, no Lecter save, no Matador block. Purchase is available only after Mafia has already lost a member. Lecter may self-save once. Tap again to correct a target. Nobody leaves until the night ends.",
  },
  {
    key: "town",
    nameEn: "Citizen",
    nameFa: "عملیات شهر",
    summaryEn: "Say the town lines for roles in this scenario. Record Watson’s save, Leon’s shot, and Kane’s coupon. Do not record the Detective inquiry.",
    notesEn: "Night 1+. Skip roles that were never in the scenario. If a dealt role is out but not publicly known, still say the line. Watson may self-save once. Kane has one coupon: citizen does nothing, Mafia means Kane leaves the next night. Removals wait until you go to the next day.",
  },
  {
    key: "nightEnd",
    nameEn: "Night Result",
    nameFa: "نتیجه شب",
    summaryEn: "Check who would leave or return, and why, before you go to the next day.",
    notesEn: "Narrator only. Confirm the picks match these reasons. Next applies the result to the seats.",
  },
];

const MAFIA_LIKE_ORDER = ["godfather", "saul", "lecter", "matador", "mafioso"];
const TOWN_LIKE_ORDER = ["watson", "leon", "kane", "detective", "constantine", "mayor", "gunner", "villager"];

export type NightLine = "skip" | "record" | "cover";

export function scenarioRoleKeys(roles: { key: string; quantity: number }[]) {
  return new Set(roles.filter((role) => role.quantity > 0).map((role) => role.key));
}

export function publicPlayerIds(actions: { actionType: string; targetPlayerId?: string | null }[]) {
  return new Set(
    actions
      .filter((action) => action.actionType === "shown" && action.targetPlayerId)
      .map((action) => action.targetPlayerId as string),
  );
}

export function nightLine(
  roleKey: string,
  scenarioKeys: Set<string>,
  players: { id: string; roleKey: string; alive: boolean; faction?: string }[],
  publicIds: Set<string>,
): NightLine {
  if (!scenarioKeys.has(roleKey)) return "skip";
  const holders = players.filter((player) => player.roleKey === roleKey);
  if (holders.some((player) => player.alive)) return "record";
  if (holders.length > 0 && holders.every((player) => player.faction === "independent")) return "skip";
  if (holders.length > 0 && holders.every((player) => publicIds.has(player.id))) return "skip";
  return "cover";
}

export function stageFromGame(game: { currentDay: number; currentPhase: string; status: string }): Stage {
  const phase = game.currentPhase;
  if (phase === "intro_night") return { kind: "night", n: 0 };
  if (phase === "night" || phase === "night_resolution") {
    return { kind: "night", n: game.currentDay };
  }
  if (phase === "lobby" || phase === "intro_day") return { kind: "day", n: 0 };
  return { kind: "day", n: game.currentDay };
}

export function stageTitle(stage: Stage) {
  return stage.kind === "day" ? `Day ${stage.n}` : `Night ${stage.n}`;
}

export function stageSubtitle(stage: Stage) {
  if (stage.kind === "day" && stage.n === 0) return "Introduction day";
  if (stage.kind === "night" && stage.n === 0) return "Introduction night";
  return stage.kind === "day" ? "Day" : "Night";
}

export function nextStage(stage: Stage): Stage {
  if (stage.kind === "day") return { kind: "night", n: stage.n };
  return { kind: "day", n: stage.n + 1 };
}

export function prevStage(stage: Stage): Stage | null {
  if (stage.kind === "day" && stage.n === 0) return null;
  if (stage.kind === "night") return { kind: "day", n: stage.n };
  return { kind: "night", n: stage.n - 1 };
}

export function persistStage(stage: Stage) {
  if (stage.kind === "day" && stage.n === 0) {
    return { currentDay: 0, currentPhase: "intro_day", nightStep: 0 };
  }
  if (stage.kind === "night" && stage.n === 0) {
    return { currentDay: 0, currentPhase: "intro_night", nightStep: 0 };
  }
  if (stage.kind === "night") {
    return { currentDay: stage.n, currentPhase: "night", nightStep: 0 };
  }
  return { currentDay: stage.n, currentPhase: "day_discussion", nightStep: 0, speakerIndex: 0 };
}

export function dayTasks(
  stage: Stage,
  scriptRoles: string[],
  mayorCouponDay: number | null = null,
  livingRoles: Set<string> | null = null,
  hasActiveGunHolder = false,
) {
  const set = new Set(scriptRoles);
  const living = (key: string) => !livingRoles || livingRoles.has(key);
  return DAY_TASKS.filter((task) => {
    if (task.key === "nightBrief" || task.key === "inquiry") return stage.n >= 2;
    if (task.key === "speak") return true;
    if (task.key === "mayorVeto") {
      if (stage.n < 1 || !set.has("mayor") || !living("mayor")) return false;
      if (mayorCouponDay == null) return true;
      return mayorCouponDay === stage.n;
    }
    if (task.key === "dayShot") {
      return stage.n >= 1 && set.has("gunner") && (living("gunner") || hasActiveGunHolder);
    }
    if (task.key === "removePlayers") return stage.n >= 1;
    return stage.n >= 1;
  });
}

export function nightTasks(
  stage: Stage,
  hasDead: boolean,
  line: (roleKey: string) => NightLine,
  faceChangeDay: number | null = null,
  shootNights: ZodiacShootNights = "even",
) {
  const anyMafia = MAFIA_LIKE_ORDER.some((key) => line(key) !== "skip");
  const anyTown = TOWN_LIKE_ORDER.some((key) => line(key) !== "skip");
  return NIGHT_TASKS.filter((task) => {
    if (task.key === "faceChange") {
      if (stage.n < 1 || !hasDead) return false;
      if (faceChangeDay != null && faceChangeDay !== stage.n) return false;
      return true;
    }
    if (task.key === "nostradamus") return stage.n === 0 && line("nostradamus") !== "skip";
    if (task.key === "jack") return line("jack") !== "skip";
    if (task.key === "zodiac") {
      if (line("zodiac") === "skip") return false;
      if (stage.n === 0) return true;
      return zodiacShootsOnNight(stage.n, shootNights);
    }
    if (task.key === "mafia") return anyMafia;
    if (task.key === "town") return anyTown;
    if (task.key === "nightEnd") return stage.n >= 1;
    return true;
  });
}

type LikePlayer = { id: string; roleKey: string; seatNumber: number };

function likeOrder<T extends LikePlayer>(players: T[], order: string[]) {
  const rank = (key: string) => {
    const index = order.indexOf(key);
    return index === -1 ? 99 : index;
  };
  return players
    .filter((player) => order.includes(player.roleKey))
    .sort((a, b) => rank(a.roleKey) - rank(b.roleKey) || a.seatNumber - b.seatNumber);
}

export function mafiaLikeOrder<T extends LikePlayer>(players: T[]) {
  return likeOrder(players, MAFIA_LIKE_ORDER);
}

export function townLikeOrder<T extends LikePlayer>(players: T[]) {
  return likeOrder(players, TOWN_LIKE_ORDER);
}

export function jackCurseHistory(
  actions: { actionType: string; dayNumber: number; targetPlayerId?: string | null }[],
  currentDay: number,
) {
  const byNight = new Map<number, string>();
  for (const action of actions) {
    if (action.actionType !== "jack" || !action.targetPlayerId) continue;
    byNight.set(action.dayNumber, action.targetPlayerId);
  }
  const nights = [...byNight.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([day, playerId]) => ({ day, playerId }));
  const tonightId = byNight.get(currentDay) ?? null;
  const pastIds = new Set(nights.filter((row) => row.day !== currentDay).map((row) => row.playerId));
  const active = nights.at(-1) ?? null;
  return { nights, tonightId, pastIds, active };
}

export function activeJackCurse(
  actions: { actionType: string; dayNumber: number; targetPlayerId?: string | null }[],
) {
  return jackCurseHistory(actions, -1).active;
}

function exitCardMeta(raw?: string | null) {
  try {
    return JSON.parse(raw || "{}") as { key?: string; id?: string };
  } catch {
    return {};
  }
}

/** Beautiful Mind can guess Jack, Jack’s curse, or Nostradamus. */
export function beautifulMindHasGuess(
  players: { id: string; roleKey: string; alive?: boolean }[],
  actions: { actionType: string; dayNumber: number; targetPlayerId?: string | null }[],
) {
  if (players.some((player) => player.alive !== false && (player.roleKey === "jack" || player.roleKey === "nostradamus"))) {
    return true;
  }
  const curse = activeJackCurse(actions);
  return Boolean(curse && players.some((player) => player.alive !== false && player.id === curse.playerId));
}

export function beautifulMindDeckState(
  cards: { id: string; key: string; used: boolean }[],
  actions: { actionType: string; metadata?: string | null }[],
) {
  const card = cards.find((item) => item.key === "mind");
  if (!card) return "absent" as const;
  if (!card.used) return "in_deck" as const;
  const drawn = actions.some((action) => {
    if (action.actionType !== "exit_card") return false;
    const meta = exitCardMeta(action.metadata);
    return meta.key === "mind" && (!meta.id || meta.id === card.id);
  });
  return drawn ? ("drawn" as const) : ("removed" as const);
}

export function jackCurseRound(
  actions: { actionType: string; dayNumber: number; targetPlayerId?: string | null }[],
  living: { id: string; roleKey: string }[],
  currentDay: number,
) {
  const history = jackCurseHistory(actions, currentDay);
  const pool = living.filter((player) => player.roleKey !== "jack").map((player) => player.id);
  const used = new Set<string>();
  let round = 1;
  for (const row of history.nights) {
    if (pool.length > 0 && pool.every((id) => used.has(id))) {
      used.clear();
      round += 1;
    }
    used.add(row.playerId);
  }

  const unused = pool.filter((id) => !used.has(id));
  const awaitingNewRound = unused.length === 0 && pool.length > 0;
  if (awaitingNewRound && !history.tonightId) round += 1;
  let eligible = awaitingNewRound ? [...pool] : unused;
  if (history.tonightId && !eligible.includes(history.tonightId)) {
    eligible = [...eligible, history.tonightId];
  }

  const previous = [...history.nights].reverse().find((row) => row.day !== currentDay);
  if (previous && previous.playerId !== history.tonightId) {
    const withoutPrev = eligible.filter((id) => id !== previous.playerId);
    if (withoutPrev.length > 0) eligible = withoutPrev;
  }

  return { ...history, eligibleIds: eligible, round, newRound: awaitingNewRound };
}

export const GUNNER_FAKE_MAX = 2;
export const GUNNER_REAL_MAX = 1;

export type GunnerBullet = "fake" | "real";

export function gunnerBulletType(action: { metadata?: string | null }): GunnerBullet | null {
  if (!action.metadata) return null;
  try {
    const meta = JSON.parse(action.metadata) as { bulletType?: string };
    if (meta.bulletType === "real") return "real";
    if (meta.bulletType === "fake") return "fake";
  } catch {
    return null;
  }
  return null;
}

/** Ammo already handed out by the Gunner (each "gunner" gift action consumes one round). */
export function gunnerAmmo(actions: { actionType: string; metadata?: string | null }[]) {
  const gifts = actions.filter((action) => action.actionType === "gunner");
  const realUsed = gifts.filter((action) => gunnerBulletType(action) === "real").length;
  const fakeUsed = gifts.length - realUsed;
  return {
    fakeUsed,
    realUsed,
    fakeLeft: Math.max(0, GUNNER_FAKE_MAX - fakeUsed),
    realLeft: Math.max(0, GUNNER_REAL_MAX - realUsed),
  };
}

/** Living players currently holding a gun the Gunner gave them that they have not fired yet. */
export function gunnerActiveHolders(
  actions: {
    actionType: string;
    dayNumber: number;
    targetPlayerId?: string | null;
    metadata?: string | null;
  }[],
) {
  const holders = new Map<string, { bulletType: GunnerBullet; day: number }>();
  for (const action of actions) {
    if (action.actionType === "gunner" && action.targetPlayerId) {
      holders.set(action.targetPlayerId, { bulletType: gunnerBulletType(action) ?? "fake", day: action.dayNumber });
      continue;
    }
    if (action.actionType === "gunnerShot") {
      try {
        const meta = JSON.parse(action.metadata || "{}") as { holderId?: string };
        if (meta.holderId) holders.delete(meta.holderId);
      } catch {
        // ignore
      }
    }
  }
  return holders;
}

const NIGHT_PHASES = new Set(["night", "intro_night", "night_resolution"]);
const NIGHT_IMMUNE = new Set(["jack", "nostradamus"]);
const MAFIA_MAIN = ["mafiaShot", "sixthSense", "saul"] as const;
export const NIGHT_REPLACEABLE = [
  ...MAFIA_MAIN,
  "lecter",
  "matador",
  "watson",
  "leon",
  "kane",
  "detective",
  "constantine",
  "gunner",
  "zodiac",
  "handcuffs",
] as const;

export type NightPickAction = {
  actionType: string;
  dayNumber: number;
  phase?: string | null;
  targetPlayerId?: string | null;
  metadata?: string | null;
};

export type NightPlayer = {
  id: string;
  roleKey: string;
  faction: string;
  alive?: boolean;
};

export const NIGHT_ACTION_ROLE: Record<string, string> = {
  sixthSense: "godfather",
  saul: "saul",
  lecter: "lecter",
  matador: "matador",
  watson: "watson",
  leon: "leon",
  kane: "kane",
  detective: "detective",
  constantine: "constantine",
  gunner: "gunner",
  zodiac: "zodiac",
};

export function livingHolds(
  players: { roleKey: string; alive?: boolean }[],
  roleKey: string,
) {
  return players.some((player) => player.roleKey === roleKey && player.alive !== false);
}

export function mafiaLostAMember(players: { faction: string; alive?: boolean }[]) {
  return players.some((player) => player.faction === "mafia" && player.alive === false);
}

function dropDeadRolePicks(picks: Map<string, string>, players: NightPlayer[]) {
  const dropped: string[] = [];
  for (const actionType of [...picks.keys()]) {
    const role = NIGHT_ACTION_ROLE[actionType];
    if (!role || livingHolds(players, role)) continue;
    picks.delete(actionType);
    dropped.push(actionType);
  }
  return dropped;
}

export function tonightPicks(actions: NightPickAction[], dayNumber: number) {
  const picks = new Map<string, string>();
  for (const action of actions) {
    if (action.dayNumber !== dayNumber) continue;
    if (action.phase && !NIGHT_PHASES.has(action.phase)) continue;
    if (!action.targetPlayerId) continue;
    picks.set(action.actionType, action.targetPlayerId);
  }
  return picks;
}

export function tonightTarget(actions: NightPickAction[], dayNumber: number, actionType: string) {
  return tonightPicks(actions, dayNumber).get(actionType) ?? null;
}

/** Last Handcuffs pick for that day (drawn on the day, applies to that day's night). */
export function handcuffsTarget(actions: NightPickAction[], dayNumber: number) {
  let found: string | null = null;
  for (const action of actions) {
    if (action.dayNumber !== dayNumber || action.actionType !== "handcuffs") continue;
    if (!action.targetPlayerId) continue;
    found = action.targetPlayerId;
  }
  return found;
}

export type NightDisable = {
  id: string;
  roleKey: string;
  source: "matador" | "handcuffs";
};

export function nightActionTypesForRole(roleKey: string | null | undefined) {
  if (!roleKey) return [] as string[];
  const types = Object.entries(NIGHT_ACTION_ROLE)
    .filter(([, role]) => role === roleKey)
    .map(([type]) => type);
  if (roleKey === "godfather") types.push("mafiaShot");
  if (roleKey === "jack") types.push("jack");
  return types;
}

/** Players who cannot use a night ability tonight: Handcuffs and/or Matador. Cuffing Matador cancels Matador's block. */
export function nightDisables(
  actions: NightPickAction[],
  players: NightPlayer[],
  nightNumber: number,
): NightDisable[] {
  const byId = new Map(players.map((player) => [player.id, player]));
  const disables: NightDisable[] = [];
  const cuffId = handcuffsTarget(actions, nightNumber);
  const cuffed = cuffId ? byId.get(cuffId) : undefined;
  if (cuffed) {
    disables.push({ id: cuffed.id, roleKey: cuffed.roleKey, source: "handcuffs" });
  }
  const matadorApplies = cuffed?.roleKey !== "matador" && livingHolds(players, "matador");
  const blockedId = matadorApplies ? tonightTarget(actions, nightNumber, "matador") : null;
  const blocked = blockedId ? byId.get(blockedId) : undefined;
  if (blocked && blocked.id !== cuffed?.id) {
    disables.push({ id: blocked.id, roleKey: blocked.roleKey, source: "matador" });
  }
  return disables;
}

export function roleDisabledOnNight(
  actions: NightPickAction[],
  players: NightPlayer[],
  nightNumber: number,
  roleKey: string,
) {
  return nightDisables(actions, players, nightNumber).find((item) => item.roleKey === roleKey);
}

export function tonightAction(actions: NightPickAction[], dayNumber: number, actionType: string) {
  let found: NightPickAction | null = null;
  for (const action of actions) {
    if (action.dayNumber !== dayNumber) continue;
    if (action.phase && !NIGHT_PHASES.has(action.phase)) continue;
    if (action.actionType !== actionType) continue;
    found = action;
  }
  return found;
}

export function sixthSenseGuess(action?: NightPickAction | null): "correct" | "wrong" | null {
  if (!action?.metadata) return null;
  try {
    const meta = JSON.parse(action.metadata) as { result?: string };
    if (meta.result === "correct" || meta.result === "wrong") return meta.result;
  } catch {
    return null;
  }
  return null;
}

export function resolveNight(
  actions: NightPickAction[],
  players: NightPlayer[],
  nightNumber: number,
  zodiacRules: ZodiacRules = DEFAULT_ZODIAC_RULES,
) {
  if (nightNumber < 1) {
    return {
      leaveIds: [] as string[],
      returnIds: [] as string[],
      shieldBreakIds: [] as string[],
      notes: [] as string[],
      kaneMafiaMarkId: null as string | null,
      saulConvertId: null as string | null,
    };
  }

  const picks = tonightPicks(actions, nightNumber);
  const dropped = dropDeadRolePicks(picks, players);
  const byId = new Map(players.map((player) => [player.id, player]));
  const disables = nightDisables(actions, players, nightNumber);
  const disabledRoles = new Set(disables.map((item) => item.roleKey));
  const disableOf = (role: string) => disables.find((item) => item.roleKey === role);
  const ability = (role: string, key: string) => (disabledRoles.has(role) ? undefined : picks.get(key));

  const watsonPick = picks.get("watson");
  const watsonSave = ability("watson", "watson");
  const lecterSave = ability("lecter", "lecter");
  const leonTargetId = ability("leon", "leon");
  const constantineId = ability("constantine", "constantine");
  const mafiaShotPick = picks.get("mafiaShot");
  const sixthPick = picks.get("sixthSense");
  const mafiaShotId = disabledRoles.has("godfather") ? undefined : mafiaShotPick;
  const sixthId = disabledRoles.has("godfather") ? undefined : sixthPick;

  const leave = new Set<string>();
  const shieldBreakIds: string[] = [];
  const notes: string[] = [];
  const immune = (player: NightPlayer) =>
    NIGHT_IMMUNE.has(player.roleKey) ||
    (player.roleKey === "zodiac" && zodiacRules.mortality === "immortal");
  const nightShieldUp = (player: NightPlayer) => {
    const carries =
      player.roleKey === "leon" ||
      player.roleKey === "godfather" ||
      (player.roleKey === "zodiac" && zodiacRules.mortality === "one_shield");
    if (!carries || shieldBreakIds.includes(player.id)) return false;
    return hasShield(actions, player.id, nightNumber);
  };
  const droppedNote: Record<string, string> = {
    sixthSense: "Godfather is out. Sixth sense does not apply.",
    saul: "Saul is out. Purchase does not apply.",
    lecter: "Lecter is out. That save does not apply.",
    matador: "Matador is out. That block does not apply.",
    watson: "Watson is out. That save does not apply.",
    leon: "Leon is out. That shot does not apply.",
    kane: "Kane is out. That coupon does not apply.",
    constantine: "Constantine is out. Nobody returns.",
    zodiac: "Zodiac is out. That shot does not apply.",
  };
  for (const actionType of dropped) {
    const note = droppedNote[actionType];
    if (note) notes.push(note);
  }

  const pushDisableNote = (
    roleKey: string,
    hadPick: boolean,
    matadorNote: string,
    handcuffsNote: string,
  ) => {
    if (!hadPick) return;
    const hit = disableOf(roleKey);
    if (!hit) return;
    notes.push(hit.source === "handcuffs" ? handcuffsNote : matadorNote);
  };
  pushDisableNote(
    "watson",
    Boolean(watsonPick),
    "Matador blocked Watson. That save does not apply.",
    "Handcuffs disabled Watson. That save does not apply.",
  );
  pushDisableNote(
    "leon",
    Boolean(picks.get("leon")),
    "Matador blocked Leon. That shot does not apply.",
    "Handcuffs disabled Leon. That shot does not apply.",
  );
  pushDisableNote(
    "lecter",
    Boolean(picks.get("lecter")),
    "Matador blocked Lecter. That save does not apply.",
    "Handcuffs disabled Lecter. That save does not apply.",
  );
  pushDisableNote(
    "kane",
    Boolean(picks.get("kane")),
    "Matador blocked Kane. That coupon does not apply.",
    "Handcuffs disabled Kane. That coupon does not apply.",
  );
  pushDisableNote(
    "constantine",
    Boolean(picks.get("constantine")),
    "Matador blocked Constantine. Nobody returns.",
    "Handcuffs disabled Constantine. Nobody returns.",
  );
  pushDisableNote(
    "godfather",
    Boolean(mafiaShotPick || sixthPick),
    "Matador blocked the Godfather. The mafia main action does not apply.",
    "Handcuffs disabled the Godfather. The mafia main action does not apply.",
  );
  pushDisableNote(
    "saul",
    Boolean(picks.get("saul")),
    "Matador blocked Saul. That purchase does not apply.",
    "Handcuffs disabled Saul. That purchase does not apply.",
  );
  pushDisableNote(
    "zodiac",
    Boolean(picks.get("zodiac")),
    "Matador blocked Zodiac. That shot does not apply.",
    "Handcuffs disabled Zodiac. That shot does not apply.",
  );
  pushDisableNote(
    "matador",
    Boolean(picks.get("matador")),
    "Matador blocked Matador. That block does not apply.",
    "Handcuffs disabled Matador. That block does not apply.",
  );
  for (const hit of disables) {
    const mentioned =
      hit.source === "handcuffs"
        ? notes.some((note) => /handcuffs disabled/i.test(note))
        : notes.some((note) => /matador blocked|matador disabled/i.test(note));
    if (!mentioned) {
      notes.push(
        hit.source === "handcuffs"
          ? "Handcuffs disabled that player. They cannot act tonight."
          : "Matador disabled that player. They cannot act tonight.",
      );
    }
  }

  if (mafiaShotId) {
    const target = byId.get(mafiaShotId);
    if (target) {
      if (immune(target)) {
        notes.push("Night-immune. The mafia shot does nothing.");
      } else if (watsonSave === target.id) {
        notes.push("Watson saved the mafia-shot target. They stay.");
      } else if (nightShieldUp(target)) {
        shieldBreakIds.push(target.id);
        notes.push(
          target.roleKey === "leon"
            ? "Leon’s vest absorbed the mafia shot. They stay."
            : target.roleKey === "zodiac"
              ? "Zodiac’s shield absorbed the mafia shot. They stay."
              : "Shield broken. That player stays.",
        );
      } else {
        leave.add(target.id);
        notes.push("Mafia shot stands. That player leaves.");
      }
    }
  }

  if (sixthId) {
    const target = byId.get(sixthId);
    const guess = sixthSenseGuess(tonightAction(actions, nightNumber, "sixthSense"));
    if (target && guess === "correct") {
      leave.add(target.id);
      notes.push("Sixth sense confirmed. That player leaves.");
    } else if (target && guess === "wrong") {
      notes.push("Sixth sense was a wrong guess. That player stays.");
    } else if (target) {
      notes.push("Sixth sense recorded. Mark Correct or Wrong.");
    }
  }

  const saulTargetId = ability("saul", "saul");
  let saulConvertId: string | null = null;
  if (saulTargetId) {
    const target = byId.get(saulTargetId);
    const alreadyBought = Boolean(
      target &&
        actions.some(
          (action) =>
            action.actionType === "saulConvert" &&
            action.dayNumber === nightNumber &&
            action.targetPlayerId === target.id,
        ),
    );
    if (!mafiaLostAMember(players)) {
      notes.push("Saul’s purchase is not available until Mafia has lost a member.");
    } else if (target && (target.roleKey === "villager" || alreadyBought)) {
      saulConvertId = target.id;
      byId.set(target.id, { ...target, roleKey: "mafioso", faction: "mafia" });
      notes.push("Saul’s purchase succeeded. That player is Simple Mafia from tonight on.");
    } else if (target) {
      notes.push("Saul’s purchase failed. That player already has a role.");
    }
  }

  const leon = players.find((player) => player.roleKey === "leon");
  if (leonTargetId && leon) {
    const target = byId.get(leonTargetId);
    if (target) {
      if (immune(target)) {
        notes.push("Night-immune. Leon’s shot does nothing.");
      } else if (nightShieldUp(target)) {
        shieldBreakIds.push(target.id);
        notes.push(
          target.roleKey === "zodiac"
            ? "Zodiac’s shield absorbed Leon’s shot. They stay."
            : "Shield broken. That player stays.",
        );
      } else if (target.faction === "citizen") {
        leave.add(leon.id);
        notes.push("Citizen hit. Leon is out. The citizen stays.");
      } else if (target.faction === "mafia") {
        if (lecterSave === target.id) {
          notes.push("Lecter saved the Leon target. They stay.");
        } else {
          leave.add(target.id);
          notes.push("Leon’s shot stands. That player leaves.");
        }
      } else {
        leave.add(target.id);
        notes.push("Leon’s shot stands. That player leaves.");
      }
    }
  }

  const kanePlayer = players.find((player) => player.roleKey === "kane");
  const kaneTargetId = ability("kane", "kane");
  let kaneMafiaMarkId: string | null = null;
  if (kaneTargetId && kanePlayer) {
    const target = byId.get(kaneTargetId);
    if (target?.faction === "mafia") {
      kaneMafiaMarkId = target.id;
      notes.push("Kane coupon used on Mafia. Kane leaves the following night.");
    } else if (target) {
      notes.push("Kane coupon used. Target is not Mafia. Nothing happens.");
    }
  }

  if (nightNumber >= 2 && kanePlayer && kanePlayer.alive !== false) {
    const prev = tonightPicks(actions, nightNumber - 1);
    const prevKaneTargetId = roleDisabledOnNight(actions, players, nightNumber - 1, "kane")
      ? undefined
      : prev.get("kane");
    if (prevKaneTargetId) {
      const marked = byId.get(prevKaneTargetId);
      if (marked?.faction === "mafia") {
        leave.add(kanePlayer.id);
        notes.push("Kane sat with Mafia last night. Kane leaves.");
      }
    }
  }

  const zodiacPlayer = players.find((player) => player.roleKey === "zodiac");
  const zodiacTargetId = ability("zodiac", "zodiac");
  if (zodiacTargetId && zodiacPlayer && zodiacPlayer.alive !== false) {
    const target = byId.get(zodiacTargetId);
    if (target) {
      if (zodiacRules.cursedRole && target.roleKey === zodiacRules.cursedRole) {
        leave.add(zodiacPlayer.id);
        notes.push("Zodiac misfired on the cursed role. The shot fails and Zodiac leaves instead.");
      } else if (!leave.has(target.id) && nightShieldUp(target)) {
        shieldBreakIds.push(target.id);
        notes.push("Zodiac’s shot hit the shield. That player stays.");
      } else {
        leave.add(target.id);
        notes.push("Zodiac’s shot stands. That player leaves.");
      }
    }
  }

  const curse = activeJackCurse(actions);
  if (curse && leave.has(curse.playerId)) {
    const jackPlayer = players.find((player) => player.roleKey === "jack");
    if (jackPlayer && jackPlayer.alive !== false && jackPlayer.id !== curse.playerId) {
      leave.add(jackPlayer.id);
      notes.push("The curse victim leaves, so Jack leaves too.");
    }
  }

  const returnIds = constantineId ? [constantineId] : [];
  if (constantineId) notes.push("Constantine returns a player.");
  if (leave.size === 0 && returnIds.length === 0 && notes.length === 0) {
    notes.push("Nobody leaves or returns. No kill or revive was recorded.");
  }
  return {
    leaveIds: [...leave],
    returnIds,
    shieldBreakIds: [...new Set(shieldBreakIds)],
    notes,
    kaneMafiaMarkId,
    saulConvertId,
  };
}

function actionAppliedViaNight(metadata?: string | null) {
  if (!metadata) return false;
  try {
    return (JSON.parse(metadata) as { via?: string }).via === "night";
  } catch {
    return false;
  }
}

/**
 * What was actually committed to the game (eliminations/revives) when a given night was
 * resolved, read straight from the persisted action log. Unlike re-running `resolveNight`,
 * this stays correct even after the affected players' `alive` status has since changed
 * (e.g. Kane's delayed leave, or Jack's curse chain), because it does not depend on any
 * "is this role-holder still alive today" guard.
 */
export function appliedNightOutcome(
  actions: { actionType: string; dayNumber: number; targetPlayerId?: string | null; metadata?: string | null }[],
  nightNumber: number,
) {
  const leaveIds: string[] = [];
  const returnIds: string[] = [];
  for (const action of actions) {
    if (action.dayNumber !== nightNumber || !actionAppliedViaNight(action.metadata)) continue;
    if ((action.actionType === "eliminate" || action.actionType === "jackOut") && action.targetPlayerId) {
      leaveIds.push(action.targetPlayerId);
    } else if (action.actionType === "revive" && action.targetPlayerId) {
      returnIds.push(action.targetPlayerId);
    }
  }
  return { leaveIds, returnIds };
}

export function lastNightReport(
  actions: NightPickAction[],
  dayNumber: number,
  players: NightPlayer[],
  zodiacRules: ZodiacRules = DEFAULT_ZODIAC_RULES,
) {
  const result = resolveNight(actions, players, dayNumber - 1, zodiacRules);
  const applied = appliedNightOutcome(actions, dayNumber - 1);
  return {
    leaveIds: applied.leaveIds,
    returnIds: applied.returnIds,
    kaneMafiaMarkId: result.kaneMafiaMarkId,
  };
}

export function hasShield(
  actions: { actionType: string; dayNumber?: number; targetPlayerId?: string | null }[],
  playerId: string,
  nightNumber?: number,
) {
  return !actions.some((action) => {
    if (action.actionType !== "shieldBreak" || action.targetPlayerId !== playerId) return false;
    if (nightNumber != null && action.dayNumber === nightNumber) return false;
    return true;
  });
}

export function watsonSelfSaved(
  actions: { actionType: string; targetPlayerId?: string | null }[],
  watsonId: string,
) {
  return actions.some((action) => action.actionType === "watson" && action.targetPlayerId === watsonId);
}

export function lecterSelfSaved(
  actions: { actionType: string; targetPlayerId?: string | null }[],
  lecterId: string,
) {
  return actions.some((action) => action.actionType === "lecter" && action.targetPlayerId === lecterId);
}

export function mafiaMainTonight(
  actions: { actionType: string; dayNumber: number }[],
  dayNumber: number,
) {
  return actions.find(
    (action) =>
      action.dayNumber === dayNumber &&
      (action.actionType === "mafiaShot" || action.actionType === "sixthSense" || action.actionType === "saul"),
  );
}
