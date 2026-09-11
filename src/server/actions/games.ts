"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  assignRoles,
  canTransition,
  parseConfig,
  type Faction,
  type Phase,
  type RoleDef,
} from "@/engine";
import { CATALOG_BY_KEY, nightStepLabel } from "@/lib/catalog";
import { getGameForNarrator, isNarrator, readSnapshot, snapshotFromScenario } from "@/lib/queries";
import {
  activeJackCurse,
  gunnerActiveHolders,
  gunnerAmmo,
  jackCurseRound,
  lecterSelfSaved,
  livingHolds,
  mafiaLostAMember,
  NIGHT_ACTION_ROLE,
  NIGHT_REPLACEABLE,
  resolveNight,
  stageFromGame,
  tonightTarget,
} from "@/lib/stages";

async function narratorGame(gameId: string) {
  const user = await requireUser();
  const game = await getGameForNarrator(gameId, user);
  if (!game) throw new Error("forbidden");
  return { user, game };
}

function revalidateGame(gameId: string, slug: string) {
  revalidatePath(`/games/${gameId}/narrator`);
  revalidatePath(`/games/${gameId}/narrator/day`);
  revalidatePath(`/games/${gameId}/narrator/night`);
  revalidatePath(`/games/${gameId}/narrator/history`);
  revalidatePath(`/games/${gameId}/role`);
  revalidatePath(`/events/${slug}`);
  revalidatePath(`/events/${slug}/players`);
  revalidatePath("/dashboard");
  revalidatePath("/past");
  revalidatePath("/admin/events");
}

export async function dealRolesAction(eventId: string) {
  const user = await requireUser();
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      scenario: { include: { roles: true, exitCards: true } },
      registrations: true,
      narrators: true,
      games: true,
    },
  });
  if (!event || !isNarrator(user, event)) return { error: "forbidden" };
  if (event.narrators.length < 1 || !event.scenario) return { error: "incomplete" };
  if (event.status !== "scenario_finalized") {
    return { error: "not_final" };
  }

  const narratorSet = new Set(event.narrators.map((n) => n.userId));
  const playerRegs = event.registrations.filter((r) => !narratorSet.has(r.userId));
  const roles: RoleDef[] = event.scenario.roles.map((role) => ({
    key: role.key,
    name: role.name,
    nameEn: role.nameEn,
    faction: role.faction as Faction,
    description: role.description,
    descriptionEn: role.descriptionEn,
    quantity: role.quantity,
    nightOrder: role.nightOrder,
  }));
  const poolCount = roles.reduce((sum, role) => sum + role.quantity, 0);
  if (playerRegs.length !== poolCount) {
    return { error: "count", expected: poolCount, actual: playerRegs.length };
  }

  const dealt = assignRoles(
    playerRegs.map((r) => r.userId),
    roles,
  );
  const snapshot = snapshotFromScenario(event.scenario);

  const game = await prisma.$transaction(async (tx) => {
    await tx.game.deleteMany({ where: { eventId: event.id } });
    return tx.game.create({
      data: {
        eventId: event.id,
        scenarioSnapshot: JSON.stringify(snapshot),
        status: "ready",
        currentPhase: "lobby",
        currentDay: 0,
        players: {
          create: dealt.map((row) => ({
            userId: row.userId,
            seatNumber: row.seatNumber,
            roleKey: row.role.key,
            roleName: row.role.name,
            roleNameEn: row.role.nameEn,
            faction: row.role.faction,
            roleDescription: row.role.description,
            roleDescriptionEn: row.role.descriptionEn,
          })),
        },
        actions: {
          create: {
            dayNumber: 0,
            phase: "lobby",
            actorUserId: user.id,
            actionType: "deal",
            message: "نقش‌ها توزیع شد",
            messageEn: "Roles were dealt",
          },
        },
      },
    });
  });

  await prisma.event.update({
    where: { id: event.id },
    data: { status: "roles_assigned" },
  });
  revalidateGame(game.id, event.slug);
  return { gameId: game.id };
}

