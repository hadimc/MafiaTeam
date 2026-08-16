"use server";

import { revalidatePath } from "next/cache";
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
import { nightStepLabel } from "@/lib/catalog";
import { getGameForNarrator, isNarrator, readSnapshot, snapshotFromScenario } from "@/lib/queries";
import { activeJackCurse, jackCurseRound } from "@/lib/stages";

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

  const round = jackCurseRound(
    game.actions,
    game.players.filter((player) => player.alive),
    game.currentDay,
  );
  if (!round.eligibleIds.includes(targetPlayerId)) return { error: "repeat" };

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
) {
  const { user, game } = await narratorGame(gameId);
  await log(
    gameId,
    game.currentDay,
    game.currentPhase,
    user.id,
    actionType,
    messageEn,
    messageEn,
    targetPlayerId,
  );
  if (actionType === "constantine" && targetPlayerId) {
    await prisma.gamePlayer.update({
      where: { id: targetPlayerId },
      data: { alive: true, eliminatedAt: null, eliminationReason: null },
    });
  }
  revalidateGame(gameId, game.event.slug);
}

export async function swapRolesAction(gameId: string, fromPlayerId: string, toPlayerId: string) {
  const { user, game } = await narratorGame(gameId);
  const from = game.players.find((player) => player.id === fromPlayerId);
  const to = game.players.find((player) => player.id === toPlayerId);
  if (!from || !to) return { error: "not_found" };
  await prisma.$transaction([
    prisma.gamePlayer.update({
      where: { id: from.id },
      data: {
        roleKey: to.roleKey,
        roleName: to.roleName,
        roleNameEn: to.roleNameEn,
        faction: to.faction,
        roleDescription: to.roleDescription,
        roleDescriptionEn: to.roleDescriptionEn,
      },
    }),
    prisma.gamePlayer.update({
      where: { id: to.id },
      data: {
        roleKey: from.roleKey,
        roleName: from.roleName,
        roleNameEn: from.roleNameEn,
        faction: from.faction,
        roleDescription: from.roleDescription,
        roleDescriptionEn: from.roleDescriptionEn,
      },
    }),
  ]);
  await log(
    gameId,
    game.currentDay,
    game.currentPhase,
    user.id,
    "faceChange",
    `تغییر چهره: ${from.user.displayName} ↔ ${to.user.displayName}`,
    `Face change: ${from.user.displayNameEn || from.user.displayName} ↔ ${to.user.displayNameEn || to.user.displayName}`,
    to.id,
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

export async function eliminatePlayerAction(gameId: string, playerId: string, reason: string) {
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
    );
    revalidateGame(gameId, game.event.slug);
    return { jackOut: { jackName, cursedName } };
  }

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
  const detectiveSeesMafia =
    stepKey === "detective" && target && target.faction === "mafia" && target.roleKey !== "godfather";

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
  await prisma.game.update({
    where: { id: gameId },
    data: {
      status: "finished",
      currentPhase: "game_over",
      winningFaction,
      finishedAt: new Date(),
    },
  });
  await prisma.event.update({ where: { id: game.eventId }, data: { status: "finished" } });
  await log(gameId, game.currentDay, "game_over", user.id, "end", `برنده: ${winningFaction}`, `Winner: ${winningFaction}`);
  revalidateGame(gameId, game.event.slug);
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
