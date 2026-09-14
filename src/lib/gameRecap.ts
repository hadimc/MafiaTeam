export type RecapPlayer = {
  id: string;
  userId: string;
  seatNumber: number;
  roleKey: string;
  roleName: string;
  roleNameEn: string;
  faction: string;
  alive: boolean;
  eliminationReason?: string | null;
  user: { displayName: string; displayNameEn: string };
};

export type RecapAction = {
  actionType: string;
  dayNumber: number;
  phase?: string | null;
  targetPlayerId?: string | null;
  messageEn?: string;
  message?: string;
};

export type PotgWhy = "indie_win" | "survived_win" | "named_win" | "winner" | "last_standing";

const NAMED = new Set(["villager", "mafioso"]);

function impact(player: RecapPlayer, actions: RecapAction[]) {
  return actions.filter((action) => {
    if (action.targetPlayerId === player.id) {
      return ["revive", "exit_card", "shieldBreak", "saulConvert"].includes(action.actionType);
    }
    return false;
  }).length;
}

export function pickPlayerOfTheGame(players: RecapPlayer[], winner: string | null, actions: RecapAction[] = []) {
  if (players.length === 0) return null;
  const ranked = [...players].sort((a, b) => {
    const as = score(a, winner, actions);
    const bs = score(b, winner, actions);
    if (bs !== as) return bs - as;
    return a.seatNumber - b.seatNumber;
  });
  const player = ranked[0];
  if (!player) return null;
  const won = Boolean(winner && player.faction === winner);
  let why: PotgWhy = "last_standing";
  if (won && player.faction === "independent") why = "indie_win";
  else if (won && player.alive) why = "survived_win";
  else if (won && !NAMED.has(player.roleKey)) why = "named_win";
  else if (won) why = "winner";
  return { player, why };
}

function score(player: RecapPlayer, winner: string | null, actions: RecapAction[]) {
  let value = 0;
  if (winner && player.faction === winner) value += 20;
  if (player.alive) value += 8;
  if (player.faction === "independent") value += 5;
  if (!NAMED.has(player.roleKey)) value += 3;
  value += impact(player, actions);
  return value;
}

export function recapTimeline(actions: RecapAction[]) {
  const rows: { day: number; kind: "left" | "returned"; playerId: string; via: string }[] = [];
  for (const action of actions) {
    if (!action.targetPlayerId) continue;
    if (action.actionType === "eliminate" || action.actionType === "jackOut") {
      rows.push({
        day: action.dayNumber,
        kind: "left",
        playerId: action.targetPlayerId,
        via: action.actionType === "jackOut" ? "curse" : action.phase?.includes("night") ? "night" : "day",
      });
    } else if (action.actionType === "revive") {
      rows.push({ day: action.dayNumber, kind: "returned", playerId: action.targetPlayerId, via: "constantine" });
    }
  }
  return rows;
}

export function recapViaKey(via: string) {
  if (via === "night") return "recapViaNight" as const;
  if (via === "day") return "recapViaDay" as const;
  if (via === "curse") return "recapViaCurse" as const;
  return "recapViaConstantine" as const;
}

export function potgWhyKey(why: PotgWhy) {
  if (why === "indie_win") return "potgIndieWin" as const;
  if (why === "survived_win") return "potgSurvivedWin" as const;
  if (why === "named_win") return "potgNamedWin" as const;
  if (why === "winner") return "potgWinner" as const;
  return "potgLastStanding" as const;
}

export function formatGameDuration(
  startedAt?: string | Date | null,
  finishedAt?: string | Date | null,
  lang: "fa" | "en" = "en",
) {
  if (!startedAt || !finishedAt) return null;
  const start = new Date(startedAt).getTime();
  const end = new Date(finishedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  const mins = Math.round((end - start) / 60000);
  const safe = Math.max(0, mins);
  if (lang === "fa") {
    if (safe < 60) return `${safe} دقیقه`;
    const hours = Math.floor(safe / 60);
    const rest = safe % 60;
    return rest ? `${hours} ساعت و ${rest} دقیقه` : `${hours} ساعت`;
  }
  if (safe < 60) return `${safe} min`;
  const hours = Math.floor(safe / 60);
  const rest = safe % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export function recapHighlights(actions: RecapAction[]) {
  const interesting = new Set([
    "inquiry",
    "mayorCoupon",
    "mayorVeto",
    "faceChange",
    "saulConvert",
    "shieldBreak",
    "exit_card",
    "gunnerShot",
  ]);
  return actions.filter((action) => interesting.has(action.actionType));
}