export async function startGameAction(gameId: string) {
  const { user, game } = await narratorGame(gameId);
  if (game.currentPhase !== "lobby" && game.status === "in_progress") return;
  await prisma.game.update({
    where: { id: gameId },
    data: {
      status: "in_progress",
      currentPhase: game.currentPhase === "lobby" ? "intro_day" : game.currentPhase,
      currentDay: game.currentPhase === "lobby" ? 0 : game.currentDay,
      startedAt: game.startedAt ?? new Date(),
    },
  });
  await prisma.event.update({ where: { id: game.eventId }, data: { status: "in_progress" } });
  if (game.currentPhase === "lobby") {
    await log(gameId, 0, "intro_day", user.id, "start", "بازی شروع شد", "Game started");
  }
  revalidateGame(gameId, game.event.slug);
}

export async function setStageAction(
  gameId: string,
  data: { currentDay: number; currentPhase: string; nightStep: number; speakerIndex?: number },
) {
  const { user, game } = await narratorGame(gameId);
  if (game.currentPhase === "lobby") {
    await startGameAction(gameId);
  }
  const from = stageFromGame(game);
  const to = stageFromGame({ ...game, ...data });
  let jackOut: { jackName: string; cursedName: string } | undefined;

  if (from.kind === "night" && from.n >= 1 && to.kind === "day" && to.n === from.n + 1) {
    jackOut = await applyNightResolution(gameId, from.n);
  }
  if (from.kind === "day" && to.kind === "night" && to.n >= 1 && to.n === from.n - 1) {
    await undoNightResolution(gameId, to.n);
  }

  await prisma.game.update({
    where: { id: gameId },
    data: {
      status: "in_progress",
      currentDay: data.currentDay,
      currentPhase: data.currentPhase,
      nightStep: data.nightStep,
      speakerIndex: data.speakerIndex ?? 0,
    },
  });
  await log(
    gameId,
    data.currentDay,
    data.currentPhase,
    user.id,
    "stage",
    `مرحله: ${data.currentPhase} ${data.currentDay}`,
    `Stage: ${data.currentPhase} ${data.currentDay}`,
  );
  revalidateGame(gameId, game.event.slug);
  return jackOut ? { jackOut } : {};
}

function viaNight(metadata?: string | null) {
  if (!metadata) return false;
  try {
    return JSON.parse(metadata).via === "night";
  } catch {
    return false;
  }
}

async function restoreSaulConvert(action: { targetPlayerId?: string | null; metadata?: string | null }) {
  if (!action.targetPlayerId) return;
  try {
    const meta = JSON.parse(action.metadata || "{}") as { prevRole?: RoleCard };
    if (meta.prevRole) {
      await prisma.gamePlayer.update({ where: { id: action.targetPlayerId }, data: meta.prevRole });
    }
  } catch {
    // ignore malformed metadata; nothing to revert
  }
}

async function reverseTonightTypes(gameId: string, dayNumber: number, types: string[]) {
  if (!types.length) return;
  if (types.includes("saul")) {
    const { game } = await narratorGame(gameId);
    for (const action of game.actions) {
      if (action.dayNumber !== dayNumber || action.actionType !== "saulConvert" || !viaNight(action.metadata)) continue;
      await prisma.gameAction.update({ where: { id: action.id }, data: { reversed: true } });
      await restoreSaulConvert(action);
    }
  }
  await prisma.gameAction.updateMany({
    where: { gameId, dayNumber, actionType: { in: types }, reversed: false },
    data: { reversed: true },
  });
}

async function undoNightResolution(gameId: string, nightNumber: number) {
  const { game } = await narratorGame(gameId);
  const via = game.actions.filter((action) => action.dayNumber === nightNumber && viaNight(action.metadata));
  for (const action of via) {
    await prisma.gameAction.update({ where: { id: action.id }, data: { reversed: true } });
    if ((action.actionType === "eliminate" || action.actionType === "jackOut") && action.targetPlayerId) {
      await prisma.gamePlayer.update({
        where: { id: action.targetPlayerId },
        data: { alive: true, eliminatedAt: null, eliminationReason: null },
      });
    }
    if (action.actionType === "revive" && action.targetPlayerId) {
      await prisma.gamePlayer.update({
        where: { id: action.targetPlayerId },
        data: { alive: false, eliminatedAt: new Date(), eliminationReason: "night_undo" },
      });
    }
    if (action.actionType === "saulConvert" && action.targetPlayerId) {
      await restoreSaulConvert(action);
    }
  }
}

