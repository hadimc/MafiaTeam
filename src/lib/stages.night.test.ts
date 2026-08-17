import assert from "node:assert/strict";
import test from "node:test";
import { nightLine, resolveNight } from "./stages";

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

test("Matador blocking Leon ignores that shot", () => {
  const result = resolveNight(
    [act("leon", lecter.id), act("matador", leon.id)],
    [leon, lecter, matador],
    1,
  );
  assert.deepEqual(result.leaveIds, []);
});

test("Matador blocking Watson ignores that save", () => {
  const result = resolveNight(
    [act("mafiaShot", villager.id), act("watson", villager.id), act("matador", watson.id)],
    [villager, watson, matador],
    1,
  );
  assert.deepEqual(result.leaveIds, [villager.id]);
  assert.equal(result.notes.some((note) => /matador blocked watson/i.test(note)), true);
});

test("empty night explains why nobody leaves", () => {
  const result = resolveNight([], [villager], 1);
  assert.deepEqual(result.leaveIds, []);
  assert.equal(result.notes.some((note) => /nobody/i.test(note)), true);
});

test("sixth sense removes a non-immune independent when Godfather is alive", () => {
  const godfather = player("g", "godfather", "mafia");
  const indie = player("z", "zodiac", "independent");
  const result = resolveNight([act("sixthSense", indie.id)], [godfather, indie], 1);
  assert.deepEqual(result.leaveIds, [indie.id]);
});

test("sixth sense does nothing if Godfather is already out", () => {
  const godfather = { ...player("g", "godfather", "mafia"), alive: false };
  const indie = player("z", "zodiac", "independent");
  const result = resolveNight([act("sixthSense", indie.id)], [godfather, indie], 1);
  assert.deepEqual(result.leaveIds, []);
});

test("Watson save is ignored if Watson is already out", () => {
  const deadWatson = { ...watson, alive: false };
  const result = resolveNight(
    [act("mafiaShot", villager.id), act("watson", villager.id)],
    [villager, deadWatson],
    1,
  );
  assert.deepEqual(result.leaveIds, [villager.id]);
});

test("Lecter save is ignored if Lecter is already out", () => {
  const deadLecter = { ...lecter, alive: false };
  const mafioso = player("f", "mafioso", "mafia");
  const result = resolveNight(
    [act("leon", mafioso.id), act("lecter", mafioso.id)],
    [leon, mafioso, deadLecter],
    1,
  );
  assert.deepEqual(result.leaveIds, [mafioso.id]);
});

test("Matador block is ignored if Matador is already out", () => {
  const deadMatador = { ...matador, alive: false };
  const result = resolveNight(
    [act("mafiaShot", villager.id), act("watson", villager.id), act("matador", watson.id)],
    [villager, watson, deadMatador],
    1,
  );
  assert.deepEqual(result.leaveIds, []);
});

test("intro night does not remove anyone", () => {
  const result = resolveNight([act("mafiaShot", villager.id, 0)], [villager], 0);
  assert.deepEqual(result.leaveIds, []);
});

test("night line skips a role that is not in the scenario", () => {
  const scenario = new Set(["watson", "leon"]);
  assert.equal(nightLine("lecter", scenario, [watson, leon], new Set()), "skip");
});

test("night line still covers a dealt role that is out but not shown", () => {
  const scenario = new Set(["lecter", "watson"]);
  const deadLecter = { ...lecter, alive: false };
  assert.equal(nightLine("lecter", scenario, [deadLecter, watson], new Set()), "cover");
});

test("night line skips a dealt role once it is publicly shown out", () => {
  const scenario = new Set(["lecter", "watson"]);
  const deadLecter = { ...lecter, alive: false };
  assert.equal(nightLine("lecter", scenario, [deadLecter, watson], new Set([lecter.id])), "skip");
});

test("night line records while the role is still alive", () => {
  const scenario = new Set(["lecter"]);
  assert.equal(nightLine("lecter", scenario, [lecter], new Set()), "record");
});
