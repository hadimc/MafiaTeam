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
    summaryEn: "Last night’s report: who must leave, and who returns.",
    notesEn: "From day 2. Last night already updated the seats. Announce the result.",
  },
  {
    key: "inquiry",
    nameEn: "Inquiry",
    nameFa: "استعلام",
    summaryEn: "Report how many Town, Mafia, and Independent roles are out — and how many remain.",
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
    notesEn: "Day-vote exits.",
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
    notesEn: "Outside = eliminated. Inside = still seated. Jack’s curse stays on the person, not the card.",
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
    key: "mafia",
    nameEn: "Mafia",
    nameFa: "عملیات مافیا",
    summaryEn: "Say the full list. Main action is one of: shot, sixth sense, or purchase. Then Lecter save and Matador block.",
    notesEn: "Night 1+. Recite everything so the table hears no extra info. Tap again to correct a target. Nobody leaves until the night ends.",
  },
  {
    key: "town",
    nameEn: "Town",
    nameFa: "عملیات شهر",
    summaryEn: "Say the full town list. Record Watson’s save and Leon’s shot when they act.",
    notesEn: "Night 1+. Watson may self-save once. Tap a different name to correct a mistake. Removals wait until you go to the next day.",
  },
  {
    key: "nightEnd",
    nameEn: "Night result",
    nameFa: "نتیجه شب",
    summaryEn: "Nobody is removed until you tap Next. Check who would leave or return, then end the night.",
    notesEn: "Watson save beats the Mafia shot. Lecter save beats Leon. You can still go back into Mafia or Town and change a target.",
  },
];

const MAFIA_LIKE_ORDER = ["godfather", "saul", "lecter", "matador", "mafioso"];
const TOWN_LIKE_ORDER = ["watson", "leon", "kane", "detective", "constantine", "gunner", "villager"];

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

export function dayTasks(stage: Stage, roles: string[], mayorCouponDay: number | null = null) {
  const set = new Set(roles);
  return DAY_TASKS.filter((task) => {
    if (task.key === "nightBrief" || task.key === "inquiry") return stage.n >= 2;
    if (task.key === "speak") return true;
    if (task.key === "mayorVeto") {
      if (stage.n < 1 || !set.has("mayor")) return false;
      if (mayorCouponDay == null) return true;
      return mayorCouponDay === stage.n;
    }
    if (task.key === "dayShot") return stage.n >= 1 && set.has("gunner");
    if (task.key === "removePlayers") return stage.n >= 1;
    return stage.n >= 1;
  });
}

export function nightTasks(stage: Stage, livingRoles: string[], hasDead: boolean, dealtRoles: string[] = livingRoles) {
  const living = new Set(livingRoles);
  const dealt = new Set(dealtRoles);
  return NIGHT_TASKS.filter((task) => {
    if (task.key === "faceChange") return stage.n >= 1 && hasDead;
    if (task.key === "nostradamus") return stage.n === 0 && living.has("nostradamus");
    if (task.key === "jack") return dealt.has("jack");
    if (task.key === "mafia") {
      if (stage.n >= 1) return true;
      return MAFIA_LIKE_ORDER.some((key) => living.has(key));
    }
    if (task.key === "town") {
      if (stage.n >= 1) return true;
      return TOWN_LIKE_ORDER.some((key) => living.has(key));
    }
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
] as const;

export type NightPickAction = {
  actionType: string;
  dayNumber: number;
  phase?: string | null;
  targetPlayerId?: string | null;
};

export type NightPlayer = {
  id: string;
  roleKey: string;
  faction: string;
  alive?: boolean;
};

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

export function resolveNight(
  actions: NightPickAction[],
  players: NightPlayer[],
  nightNumber: number,
) {
  if (nightNumber < 1) {
    return { leaveIds: [] as string[], returnIds: [] as string[], shieldBreakIds: [] as string[], notes: [] as string[] };
  }

  const picks = tonightPicks(actions, nightNumber);
  const byId = new Map(players.map((player) => [player.id, player]));
  const blockedId = picks.get("matador");
  const blockedRole = blockedId ? byId.get(blockedId)?.roleKey ?? null : null;
  const ability = (role: string, key: string) => (blockedRole === role ? undefined : picks.get(key));

  const watsonSave = ability("watson", "watson");
  const lecterSave = ability("lecter", "lecter");
  const leonTargetId = ability("leon", "leon");
  const constantineId = ability("constantine", "constantine");
  const mafiaShotId = blockedRole === "godfather" ? undefined : picks.get("mafiaShot");
  const sixthId = blockedRole === "godfather" ? undefined : picks.get("sixthSense");

  const leave = new Set<string>();
  const shieldBreakIds: string[] = [];
  const notes: string[] = [];
  const immune = (player: NightPlayer) => NIGHT_IMMUNE.has(player.roleKey);

  if (mafiaShotId) {
    const target = byId.get(mafiaShotId);
    if (target) {
      if (immune(target)) {
        notes.push("Night-immune. The mafia shot does nothing.");
      } else if (watsonSave === target.id) {
        notes.push("Watson saved the mafia-shot target.");
      } else if (target.roleKey === "leon" && hasShield(actions, target.id, nightNumber)) {
        shieldBreakIds.push(target.id);
        notes.push("Leon’s vest absorbed the mafia shot.");
      } else {
        leave.add(target.id);
      }
    }
  }

  if (sixthId) {
    const target = byId.get(sixthId);
    if (target && target.faction === "independent" && !immune(target)) {
      leave.add(target.id);
    }
  }

  const leon = players.find((player) => player.roleKey === "leon");
  if (leonTargetId && leon) {
    const target = byId.get(leonTargetId);
    if (target) {
      if (immune(target)) {
        notes.push("Night-immune. Leon’s shot does nothing.");
      } else if (target.faction === "citizen") {
        leave.add(leon.id);
        notes.push("Citizen hit. Leon is out.");
      } else if (
        (target.roleKey === "godfather" || target.roleKey === "zodiac") &&
        hasShield(actions, target.id, nightNumber)
      ) {
        shieldBreakIds.push(target.id);
        notes.push("Shield broken.");
      } else if (target.faction === "mafia" || target.roleKey === "zodiac") {
        if (lecterSave === target.id) {
          notes.push("Lecter saved the Leon target.");
        } else {
          leave.add(target.id);
        }
      }
    }
  }

  const curse = activeJackCurse(actions);
  if (curse && leave.has(curse.playerId)) {
    const jackPlayer = players.find((player) => player.roleKey === "jack");
    if (jackPlayer && jackPlayer.id !== curse.playerId) leave.add(jackPlayer.id);
  }

  const returnIds = constantineId ? [constantineId] : [];
  return {
    leaveIds: [...leave],
    returnIds,
    shieldBreakIds: [...new Set(shieldBreakIds)],
    notes,
  };
}

export function lastNightReport(
  actions: NightPickAction[],
  dayNumber: number,
  players: NightPlayer[],
) {
  const result = resolveNight(actions, players, dayNumber - 1);
  return { leaveIds: result.leaveIds, returnIds: result.returnIds };
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
