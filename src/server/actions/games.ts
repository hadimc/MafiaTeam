"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import {
  assignRoles,
  canTransition,
  parseConfig,
  randomRedBlue,
  type Faction,
  type Phase,
  type RoleDef,
} from "@/engine";
import { nightStepLabel } from "@/lib/catalog";
import { getGameForNarrator, isNarrator, readSnapshot, snapshotFromScenario } from "@/lib/queries";

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
  if (game.currentPhase !== "lobby") return { error: "phase" };
  await prisma.game.update({
    where: { id: gameId },
    data: {
      status: "in_progress",
      currentPhase: "intro_day",
      startedAt: new Date(),
    },
  });
  await prisma.event.update({ where: { id: game.eventId }, data: { status: "in_progress" } });
  await log(gameId, 0, "intro_day", user.id, "start", "بازی شروع شد", "Game started");
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
  if (!player) return { error: "not_found" };
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
  await prisma.game.update({ where: { id: gameId }, data: { currentPhase: "exit_card" } });
  revalidateGame(gameId, game.event.slug);
}

export async function drawExitCardAction(gameId: string, playerId: string, drawNumber: number) {
  const { user, game } = await narratorGame(gameId);
  const snapshot = readSnapshot(game.scenarioSnapshot);
  const remaining = snapshot.exitCards.filter((c) => !c.used);
  const card = remaining[drawNumber - 1] ?? remaining[0];
  if (!card) return { error: "empty" };

  card.used = true;
  await prisma.game.update({
    where: { id: gameId },
    data: { scenarioSnapshot: JSON.stringify(snapshot) },
  });
  await prisma.exitCardDraw.create({
    data: {
      gameId,
      playerId,
      exitCardId: card.id,
      cardKey: card.key,
      cardName: card.name,
      cardNameEn: card.nameEn,
      drawNumber,
    },
  });
  await log(
    gameId,
    game.currentDay,
    "exit_card",
    user.id,
    "exit_card",
    `کارت خروج: ${card.name}`,
    `Exit card: ${card.nameEn}`,
    playerId,
    JSON.stringify({ key: card.key, drawNumber }),
  );
  revalidateGame(gameId, game.event.slug);
  return { card };
}

export async function randomizeTieAction(gameId: string) {
  const { user, game } = await narratorGame(gameId);
  const color = randomRedBlue();
  await log(
    gameId,
    game.currentDay,
    "tie_break",
    user.id,
    "tie",
    color === "red" ? "قرعه: قرمز" : "قرعه: آبی",
    color === "red" ? "Draw: Red" : "Draw: Blue",
  );
  revalidateGame(gameId, game.event.slug);
  return { color };
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