async function applyNightResolution(gameId: string, nightNumber: number) {
  await undoNightResolution(gameId, nightNumber);
  const { user, game } = await narratorGame(gameId);
  const result = resolveNight(game.actions, game.players, nightNumber);
  const meta = JSON.stringify({ via: "night" });
  let jackOut: { jackName: string; cursedName: string } | undefined;

  if (result.saulConvertId) {
    await convertToMafiaAction(gameId, result.saulConvertId, meta);
  }

  for (const playerId of result.shieldBreakIds) {
    const player = game.players.find((item) => item.id === playerId);
    const name = player ? player.user.displayNameEn || player.user.displayName : playerId;
    await log(
      gameId,
      nightNumber,
      "night_resolution",
      user.id,
      "shieldBreak",
      `جلیقه: ${name}`,
      `Shield broken: ${name}`,
      playerId,
      meta,
    );
  }

  for (const playerId of result.leaveIds) {
    const killed = await eliminatePlayerAction(gameId, playerId, "night", meta);
    if (killed && "jackOut" in killed && killed.jackOut) jackOut = killed.jackOut;
  }

  for (const playerId of result.returnIds) {
    await revivePlayerAction(gameId, playerId, meta);
  }

  if (result.leaveIds.length || result.returnIds.length || result.shieldBreakIds.length || result.notes.length) {
    await log(
      gameId,
      nightNumber,
      "night_resolution",
      user.id,
      "nightResolved",
      result.notes.join(" ") || "Night resolved",
      result.notes.join(" ") || "Night resolved",
      undefined,
      meta,
    );
  }

  return jackOut;
}

export async function recordJackCurseAction(gameId: string, targetPlayerId: string) {
  const { user, game } = await narratorGame(gameId);
  const jack = game.players.find((player) => player.roleKey === "jack" && player.alive);
  const target = game.players.find((player) => player.id === targetPlayerId);
  if (!jack) return { error: "no_jack" };
  if (!target || !target.alive) return { error: "not_found" };
  if (target.id === jack.id) return { error: "self" };
  const shown = game.actions.some(
    (action) => action.actionType === "shown" && action.targetPlayerId === jack.id,
  );
  if (shown) return { error: "frozen" };
  if (tonightTarget(game.actions, game.currentDay, "matador") === jack.id) return { error: "blocked" };

  const round = jackCurseRound(
    game.actions,
    game.players.filter((player) => player.alive),
    game.currentDay,
  );
  if (!round.eligibleIds.includes(targetPlayerId)) return { error: "repeat" };

  await prisma.gameAction.updateMany({
    where: { gameId, dayNumber: game.currentDay, actionType: "jack", reversed: false },
    data: { reversed: true },
  });

  const targetName = target.user.displayNameEn || target.user.displayName;
  await log(
    gameId,
    game.currentDay,
    game.currentPhase,
    user.id,
    "jack",
    `طلسم جک: ${target.user.displayName}`,
    `Jack curse → ${targetName}`,
    targetPlayerId,
  );
  revalidateGame(gameId, game.event.slug);
}

