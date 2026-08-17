import assert from "node:assert/strict";
import test from "node:test";
import { nightLine, nightTasks, resolveNight } from "./stages";

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

function act(type: string, target: string, day = 1, metadata?: string) {
  return { actionType: type, dayNumber: day, phase: "night", targetPlayerId: target, metadata };
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

test("sixth sense does not remove anyone until marked Correct", () => {
  const godfather = player("g", "godfather", "mafia");
  const indie = player("z", "zodiac", "independent");
  const pending = resolveNight([act("sixthSense", indie.id)], [godfather, indie], 1);
  assert.deepEqual(pending.leaveIds, []);
  const wrong = resolveNight(
    [act("sixthSense", indie.id, 1, JSON.stringify({ result: "wrong" }))],
    [godfather, indie],
    1,
  );
  assert.deepEqual(wrong.leaveIds, []);
});

test("sixth sense removes the guessed player when marked Correct", () => {
  const godfather = player("g", "godfather", "mafia");
  const indie = player("z", "zodiac", "independent");
  const result = resolveNight(
    [act("sixthSense", indie.id, 1, JSON.stringify({ result: "correct" }))],
    [godfather, indie],
    1,
  );
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

test("night line skips an independent once they are out", () => {
  const scenario = new Set(["jack"]);
  const deadJack = { ...jack, alive: false };
  assert.equal(nightLine("jack", scenario, [deadJack], new Set()), "skip");
});

test("Face-off stays on the night it happened and is hidden later", () => {
  const line = () => "skip" as const;
  const keys = (n: number, usedOn: number | null) =>
    nightTasks({ kind: "night", n }, true, line, usedOn).map((task) => task.key);
  assert.equal(keys(1, null).includes("faceChange"), true);
  assert.equal(keys(1, 1).includes("faceChange"), true);
  assert.equal(keys(2, 1).includes("faceChange"), false);
});

test("Kane coupon on a citizen does nothing that night", () => {
  const kane = player("k", "kane", "citizen");
  const result = resolveNight([act("kane", villager.id)], [kane, villager], 1);
  assert.deepEqual(result.leaveIds, []);
  assert.equal(result.notes.some((note) => /not mafia/i.test(note)), true);
});

test("Kane coupon on mafia does not remove Kane that night", () => {
  const kane = player("k", "kane", "citizen");
  const result = resolveNight([act("kane", lecter.id)], [kane, lecter], 1);
  assert.deepEqual(result.leaveIds, []);
  assert.equal(result.notes.some((note) => /following night/i.test(note)), true);
});

test("Kane leaves the night after marking mafia", () => {
  const kane = player("k", "kane", "citizen");
  const result = resolveNight([act("kane", lecter.id, 1)], [kane, lecter], 2);
  assert.deepEqual(result.leaveIds, [kane.id]);
});

test("Kane does not leave the night after marking a citizen", () => {
  const kane = player("k", "kane", "citizen");
  const result = resolveNight([act("kane", villager.id, 1)], [kane, villager], 2);
  assert.deepEqual(result.leaveIds, []);
});

test("Matador blocking Kane last night prevents the delayed leave", () => {
  const kane = player("k", "kane", "citizen");
  const result = resolveNight(
    [act("kane", lecter.id, 1), act("matador", kane.id, 1)],
    [kane, lecter, matador],
    2,
  );
  assert.deepEqual(result.leaveIds, []);
});

test("Kane already out does not leave again the night after a mafia coupon", () => {
  const kane = { ...player("k", "kane", "citizen"), alive: false };
  const result = resolveNight([act("kane", lecter.id, 1)], [kane, lecter], 2);
  assert.deepEqual(result.leaveIds, []);
});

test("Jack curse takes Jack out when the cursed player leaves", () => {
  const result = resolveNight(
    [act("jack", villager.id), act("mafiaShot", villager.id)],
    [jack, villager, watson],
    1,
  );
  assert.deepEqual(result.leaveIds.sort(), [jack.id, villager.id].sort());
  assert.equal(result.notes.some((note) => /jack leaves/i.test(note)), true);
});

test("Jack already out does not leave again when the cursed player leaves", () => {
  const deadJack = { ...jack, alive: false };
  const result = resolveNight(
    [act("jack", villager.id), act("mafiaShot", villager.id)],
    [deadJack, villager, watson],
    1,
  );
  assert.deepEqual(result.leaveIds, [villager.id]);
  assert.equal(result.notes.some((note) => /jack leaves/i.test(note)), false);
});
