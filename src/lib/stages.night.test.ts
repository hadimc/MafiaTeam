import assert from "node:assert/strict";
import test from "node:test";
import { appliedNightOutcome, lastNightReport, nightLine, nightTasks, resolveNight } from "./stages";

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

test("Matador can disable an independent night action", () => {
  const result = resolveNight(
    [act("zodiac", villager.id, 2), act("matador", zodiac.id, 2)],
    [zodiac, villager, matador],
    2,
  );
  assert.deepEqual(result.leaveIds, []);
  assert.equal(result.notes.some((note) => /matador blocked zodiac/i.test(note)), true);
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

const zodiac = player("z", "zodiac", "independent");

test("Zodiac is immune to the mafia shot", () => {
  const result = resolveNight([act("mafiaShot", zodiac.id, 2)], [zodiac, watson], 2);
  assert.deepEqual(result.leaveIds, []);
});

test("Zodiac is immune to Leon's shot", () => {
  const result = resolveNight([act("leon", zodiac.id, 2)], [leon, zodiac], 2);
  assert.deepEqual(result.leaveIds, []);
});

test("Zodiac's shot eliminates the target", () => {
  const result = resolveNight([act("zodiac", villager.id, 2)], [zodiac, villager], 2);
  assert.deepEqual(result.leaveIds, [villager.id]);
  assert.equal(result.notes.some((note) => /zodiac.?s shot stands/i.test(note)), true);
});

test("Zodiac's shot works on Mafia too", () => {
  const result = resolveNight([act("zodiac", lecter.id, 2)], [zodiac, lecter], 2);
  assert.deepEqual(result.leaveIds, [lecter.id]);
});

test("Zodiac misfiring on Watson kills Zodiac instead", () => {
  const result = resolveNight([act("zodiac", watson.id, 2)], [zodiac, watson], 2);
  assert.deepEqual(result.leaveIds, [zodiac.id]);
  assert.equal(result.notes.some((note) => /misfired/i.test(note)), true);
});

test("Zodiac shot is dropped once Zodiac is out", () => {
  const deadZodiac = { ...zodiac, alive: false };
  const result = resolveNight([act("zodiac", villager.id, 2)], [deadZodiac, villager], 2);
  assert.deepEqual(result.leaveIds, []);
  assert.equal(result.notes.some((note) => /zodiac is out/i.test(note)), true);
});

test("Zodiac task appears on intro night and even nights only", () => {
  const line = (key: string) => (key === "zodiac" ? ("record" as const) : ("skip" as const));
  const keys = (n: number) => nightTasks({ kind: "night", n }, false, line).map((task) => task.key);
  assert.equal(keys(0).includes("zodiac"), true);
  assert.equal(keys(1).includes("zodiac"), false);
  assert.equal(keys(2).includes("zodiac"), true);
  assert.equal(keys(3).includes("zodiac"), false);
});

test("lastNightReport surfaces which Mafia player Kane's coupon marked", () => {
  const kane = player("k", "kane", "citizen");
  const result = lastNightReport([act("kane", lecter.id, 1)], 2, [kane, lecter]);
  assert.equal(result.kaneMafiaMarkId, lecter.id);
  assert.deepEqual(result.leaveIds, []);
});

test("appliedNightOutcome reads the committed leave/return log for a night, not a live recompute", () => {
  // Simulate what applyNightResolution actually persists: an "eliminate" GameAction for
  // Kane, tagged via:"night" for night 2 — recorded once, at the moment Kane was still alive.
  const applied = appliedNightOutcome(
    [
      {
        actionType: "eliminate",
        dayNumber: 2,
        targetPlayerId: "k",
        metadata: JSON.stringify({ via: "night" }),
      },
    ],
    2,
  );
  assert.deepEqual(applied.leaveIds, ["k"]);
});

const saul = player("s", "saul", "mafia");
const deadMafioso = { ...player("x", "mafioso", "mafia"), alive: false };

test("Saul's purchase succeeds on a plain citizen and marks them for conversion", () => {
  const result = resolveNight([act("saul", villager.id)], [saul, villager, deadMafioso], 1);
  assert.equal(result.saulConvertId, villager.id);
  assert.equal(result.notes.some((note) => /purchase succeeded/i.test(note)), true);
});

test("Saul's purchase is locked until Mafia has lost a member", () => {
  const result = resolveNight([act("saul", villager.id)], [saul, villager], 1);
  assert.equal(result.saulConvertId, null);
  assert.equal(result.notes.some((note) => /lost a member/i.test(note)), true);
});

test("Saul's purchase fails on a player with a role", () => {
  const result = resolveNight([act("saul", watson.id)], [saul, watson, deadMafioso], 1);
  assert.equal(result.saulConvertId, null);
  assert.equal(result.notes.some((note) => /purchase failed/i.test(note)), true);
});

test("Saul's purchase fails on another Mafia member (already has a role)", () => {
  const result = resolveNight([act("saul", lecter.id)], [saul, lecter, deadMafioso], 1);
  assert.equal(result.saulConvertId, null);
});

test("Matador blocking the Godfather does not cancel Saul's purchase", () => {
  const godfather = player("g", "godfather", "mafia");
  const matador = player("m", "matador", "mafia");
  const result = resolveNight(
    [act("saul", villager.id), act("matador", godfather.id)],
    [saul, godfather, matador, villager, deadMafioso],
    1,
  );
  assert.equal(result.saulConvertId, villager.id);
});

test("Leon treats a same-night purchase as Simple Mafia", () => {
  const result = resolveNight(
    [act("saul", villager.id), act("leon", villager.id)],
    [saul, villager, leon, deadMafioso],
    1,
  );
  assert.equal(result.saulConvertId, villager.id);
  assert.deepEqual(result.leaveIds, [villager.id]);
  assert.equal(result.notes.some((note) => /leon.?s shot stands/i.test(note)), true);
});

test("Kane treats a same-night purchase as Mafia", () => {
  const kane = player("k", "kane", "citizen");
  const result = resolveNight(
    [act("saul", villager.id), act("kane", villager.id)],
    [saul, villager, kane, deadMafioso],
    1,
  );
  assert.equal(result.saulConvertId, villager.id);
  assert.equal(result.kaneMafiaMarkId, villager.id);
});

test("already-converted purchase still counts as Simple Mafia for Leon", () => {
  const bought = { ...villager, roleKey: "mafioso", faction: "mafia" as const };
  const result = resolveNight(
    [
      act("saul", villager.id),
      { actionType: "saulConvert", dayNumber: 1, phase: "night", targetPlayerId: villager.id },
      act("leon", villager.id),
    ],
    [saul, bought, leon, deadMafioso],
    1,
  );
  assert.equal(result.saulConvertId, villager.id);
  assert.deepEqual(result.leaveIds, [villager.id]);
});

test("night briefing still reports Kane's delayed leave after Kane is already marked dead", () => {
  // Regression: recomputing resolveNight for a past night using *today's* alive status used to
  // hide Kane's delayed leave, because the delayed-leave check requires Kane to still be alive.
  // lastNightReport must instead read back what was actually applied for that night.
  const deadKane = { ...player("k", "kane", "citizen"), alive: false };
  const actions = [
    act("kane", lecter.id, 1),
    {
      actionType: "eliminate",
      dayNumber: 2,
      targetPlayerId: "k",
      metadata: JSON.stringify({ via: "night" }),
    },
  ];
  const result = lastNightReport(actions, 3, [deadKane, lecter]);
  assert.deepEqual(result.leaveIds, ["k"]);
});

function cuff(target: string, day = 1) {
  return { actionType: "handcuffs", dayNumber: day, phase: "day_discussion", targetPlayerId: target };
}

test("Handcuffs on Watson ignores that save the following night", () => {
  const result = resolveNight(
    [act("mafiaShot", villager.id), act("watson", villager.id), cuff(watson.id)],
    [villager, watson],
    1,
  );
  assert.deepEqual(result.leaveIds, [villager.id]);
  assert.equal(result.notes.some((note) => /handcuffs disabled watson/i.test(note)), true);
});

test("Handcuffs on the Godfather ignores the mafia shot", () => {
  const godfather = player("g", "godfather", "mafia");
  const result = resolveNight(
    [act("mafiaShot", villager.id), act("watson", villager.id), cuff(godfather.id)],
    [villager, watson, godfather],
    1,
  );
  assert.deepEqual(result.leaveIds, []);
  assert.equal(result.notes.some((note) => /handcuffs disabled the godfather/i.test(note)), true);
});

test("Handcuffs can disable Matador, so Matador's block does not apply", () => {
  const result = resolveNight(
    [act("mafiaShot", villager.id), act("watson", villager.id), act("matador", watson.id), cuff(matador.id)],
    [villager, watson, matador],
    1,
  );
  assert.deepEqual(result.leaveIds, []);
  assert.equal(result.notes.some((note) => /handcuffs disabled matador/i.test(note)), true);
  assert.equal(result.notes.some((note) => /matador blocked watson/i.test(note)), false);
});

test("Handcuffs can disable an independent night action", () => {
  const result = resolveNight(
    [act("zodiac", villager.id, 2), cuff(zodiac.id, 2)],
    [zodiac, villager],
    2,
  );
  assert.deepEqual(result.leaveIds, []);
  assert.equal(result.notes.some((note) => /handcuffs disabled zodiac/i.test(note)), true);
});

test("Handcuffs and Matador can disable two different players the same night", () => {
  const result = resolveNight(
    [
      act("mafiaShot", villager.id),
      act("watson", villager.id),
      act("zodiac", lecter.id),
      act("matador", watson.id),
      cuff(zodiac.id),
    ],
    [villager, watson, matador, zodiac, lecter],
    1,
  );
  assert.deepEqual(result.leaveIds, [villager.id]);
  assert.equal(result.notes.some((note) => /matador blocked watson/i.test(note)), true);
  assert.equal(result.notes.some((note) => /handcuffs disabled zodiac/i.test(note)), true);
});

test("Handcuffs on Kane last night prevents the delayed leave", () => {
  const kane = player("k", "kane", "citizen");
  const result = resolveNight(
    [act("kane", lecter.id, 1), cuff(kane.id, 1)],
    [kane, lecter],
    2,
  );
  assert.deepEqual(result.leaveIds, []);
});