export async function recordStageAction(
  gameId: string,
  actionType: string,
  messageEn: string,
  targetPlayerId?: string,
  metadata?: string,
) {
  const { user, game } = await narratorGame(gameId);
  const requiredRole = NIGHT_ACTION_ROLE[actionType];
  if (requiredRole && !livingHolds(game.players, requiredRole)) return { error: "role_out" };
  if (
    (actionType === "mafiaShot" || actionType === "sixthSense" || actionType === "saul") &&
    !game.players.some((player) => player.faction === "mafia" && player.alive)
  ) {
    return { error: "role_out" };
  }
  if (actionType !== "matador") {
    const blockedId = tonightTarget(game.actions, game.currentDay, "matador");
    const blocked = game.players.find((player) => player.id === blockedId);
    if (blocked && requiredRole === blocked.roleKey) return { error: "blocked" };
    if (blocked?.roleKey === "godfather" && (actionType === "mafiaShot" || actionType === "sixthSense")) {
      return { error: "blocked" };
    }
  }
  const otherNights = (type: string) =>
    game.actions.filter((action) => action.actionType === type && action.dayNumber !== game.currentDay);

  const watson = game.players.find((player) => player.roleKey === "watson");
  if (actionType === "watson" && watson && targetPlayerId === watson.id) {
    if (otherNights("watson").some((action) => action.targetPlayerId === watson.id)) return { error: "self_save" };
  }
  const lecter = game.players.find((player) => player.roleKey === "lecter");
  if (actionType === "lecter" && lecter && targetPlayerId === lecter.id) {
    if (lecterSelfSaved(otherNights("lecter"), lecter.id)) return { error: "self_save" };
  }
  if (actionType === "kane" && otherNights("kane").length) return { error: "used" };
  if (actionType === "constantine" && otherNights("constantine").length) return { error: "used" };
  if (actionType === "saul" && otherNights("saul").length) return { error: "used" };
  if (actionType === "saul" && !mafiaLostAMember(game.players)) return { error: "no_mafia_loss" };
  if (actionType === "leon") {
    const nights = new Set(otherNights("leon").map((action) => action.dayNumber));
    if (nights.size >= 2) return { error: "spent" };
  }
  if ((actionType === "matador" || actionType === "saul") && targetPlayerId) {
    const target = game.players.find((player) => player.id === targetPlayerId);
    if (target && target.faction === "mafia") return { error: "mafia" };
  }
  if (actionType === "zodiac" && targetPlayerId) {
    if (game.currentDay < 2 || game.currentDay % 2 !== 0) return { error: "not_zodiac_night" };
    const zodiac = game.players.find((player) => player.roleKey === "zodiac");
    if (zodiac && targetPlayerId === zodiac.id) return { error: "self" };
  }
  if (actionType === "gunner") {
    let bulletType: "fake" | "real" = "fake";
    try {
      const meta = JSON.parse(metadata || "{}") as { bulletType?: string };
      if (meta.bulletType === "real") bulletType = "real";
    } catch {
      // ignore, default to fake
    }
    const gunner = game.players.find((player) => player.roleKey === "gunner");
    if (bulletType === "real" && gunner && targetPlayerId === gunner.id) return { error: "self_real" };
    const ammo = gunnerAmmo(otherNights("gunner"));
    if (bulletType === "fake" && ammo.fakeLeft <= 0) return { error: "out_of_ammo" };
    if (bulletType === "real" && ammo.realLeft <= 0) return { error: "out_of_ammo" };
  }

  const main = ["mafiaShot", "sixthSense", "saul"];
  const replaceTypes = main.includes(actionType)
    ? main
    : (NIGHT_REPLACEABLE as readonly string[]).includes(actionType)
      ? [actionType]
      : [];
  if (replaceTypes.length) {
    await reverseTonightTypes(gameId, game.currentDay, replaceTypes);
  }

  if (actionType === "matador" && targetPlayerId) {
    const target = game.players.find((player) => player.id === targetPlayerId);
    const blockedTypes = Object.entries(NIGHT_ACTION_ROLE)
      .filter(([, role]) => role === target?.roleKey)
      .map(([type]) => type);
    if (target?.roleKey === "godfather") blockedTypes.push("mafiaShot");
    if (target?.roleKey === "jack") blockedTypes.push("jack");
    if (blockedTypes.length) {
      await reverseTonightTypes(gameId, game.currentDay, blockedTypes);
    }
  }

  await log(
    gameId,
    game.currentDay,
    game.currentPhase,
    user.id,
    actionType,
    messageEn,
    messageEn,
    targetPlayerId,
    metadata,
  );
  if (actionType === "saul" && targetPlayerId) {
    await convertToMafiaAction(gameId, targetPlayerId, JSON.stringify({ via: "night" }));
  }
  revalidateGame(gameId, game.event.slug);
}

type RoleCard = {
  roleKey: string;
  roleName: string;
  roleNameEn: string;
  faction: string;
  roleDescription: string;
  roleDescriptionEn: string;
};

function roleCard(player: RoleCard): RoleCard {
  return {
    roleKey: player.roleKey,
    roleName: player.roleName,
    roleNameEn: player.roleNameEn,
    faction: player.faction,
    roleDescription: player.roleDescription,
    roleDescriptionEn: player.roleDescriptionEn,
  };
}

export async function swapRolesAction(gameId: string, fromPlayerId: string, toPlayerId: string) {
  const { user, game } = await narratorGame(gameId);
  if (game.actions.some((action) => action.actionType === "faceChange")) {
    return { error: "used" };
  }
  const from = game.players.find((player) => player.id === fromPlayerId);
  const to = game.players.find((player) => player.id === toPlayerId);
  if (!from || !to) return { error: "not_found" };
  if (from.alive || !to.alive) return { error: "seats" };
  if (from.id === to.id) return { error: "same" };
  await prisma.$transaction([
    prisma.gamePlayer.update({ where: { id: from.id }, data: roleCard(to) }),
    prisma.gamePlayer.update({ where: { id: to.id }, data: roleCard(from) }),
  ]);
  await log(
    gameId,
    game.currentDay,
    game.currentPhase,
    user.id,
    "faceChange",
    `تغییر چهره: ${from.user.displayName} ↔ ${to.user.displayName}`,
    `Face-off: ${from.user.displayNameEn || from.user.displayName} ↔ ${to.user.displayNameEn || to.user.displayName}`,
    to.id,
    JSON.stringify({ fromPlayerId: from.id, toPlayerId: to.id }),
  );
  revalidateGame(gameId, game.event.slug);
}

