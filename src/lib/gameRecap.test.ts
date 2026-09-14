import assert from "node:assert/strict";
import test from "node:test";
import { formatGameDuration, pickPlayerOfTheGame, recapTimeline, type RecapPlayer } from "./gameRecap";

function p(over: Partial<RecapPlayer> & Pick<RecapPlayer, "id" | "roleKey" | "faction">): RecapPlayer {
  return {
    userId: over.id,
    seatNumber: 1,
    roleName: over.roleKey,
    roleNameEn: over.roleKey,
    alive: true,
    user: { displayName: over.id, displayNameEn: over.id },
    ...over,
  };
}

test("player of the game prefers a surviving independent winner", () => {
  const jack = p({ id: "j", roleKey: "jack", faction: "independent", seatNumber: 4, alive: true });
  const villager = p({ id: "v", roleKey: "villager", faction: "citizen", seatNumber: 1, alive: true });
  const pick = pickPlayerOfTheGame([villager, jack], "independent");
  assert.equal(pick?.player.id, "j");
  assert.equal(pick?.why, "indie_win");
});

test("player of the game falls back to a surviving named winner", () => {
  const godfather = p({ id: "g", roleKey: "godfather", faction: "mafia", seatNumber: 2, alive: true });
  const mafioso = p({ id: "m", roleKey: "mafioso", faction: "mafia", seatNumber: 1, alive: false });
  const pick = pickPlayerOfTheGame([mafioso, godfather], "mafia");
  assert.equal(pick?.player.id, "g");
  assert.equal(pick?.why, "survived_win");
});

test("formatGameDuration is bilingual", () => {
  const start = "2026-09-13T01:00:00.000Z";
  const end = "2026-09-13T03:15:00.000Z";
  assert.equal(formatGameDuration(start, end, "en"), "2h 15m");
  assert.equal(formatGameDuration(start, end, "fa"), "2 ساعت و 15 دقیقه");
});

test("recap timeline keeps leave and return order", () => {
  const rows = recapTimeline([
    { actionType: "eliminate", dayNumber: 1, phase: "day_discussion", targetPlayerId: "a" },
    { actionType: "eliminate", dayNumber: 2, phase: "night", targetPlayerId: "b" },
    { actionType: "revive", dayNumber: 2, targetPlayerId: "a" },
  ]);
  assert.deepEqual(
    rows.map((row) => `${row.day}:${row.kind}:${row.playerId}`),
    ["1:left:a", "2:left:b", "2:returned:a"],
  );
});
