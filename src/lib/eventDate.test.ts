import assert from "node:assert/strict";
import test from "node:test";
import { parseEventDateInput } from "./eventDate";

test("5pm on a datetime-local field in UTC-6 is stored as 11pm UTC, not 5pm UTC", () => {
  const date = parseEventDateInput("2026-09-27T17:00", 360);
  assert.ok(date);
  assert.equal(date.toISOString(), "2026-09-27T23:00:00.000Z");
});

test("already-UTC ISO values stay the same instant", () => {
  const date = parseEventDateInput("2026-09-27T23:00:00.000Z", 360);
  assert.ok(date);
  assert.equal(date.toISOString(), "2026-09-27T23:00:00.000Z");
});

test("naive datetime without a timezone offset is not assumed to be UTC", () => {
  assert.equal(parseEventDateInput("2026-09-27T17:00"), null);
  assert.equal(parseEventDateInput("2026-09-27T17:00", Number.NaN), null);
});