export async function resetFaceChangeAction(gameId: string) {
  const { user, game } = await narratorGame(gameId);
  const action = [...game.actions].reverse().find((item) => item.actionType === "faceChange");
  if (!action) return { error: "none" };
  if (action.dayNumber !== game.currentDay) return { error: "locked" };
  let fromId = "";
  let toId = action.targetPlayerId ?? "";
  try {
    const meta = JSON.parse(action.metadata || "{}") as { fromPlayerId?: string; toPlayerId?: string };
    if (meta.fromPlayerId) fromId = meta.fromPlayerId;
    if (meta.toPlayerId) toId = meta.toPlayerId;
  } catch {
    return { error: "meta" };
  }
  const from = game.players.find((player) => player.id === fromId);
  const to = game.players.find((player) => player.id === toId);
  if (!from || !to) return { error: "not_found" };
  await prisma.$transaction([
    prisma.gamePlayer.update({ where: { id: from.id }, data: roleCard(to) }),
    prisma.gamePlayer.update({ where: { id: to.id }, data: roleCard(from) }),
    prisma.gameAction.update({ where: { id: action.id }, data: { reversed: true } }),
  ]);
  await log(
    gameId,
    game.currentDay,
    game.currentPhase,
    user.id,
    "faceChangeReset",
    `لغو تغییر چهره: ${from.user.displayName} ↔ ${to.user.displayName}`,
    `Face-off reset: ${from.user.displayNameEn || from.user.displayName} ↔ ${to.user.displayNameEn || to.user.displayName}`,
  );
  revalidateGame(gameId, game.event.slug);
}

export async function setPhaseAction(gameId: string, to: Phase) {
  const { user, game } = await narratorGame(gameId);
  if (!canTransition(game.currentPhase as Phase, to) && !user.isAdmin) {
    return { error: "illegal" };
  }
  const data: { currentPhase: string; currentDay?: number; nightStep?: number; speakerIndex?: number } = {
    currentPhase: to,
  };
  if (to === "day_discussion" && game.currentPhase === "intro_night") data.currentDay = 1;
  if (to === "day_discussion" && game.currentPhase === "morning_report") data.currentDay = game.currentDay + 1;
  if (to === "night") data.nightStep = 0;
  if (to === "intro_day" || to === "day_discussion") data.speakerIndex = 0;
  await prisma.game.update({ where: { id: gameId }, data });
  await log(gameId, data.currentDay ?? game.currentDay, to, user.id, "phase", `فاز: ${to}`, `Phase: ${to}`);
  revalidateGame(gameId, game.event.slug);
}

export async function setSpeakerAction(gameId: string, index: number) {
  const { game } = await narratorGame(gameId);
  await prisma.game.update({ where: { id: gameId }, data: { speakerIndex: index } });
  revalidateGame(gameId, game.event.slug);
}

export async function setVoteAction(
  gameId: string,
  voteType: "defense" | "elimination",
  targetPlayerId: string,
  count: number,
) {
  const { game } = await narratorGame(gameId);
  await prisma.vote.upsert({
    where: {
      gameId_dayNumber_voteType_targetPlayerId: {
        gameId,
        dayNumber: game.currentDay,
        voteType,
        targetPlayerId,
      },
    },
    create: {
      gameId,
      dayNumber: game.currentDay,
      voteType,
      targetPlayerId,
      count: Math.max(0, count),
    },
    update: { count: Math.max(0, count) },
  });
  revalidateGame(gameId, game.event.slug);
}

