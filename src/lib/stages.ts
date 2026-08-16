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
    notesEn: "From day 2. Announce, then mark leavers in Remove players.",
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
    nameEn: "Speaking",
    nameFa: "صحبت",
    summaryEn: "Each living player speaks in turn. Use the 1-minute timer.",
    notesEn: "From intro day.",
  },
  {
    key: "challenge",
    nameEn: "Challenge",
    nameFa: "چالش",
    summaryEn: "Optional interrupt during speaking. Use the 30-second timer.",
    notesEn: "From day 1. Optional. Max one challenge per person per day.",
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
    summaryEn: "Tap everyone who leaves this round — vote, shot, lottery, or last night.",
    notesEn: "Recording step.",
  },
];

const NIGHT_TASKS: StageTask[] = [
  {
    key: "faceChange",
    nameEn: "Face change",
    nameFa: "تغییر چهره",
    summaryEn: "An eliminated player may secretly swap their card with someone still seated.",
    notesEn: "Town↔town, town↔mafia, or mafia↔town. Jack’s curse stays on the person, not the card.",
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
    summaryEn: "Shot or sixth sense (Godfather), buy (Saul), save (Lecter), block (Matador).",
    notesEn: "From night 1. Night 0 is likes only.",
  },
  {
    key: "town",
    nameEn: "Town",
    nameFa: "عملیات شهر",
    summaryEn: "Save (Watson), shot (Leon), mark or inquiry (Kane / Detective), spirit (Constantine), give gun (Gunner).",
    notesEn: "From night 1. Night 0 is thumbs-up only.",
  },
];

const MAFIA_LIKE_ORDER = ["godfather", "saul", "lecter", "matador", "mafioso"];
const TOWN_LIKE_ORDER = ["watson", "leon", "kane", "detective", "constantine", "gunner"];

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
    if (task.key === "faceChange") return hasDead;
    if (task.key === "nostradamus") return stage.n === 0 && living.has("nostradamus");
    if (task.key === "jack") return dealt.has("jack");
    if (task.key === "mafia") {
      return MAFIA_LIKE_ORDER.some((key) => living.has(key));
    }
    if (task.key === "town") {
      return TOWN_LIKE_ORDER.some((key) => living.has(key));
    }
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

const NIGHT_KILL = new Set(["godfather", "leon"]);
const NIGHT_SAVE = new Set(["watson", "lecter"]);

export function lastNightReport(
  actions: { actionType: string; dayNumber: number; phase?: string | null; targetPlayerId?: string | null }[],
  dayNumber: number,
  players: { id: string; roleKey: string }[],
) {
  const nightDay = dayNumber - 1;
  const latest = new Map<string, string>();
  for (const action of actions) {
    if (action.dayNumber !== nightDay || !action.targetPlayerId) continue;
    if (action.phase && action.phase !== "night" && action.phase !== "intro_night" && action.phase !== "night_resolution") {
      continue;
    }
    latest.set(action.actionType, action.targetPlayerId);
  }
  const saved = new Set(
    [...latest.entries()].filter(([type]) => NIGHT_SAVE.has(type)).map(([, id]) => id),
  );
  const jackId = players.find((player) => player.roleKey === "jack")?.id;
  const leaveIds = [
    ...new Set(
      [...latest.entries()]
        .filter(([type]) => NIGHT_KILL.has(type))
        .map(([, id]) => id)
        .filter((id) => id !== jackId && !saved.has(id)),
    ),
  ];
  const returnIds = latest.get("constantine") ? [latest.get("constantine") as string] : [];
  return { leaveIds, returnIds };
}
