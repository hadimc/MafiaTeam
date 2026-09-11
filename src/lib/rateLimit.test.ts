import assert from "node:assert/strict";
import test from "node:test";
import { hitRateLimit } from "./rateLimit";

test("rate limit allows up to max hits inside the window", () => {
  const key = `test:${Date.now()}:${Math.random()}`;
  assert.equal(hitRateLimit(key, 60_000, 2), false);
  assert.equal(hitRateLimit(key, 60_000, 2), false);
  assert.equal(hitRateLimit(key, 60_000, 2), true);
});

test("rate limit is isolated per key", () => {
  const stamp = `${Date.now()}:${Math.random()}`;
  assert.equal(hitRateLimit(`a:${stamp}`, 60_000, 1), false);
  assert.equal(hitRateLimit(`b:${stamp}`, 60_000, 1), false);
  assert.equal(hitRateLimit(`a:${stamp}`, 60_000, 1), true);
});
