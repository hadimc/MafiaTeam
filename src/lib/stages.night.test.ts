import assert from "node:assert/strict";
import test from "node:test";
import { resolveNight } from "./stages";

type P = {
  id: string;
  roleKey: string;
  faction: "citizen" | "mafia" | "independent";
  alive: boolean;
};

function player(id: string, roleKey: string, faction: P["faction"]): P {
  return { id, roleKey, faction, alive: true };
}

const watson = player("w", "watson", "citizen");
const leon = player("l", "leon", "citizen");
const villager = player("v", "villager", "citizen");
const lecter = player("c", "lecter", "mafia");
const jack = player("j", "jack", "independent");
const matador = player("m", "matador", "mafia");

function act(type: string, target: string, day = 1) {
  return { actionType: type, dayNumber: day, phase: "night", targetPlayerId: target };
}

test("mafia shot without a Watson save removes the target at night end", () => {
  const result = resolveNight([act("mafiaShot", villager.id)], [villager, watson], 1);
  assert.deepEqual(result.leaveIds, [villager.id]);
});

test("Watson save on the mafia-shot target keeps them in the game", () => {
  const result = resolveNight(
    [act("mafiaShot", villager.id), act("watson", villager.id)],
    [villager, watson],
    1,
  );
  assert.deepEqual(result.leaveIds, []);
  assert.equal(result.notes.some((note) => /watson/i.test(note)), true);
});

test("Lecter save does not cancel a mafia shot", () => {
  const result = resolveNight(
    [act("mafiaShot", villager.id), act("lecter", lecter.id)],
    [villager, lecter],
    1,
  );
  assert.deepEqual(result.leaveIds, [villager.id]);
});

test("later Watson pick replaces an earlier save the same night", () => {
  const result = resolveNight(
    [act("mafiaShot", villager.id), act("watson", watson.id), act("watson", villager.id)],
    [villager, watson],
    1,
  );
  assert.deepEqual(result.leaveIds, []);
});

test("later Leon pick replaces an earlier shot the same night", () => {
  const miss = resolveNight([act("leon", villager.id)], [leon, villager, lecter], 1);
  assert.deepEqual(miss.leaveIds, [leon.id]);
  const corrected = resolveNight(
    [act("leon", villager.id), act("leon", lecter.id)],
    [leon, villager, lecter],
    1,
  );
  assert.deepEqual(corrected.leaveIds, [lecter.id]);
});

test("Leon shooting a citizen takes Leon out, not the citizen", () => {
  const result = resolveNight([act("leon", villager.id)], [leon, villager], 1);
  assert.deepEqual(result.leaveIds, [leon.id]);
});

test("Lecter save blocks Leon from removing mafia", () => {
  const result = resolveNight(
    [act("leon", lecter.id), act("lecter", lecter.id)],
    [leon, lecter],
    1,
  );
  assert.deepEqual(result.leaveIds, []);
});

test("Jack is immune to the mafia shot", () => {
  const result = resolveNight([act("mafiaShot", jack.id)], [jack, watson], 1);
  assert.deepEqual(result.leaveIds, []);
});

test("Matador blocking Watson ignores that save", () => {
  const result = resolveNight(
    [act("mafiaShot", villager.id), act("watson", villager.id), act("matador", watson.id)],
    [villager, watson, matador],
    1,
  );
  assert.deepEqual(result.leaveIds, [villager.id]);
});

test("intro night does not remove anyone", () => {
  const result = resolveNight([act("mafiaShot", villager.id, 0)], [villager], 0);
  assert.deepEqual(result.leaveIds, []);
});
