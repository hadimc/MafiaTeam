import assert from "node:assert/strict";
import test from "node:test";
import { playerCount, SCENARIO_PRESETS, scenariosMatchingPlayerCount } from "./catalog";

const catalog = SCENARIO_PRESETS.map((preset) => ({
  ...preset,
  supportedPlayerCount: playerCount(preset.roles),
}));

test("suggestions match seated players, not attendees or narrators", () => {
  // 13 attendees, 2 narrators → 11 players → the 12-attendee / 1-narrator Mayor table
  const matches = scenariosMatchingPlayerCount(catalog, 11);
  assert.deepEqual(
    matches.map((scenario) => scenario.nameEn),
    ["12 attendees — Mayor"],
  );
  assert.equal(
    matches.some((scenario) => scenario.attendeeCount === 13),
    false,
  );
});

test("13 seated players matches both one- and two-narrator tables with that player count", () => {
  const matches = scenariosMatchingPlayerCount(catalog, 13);
  assert.deepEqual(
    matches.map((scenario) => scenario.nameEn),
    ["14 attendees — Detective for Kane", "15 attendees — Two narrators"],
  );
});
