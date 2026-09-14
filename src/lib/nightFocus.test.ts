import assert from "node:assert/strict";
import test from "node:test";
import type { NightLine } from "./stages";
import { faceOffCardDrawn, lastCompletedTonightPick, latestNewCompletedType, nextNightFocus, openingDayFocus } from "./nightFocus";

function line(map: Record<string, NightLine> = {}) {
  return (role: string): NightLine => map[role] ?? "skip";
}

const nightTasks = ["jack", "zodiac", "mafia", "town", "nightEnd"];
const town = { watson: "record", leon: "record", kane: "record", detective: "record", constantine: "record", gunner: "record" } as const;

test("after the mafia shot, Citizen opens on Dr. Watson when Lecter and Matador are out of play", () => {
  const next = nextNightFocus("mafiaShot", nightTasks, line({ ...town }));
  assert.deepEqual(next, { task: "town", step: "watson" });
});

test("after the mafia shot, stay in Mafia and go to Lecter when Lecter can act", () => {
  const next = nextNightFocus("mafiaShot", nightTasks, line({ ...town, lecter: "record" }));
  assert.deepEqual(next, { task: "mafia", step: "lecter" });
});

test("after Lecter, go to Matador when Matador can act", () => {
  const next = nextNightFocus("lecter", nightTasks, line({ ...town, lecter: "record", matador: "record" }));
  assert.deepEqual(next, { task: "mafia", step: "matador" });
});

test("after Lecter, open Citizen on Dr. Watson when Matador is not in play", () => {
  const next = nextNightFocus("lecter", nightTasks, line({ ...town, lecter: "record" }));
  assert.deepEqual(next, { task: "town", step: "watson" });
});

test("after Matador, open Citizen on Dr. Watson", () => {
  const next = nextNightFocus("matador", nightTasks, line({ ...town, matador: "record" }));
  assert.deepEqual(next, { task: "town", step: "watson" });
});

test("after a cover Lecter, stay on Lecter so the narrator can still say the line", () => {
  const next = nextNightFocus("mafiaShot", nightTasks, line({ ...town, lecter: "cover" }));
  assert.deepEqual(next, { task: "mafia", step: "lecter" });
});

test("a dead town role still gets a wake stop so the line is said", () => {
  assert.deepEqual(nextNightFocus("mafiaShot", nightTasks, line({ watson: "cover", leon: "record" })), {
    task: "town",
    step: "watson",
  });
  assert.deepEqual(nextNightFocus("watson", nightTasks, line({ watson: "record", leon: "cover", kane: "record" })), {
    task: "town",
    step: "leon",
  });
});

test("sixth sense and purchase advance the same way as the mafia shot", () => {
  assert.deepEqual(nextNightFocus("sixthSense", nightTasks, line({ ...town })), { task: "town", step: "watson" });
  assert.deepEqual(nextNightFocus("saul", nightTasks, line({ ...town })), { task: "town", step: "watson" });
});

test("after Jack, go to Zodiac when that task is in the night", () => {
  assert.deepEqual(nextNightFocus("jack", nightTasks, line({ ...town, jack: "record", zodiac: "record" })), {
    task: "zodiac",
    step: "zodiac",
  });
});

test("after Jack, go to Mafia when Zodiac does not wake", () => {
  assert.deepEqual(nextNightFocus("jack", ["jack", "mafia", "town", "nightEnd"], line({ ...town, jack: "record" })), {
    task: "mafia",
    step: "mafia",
  });
});

test("after Zodiac, go to Mafia", () => {
  assert.deepEqual(nextNightFocus("zodiac", nightTasks, line({ ...town, zodiac: "record" })), {
    task: "mafia",
    step: "mafia",
  });
});

test("town abilities follow wake order and skip roles that are out of play", () => {
  assert.deepEqual(nextNightFocus("watson", nightTasks, line({ ...town })), { task: "town", step: "leon" });
  assert.deepEqual(nextNightFocus("leon", nightTasks, line({ watson: "record", kane: "record", detective: "record" })), {
    task: "town",
    step: "kane",
  });
  assert.deepEqual(nextNightFocus("kane", nightTasks, line({ watson: "record", detective: "record" })), {
    task: "town",
    step: "detective",
  });
  assert.deepEqual(nextNightFocus("constantine", nightTasks, line({ ...town })), { task: "town", step: "gunner" });
  assert.deepEqual(nextNightFocus("gunner", nightTasks, line({ ...town })), { task: "nightEnd", step: "nightEnd" });
});