export async function eliminatePlayerAction(gameId: string, playerId: string, reason: string, metadata = "{}") {
  const { user, game } = await narratorGame(gameId);
  const player = game.players.find((p) => p.id === playerId);
  if (!player || !player.alive) return { error: "not_found" };
  await prisma.gamePlayer.update({
    where: { id: playerId },
    data: { alive: false, eliminatedAt: new Date(), eliminationReason: reason },
  });
  await log(
    gameId,
    game.currentDay,
    game.currentPhase,
    user.id,
    "eliminate",
    `${player.user.displayName} حذف شد`,
    `${player.user.displayNameEn || player.user.displayName} eliminated`,
    playerId,
    metadata,
  );

  const curse = activeJackCurse(game.actions);
  const jack = game.players.find((item) => item.roleKey === "jack" && item.alive && item.id !== playerId);
  if (curse?.playerId === playerId && jack) {
    await prisma.gamePlayer.update({
      where: { id: jack.id },
      data: { alive: false, eliminatedAt: new Date(), eliminationReason: "jack_curse" },
    });
    const cursedName = player.user.displayNameEn || player.user.displayName;
    const jackName = jack.user.displayNameEn || jack.user.displayName;
    await log(
      gameId,
      game.currentDay,
      game.currentPhase,
      user.id,
      "jackOut",
      `طلسم جک با ${player.user.displayName} از بازی خارج شد — جک هم حذف شد`,
      `Jack’s curse left with ${cursedName}. Jack is out.`,
      jack.id,
      metadata,
    );
    revalidateGame(gameId, game.event.slug);
    return { jackOut: { jackName, cursedName } };
  }

  revalidateGame(gameId, game.event.slug);
}

export async function revivePlayerAction(gameId: string, playerId: string, metadata = "{}") {
  const { user, game } = await narratorGame(gameId);
  const player = game.players.find((item) => item.id === playerId);
  if (!player || player.alive) return { error: "not_found" };
  await prisma.gamePlayer.update({
    where: { id: playerId },
    data: { alive: true, eliminatedAt: null, eliminationReason: null },
  });
  await log(
    gameId,
    game.currentDay,
    game.currentPhase,
    user.id,
    "revive",
    `${player.user.displayName} برگشت`,
    `${player.user.displayNameEn || player.user.displayName} returned to the game`,
    playerId,
    metadata,
  );
  revalidateGame(gameId, game.event.slug);
}

/** Saul's purchase succeeded: converts a plain citizen into Simple Mafia from this point on. */
export async function convertToMafiaAction(gameId: string, playerId: string, metadata = "{}") {
  const { user, game } = await narratorGame(gameId);
  const player = game.players.find((item) => item.id === playerId);
  if (!player || !player.alive) return { error: "not_found" };
  if (player.roleKey !== "villager") return { error: "not_villager" };
  const mafioso = CATALOG_BY_KEY.mafioso;
  const prevRole = roleCard(player);
  const nextRole: RoleCard = {
    roleKey: mafioso.key,
    roleName: mafioso.name,
    roleNameEn: mafioso.nameEn,
    faction: mafioso.faction,
    roleDescription: mafioso.description,
    roleDescriptionEn: mafioso.descriptionEn,
  };
  await prisma.gamePlayer.update({
    where: { id: playerId },
    data: nextRole,
  });
  let meta: Record<string, unknown> = {};
  try {
    meta = JSON.parse(metadata || "{}");
  } catch {
    meta = {};
  }
  await log(
    gameId,
    game.currentDay,
    game.currentPhase,
    user.id,
    "saulConvert",
    `${player.user.displayName} توسط ساول جذب مافیا شد`,
    `${player.user.displayNameEn || player.user.displayName} was recruited into the Mafia by Saul.`,
    playerId,
    JSON.stringify({ ...meta, prevRole }),
  );
  revalidateGame(gameId, game.event.slug);
}

export async function recordLeonShotAction(gameId: string, targetPlayerId: string) {
  const { game } = await narratorGame(gameId);
  const leon = game.players.find((player) => player.roleKey === "leon" && player.alive);
  const target = game.players.find((player) => player.id === targetPlayerId && player.alive);
  if (!leon || !target) return { error: "not_found" };
  const targetName = target.user.displayNameEn || target.user.displayName;
  return recordStageAction(gameId, "leon", `Leon shot → ${targetName}`, target.id);
}

