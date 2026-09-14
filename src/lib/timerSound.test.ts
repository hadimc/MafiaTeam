import assert from "node:assert/strict";
import test from "node:test";
import { timerCue } from "./timerSound";

test("timer stays quiet until the last ten seconds", () => {
  assert.equal(timerCue(60, 59), "none");
  assert.equal(timerCue(11, 11), "none");
});

test("last ten seconds tick, last three snap, zero buzzes", () => {
  assert.equal(timerCue(11, 10), "tick");
  assert.equal(timerCue(5, 4), "tick");
  assert.equal(timerCue(4, 3), "urgent");
  assert.equal(timerCue(2, 1), "urgent");
  assert.equal(timerCue(1, 0), "buzz");
});
