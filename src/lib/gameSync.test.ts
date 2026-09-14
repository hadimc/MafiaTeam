import assert from "node:assert/strict";
import test from "node:test";
import { gameSyncStamp, type GameSyncInput } from "./gameSync";

function base(over: Partial<GameSyncInput> = {}): GameSyncInput {
  return {
    status: "in_progress",
    currentDay: 1,
    currentPhase: "night",
    nightStep: 0,
    speakerIndex: 0,
    winningFaction: null,
    scenarioSnapshot: "{}",
    players: [{ id: "p1", alive: true, roleKey: "villager" }],
    actions: [],
    votes: [],
    draws: [],
    ...over,
  };
}

test("stamp changes when the other narrator records a night action", () => {
  const before = gameSyncStamp(base());
  const after = gameSyncStamp(
    base({
      actions: [
        {
          id: "a1",
          reversed: false,
          actionType: "mafiaShot",
          targetPlayerId: "p1",
          dayNumber: 1,
          metadata: "{}",
        },
      ],
    }),
  );
  assert.notEqual(before, after);
});

test("stamp changes when a night pick is reversed", () => {
  const recorded = gameSyncStamp(
    base({
      actions: [
        { id: "a1", reversed: false, actionType: "watson", targetPlayerId: "p1", dayNumber: 1, metadata: "{}" },
      ],
    }),
  );
  const undone = gameSyncStamp(
    base({
      actions: [
        { id: "a1", reversed: true, actionType: "watson", targetPlayerId: "p1", dayNumber: 1, metadata: "{}" },
      ],
    }),
  );
  assert.notEqual(recorded, undone);
});

test("stamp changes when the stage or a seat flips", () => {
  const night = gameSyncStamp(base());
  const day = gameSyncStamp(base({ currentPhase: "day_discussion", currentDay: 2 }));
  const dead = gameSyncStamp(base({ players: [{ id: "p1", alive: false, roleKey: "villager" }] }));
  assert.notEqual(night, day);
  assert.notEqual(night, dead);
});