export async function recordGunnerShotAction(gameId: string, holderId: string, targetPlayerId: string) {
  const { user, game } = await narratorGame(gameId);
  const holders = gunnerActiveHolders(game.actions);
  const gift = holders.get(holderId);
  if (!gift) return { error: "no_gun" };
  const holder = game.players.find((player) => player.id === holderId && player.alive);
  const target = game.players.find((player) => player.id === targetPlayerId && player.alive);
  if (!holder || !target) return { error: "not_found" };
  if (holder.id === target.id) return { error: "self" };

  const bulletType = gift.bulletType;
  const holderNameFa = holder.user.displayName;
  const targetNameFa = target.user.displayName;
  const holderNameEn = holder.user.displayNameEn || holder.user.displayName;
  const targetNameEn = target.user.displayNameEn || target.user.displayName;

  await log(
    gameId,
    game.currentDay,
    game.currentPhase,
    user.id,
    "gunnerShot",
    bulletType === "real"
      ? `${holderNameFa} با گلوله واقعی به ${targetNameFa} شلیک کرد`
      : `${holderNameFa} با گلوله مشقی به ${targetNameFa} شلیک کرد — هیچ اتفاقی نیفتاد`,
    bulletType === "real"
      ? `${holderNameEn} fired a real round at ${targetNameEn}.`
      : `${holderNameEn} fired a blank round at ${targetNameEn}. Nothing happens.`,
    targetPlayerId,
    JSON.stringify({ holderId, bulletType }),
  );

  if (bulletType === "real") {
    const result = await eliminatePlayerAction(gameId, targetPlayerId, "gunner_shot");
    revalidateGame(gameId, game.event.slug);
    if (result && "jackOut" in result && result.jackOut) return { bulletType, jackOut: result.jackOut };
    return { bulletType };
  }
  revalidateGame(gameId, game.event.slug);
  return { bulletType };
}

export async function clearTonightAction(gameId: string, actionType: string) {
  const { game } = await narratorGame(gameId);
  if (!(NIGHT_REPLACEABLE as readonly string[]).includes(actionType)) return { error: "type" };
  await reverseTonightTypes(gameId, game.currentDay, [actionType]);
  revalidateGame(gameId, game.event.slug);
}

export async function undoLastInquiryAction(gameId: string) {
  const { game } = await narratorGame(gameId);
  const last = [...game.actions].reverse().find((action) => action.actionType === "inquiry");
  if (!last) return { error: "empty" };
  await prisma.gameAction.update({ where: { id: last.id }, data: { reversed: true } });
  revalidateGame(gameId, game.event.slug);
}

export async function drawExitCardAction(gameId: string, cardId: string) {
  const { user, game } = await narratorGame(gameId);
  const snapshot = readSnapshot(game.scenarioSnapshot);
  const card = snapshot.exitCards.find((item) => item.id === cardId && !item.used);
  if (!card) return { error: "empty" };

  card.used = true;
  await prisma.game.update({
    where: { id: gameId },
    data: { scenarioSnapshot: JSON.stringify(snapshot) },
  });
  await log(
    gameId,
    game.currentDay,
    game.currentPhase,
    user.id,
    "exit_card",
    `کارت خروج: ${card.name}`,
    `Exit card: ${card.nameEn}`,
    undefined,
    JSON.stringify({ key: card.key, id: card.id }),
  );
  revalidateGame(gameId, game.event.slug);
  return { card };
}

export async function recordLotteryAction(gameId: string, color: "blue" | "green") {
  const { user, game } = await narratorGame(gameId);
  await log(
    gameId,
    game.currentDay,
    game.currentPhase,
    user.id,
    "tie",
    color === "green" ? "قرعه: سبز" : "قرعه: آبی",
    color === "green" ? "Draw: Green" : "Draw: Blue",
  );
  revalidateGame(gameId, game.event.slug);
  return { color };
}

export async function randomizeTieAction(gameId: string) {
  return recordLotteryAction(gameId, Math.random() < 0.5 ? "blue" : "green");
}