test("with no pick yet, start on the first night task", () => {
  assert.deepEqual(nextNightFocus(null, nightTasks, line({ jack: "record", ...town })), { task: "jack", step: "jack" });
  assert.deepEqual(nextNightFocus(null, ["mafia", "town", "nightEnd"], line({ ...town })), {
    task: "mafia",
    step: "mafia",
  });
});

test("next day opens at the top of the actions, which is night briefing when present", () => {
  assert.deepEqual(openingDayFocus(["nightBrief", "inquiry", "speak"]), {
    task: "nightBrief",
    step: "nightBrief",
  });
  assert.deepEqual(openingDayFocus(["speak"]), { task: "speak", step: "speak" });
  assert.deepEqual(openingDayFocus([]), null);
});

test("Face-off stays in the list but auto-next skips it unless the exit card was drawn", () => {
  const tasks = ["faceChange", "jack", "mafia", "town", "nightEnd"];
  const lines = line({ jack: "record", ...town });
  assert.deepEqual(nextNightFocus(null, tasks, lines), { task: "jack", step: "jack" });
  assert.deepEqual(nextNightFocus(null, tasks, lines, { faceOffDrawn: false }), { task: "jack", step: "jack" });
  assert.deepEqual(nextNightFocus(null, tasks, lines, { faceOffDrawn: true }), {
    task: "faceChange",
    step: "faceChange",
  });
});

test("after Face-off, continue to Jack even when Face-off remains in the list", () => {
  assert.deepEqual(
    nextNightFocus("faceChange", ["faceChange", "jack", "mafia", "town", "nightEnd"], line({ jack: "record", ...town })),
    { task: "jack", step: "jack" },
  );
});

test("Face-off counts as drawn only from an exit card with key face", () => {
  assert.equal(
    faceOffCardDrawn([{ id: "c", actionType: "exit_card", dayNumber: 1, metadata: JSON.stringify({ key: "handcuffs" }) }]),
    false,
  );
  assert.equal(
    faceOffCardDrawn([{ id: "f", actionType: "exit_card", dayNumber: 1, metadata: JSON.stringify({ key: "face", id: "card-1" }) }]),
    true,
  );
});

test("last completed pick is the latest tonight target, ignoring an unfinished sixth sense", () => {
  const actions = [
    { id: "j", actionType: "jack", dayNumber: 2, phase: "night", targetPlayerId: "p1" },
    { id: "s", actionType: "sixthSense", dayNumber: 2, phase: "night", targetPlayerId: "p2" },
  ];
  assert.equal(lastCompletedTonightPick(actions, 2)?.actionType, "jack");
});

test("sixth sense counts as complete after Correct or Wrong", () => {
  const actions = [
    {
      id: "s",
      actionType: "sixthSense",
      dayNumber: 2,
      phase: "night",
      targetPlayerId: "p2",
      metadata: JSON.stringify({ result: "correct" }),
    },
  ];
  assert.equal(lastCompletedTonightPick(actions, 2)?.actionType, "sixthSense");
});

test("last completed pick ignores other nights and reversed-looking leftovers without a target", () => {
  const actions = [
    { id: "old", actionType: "mafiaShot", dayNumber: 1, phase: "night", targetPlayerId: "p1" },
    { id: "now", actionType: "watson", dayNumber: 2, phase: "night", targetPlayerId: "p3" },
    { id: "empty", actionType: "leon", dayNumber: 2, phase: "night", targetPlayerId: null },
  ];
  assert.equal(lastCompletedTonightPick(actions, 2)?.id, "now");
});

test("correcting an earlier pick does not count as a newly completed type", () => {
  const afterShot = [
    { id: "m1", actionType: "mafiaShot", dayNumber: 1, phase: "night", targetPlayerId: "a" },
    { id: "w1", actionType: "watson", dayNumber: 1, phase: "night", targetPlayerId: "b" },
  ];
  const correctedShot = [
    ...afterShot,
    { id: "m2", actionType: "mafiaShot", dayNumber: 1, phase: "night", targetPlayerId: "c" },
  ];
  assert.deepEqual(latestNewCompletedType(["mafiaShot", "watson"], correctedShot, 1), null);
});

test("the first mafia shot is a newly completed type", () => {
  const actions = [{ id: "m1", actionType: "mafiaShot", dayNumber: 1, phase: "night", targetPlayerId: "a" }];
  assert.equal(latestNewCompletedType([], actions, 1), "mafiaShot");
});