export async function recordNightAction(gameId: string, targetPlayerId: string) {
  const { user, game } = await narratorGame(gameId);
  const snapshot = readSnapshot(game.scenarioSnapshot);
  const order = snapshot.configuration.nightOrder;
  const stepKey = order[game.nightStep] ?? "unknown";
  const role = snapshot.roles.find((r) => r.key === stepKey);
  const target = game.players.find((p) => p.id === targetPlayerId);
  const boughtTonight = Boolean(
    target &&
      game.actions.some(
        (action) =>
          action.actionType === "saulConvert" &&
          action.dayNumber === game.currentDay &&
          action.targetPlayerId === target.id,
      ),
  );
  const detectiveSeesMafia =
    stepKey === "detective" &&
    target &&
    target.roleKey !== "godfather" &&
    (target.faction === "mafia" || boughtTonight);

  await log(
    gameId,
    game.currentDay,
    "night",
    user.id,
    stepKey,
    `${role?.name || nightStepLabel(stepKey)} → ${target?.user.displayName ?? "?"}`,
    `${role?.nameEn || nightStepLabel(stepKey)} → ${target?.user.displayNameEn || target?.user.displayName || "?"}`,
    targetPlayerId,
    JSON.stringify({
      result: stepKey === "detective" ? (detectiveSeesMafia ? "positive" : "negative") : "recorded",
    }),
  );

  const nextStep = game.nightStep + 1;
  await prisma.game.update({
    where: { id: gameId },
    data: {
      nightStep: nextStep,
      currentPhase: nextStep >= order.length ? "night_resolution" : "night",
    },
  });
  revalidateGame(gameId, game.event.slug);
  return {
    result: stepKey === "detective" ? (detectiveSeesMafia ? "positive" : "negative") : "recorded",
  };
}

export async function revealMyRoleAction(gameId: string) {
  const user = await requireUser();
  const player = await prisma.gamePlayer.findUnique({
    where: { gameId_userId: { gameId, userId: user.id } },
  });
  if (!player) return { error: "forbidden" };
  if (!player.revealedAt) {
    await prisma.gamePlayer.update({
      where: { id: player.id },
      data: { revealedAt: new Date() },
    });
  }
  revalidatePath(`/games/${gameId}/role`);
}

export async function endGameAction(gameId: string, winningFaction: string) {
  const { user, game } = await narratorGame(gameId);
  if (game.status === "finished" && !user.isAdmin) return { error: "closed" };
  if (winningFaction !== "citizen" && winningFaction !== "mafia" && winningFaction !== "independent") {
    return { error: "faction" };
  }
  await prisma.game.update({
    where: { id: gameId },
    data: { winningFaction },
  });
  await log(gameId, game.currentDay, game.currentPhase, user.id, "end", `برنده: ${winningFaction}`, `Winner: ${winningFaction}`);
  revalidateGame(gameId, game.event.slug);
}

export async function closeGameAction(gameId: string) {
  const { user, game } = await narratorGame(gameId);
  if (!game.winningFaction) return { error: "winner" };
  if (game.status !== "finished") {
    await prisma.game.update({
      where: { id: gameId },
      data: {
        status: "finished",
        currentPhase: "game_over",
        finishedAt: game.finishedAt ?? new Date(),
      },
    });
    await prisma.event.update({ where: { id: game.eventId }, data: { status: "finished" } });
    await log(gameId, game.currentDay, "game_over", user.id, "close", "بازی بسته شد", "Game closed");
    revalidateGame(gameId, game.event.slug);
  }
  redirect(`/events/${game.event.slug}`);
}

export async function resetGameAction(gameId: string) {
  const { game } = await narratorGame(gameId);
  const slug = game.event.slug;
  await prisma.$transaction([
    prisma.game.deleteMany({ where: { eventId: game.eventId } }),
    prisma.event.update({
      where: { id: game.eventId },
      data: { status: "scenario_pending" },
    }),
  ]);
  revalidatePath(`/events/${slug}`);
  revalidatePath(`/events/${slug}/players`);
  revalidatePath("/dashboard");
  revalidatePath("/past");
  revalidatePath("/admin/events");
  redirect(`/events/${slug}`);
}

export async function undoLastAction(gameId: string) {
  const { user, game } = await narratorGame(gameId);
  const last = await prisma.gameAction.findFirst({
    where: { gameId, reversed: false },
    orderBy: { createdAt: "desc" },
  });
  if (!last) return { error: "empty" };
  await prisma.gameAction.update({ where: { id: last.id }, data: { reversed: true } });
  await log(gameId, game.currentDay, game.currentPhase, user.id, "undo", "آخرین اکشن لغو شد", "Last action undone");
  revalidateGame(gameId, game.event.slug);
}

async function log(
  gameId: string,
  dayNumber: number,
  phase: string,
  actorUserId: string,
  actionType: string,
  message: string,
  messageEn: string,
  targetPlayerId?: string,
  metadata = "{}",
) {
  await prisma.gameAction.create({
    data: { gameId, dayNumber, phase, actorUserId, actionType, message, messageEn, targetPlayerId, metadata },
  });
}

export async function defaultConfig(raw: string) {
  return parseConfig(raw);
}
