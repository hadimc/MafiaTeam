import assert from "node:assert/strict";
import test from "node:test";
import { briefingRoles, briefingPlayerCount, displayScenarioName, lockInBriefingRoles } from "./briefing";
import { hasFinalizedScenario } from "./stats";
import { canManageEventScenario } from "./roster";

test("hasFinalizedScenario is true from lock-in through the finished night", () => {
  assert.equal(hasFinalizedScenario("scenario_finalized"), true);
  assert.equal(hasFinalizedScenario("roles_assigned"), true);
  assert.equal(hasFinalizedScenario("in_progress"), true);
  assert.equal(hasFinalizedScenario("finished"), true);
  assert.equal(hasFinalizedScenario("scenario_pending"), false);
  assert.equal(hasFinalizedScenario("registration_open"), false);
});

test("displayScenarioName strips the uniqueness slug in English", () => {
  const scenario = {
    name: "۱۰ نفره — پدرخوانده و جک",
    nameEn: "Friday Mafia · 10 attendees — Godfather & Jack · friday-night",
  };
  assert.equal(
    displayScenarioName(scenario, "friday-night", "en"),
    "Friday Mafia · 10 attendees — Godfather & Jack",
  );
  assert.equal(displayScenarioName(scenario, "friday-night", "fa"), "۱۰ نفره — پدرخوانده و جک");
});

test("briefingRoles keeps only positive quantities in catalog order", () => {
  const roles = briefingRoles([
    { key: "villager", quantity: 2 },
    { key: "godfather", quantity: 1 },
    { key: "lecter", quantity: 0 },
    { key: "watson", quantity: 1 },
  ]);
  assert.deepEqual(
    roles.map((role) => role.key),
    ["watson", "villager", "godfather"],
  );
});

test("admins can finalize a scenario without attending or narrating", () => {
  const event = { narrators: [{ userId: "koorosh" }] };
  assert.equal(canManageEventScenario({ id: "hadi", isAdmin: true }, event), true);
  assert.equal(canManageEventScenario({ id: "hadi", isAdmin: false }, event), false);
  assert.equal(canManageEventScenario({ id: "koorosh", isAdmin: false }, event), true);
});

test("lock-in briefing uses the revised table, not a player-count preset", () => {
  const revised = [
    { key: "godfather", quantity: 1 },
    { key: "saul", quantity: 1 },
    { key: "zodiac", quantity: 1 },
    { key: "villager", quantity: 8 },
  ];
  const locked = lockInBriefingRoles(revised);
  assert.equal(briefingPlayerCount(locked), 11);
  assert.equal(locked.find((role) => role.key === "zodiac")?.quantity, 1);
  assert.equal(locked.some((role) => role.key === "mayor"), false);
  assert.equal(locked.some((role) => role.key === "jack"), false);
});

test("dealt snapshot wins over a later catalog scenario pointer", () => {
  const catalog = [{ key: "mayor", quantity: 1 }, { key: "villager", quantity: 10 }];
  const snapshot = JSON.stringify({
    roles: [
      { key: "godfather", quantity: 1 },
      { key: "zodiac", quantity: 1 },
      { key: "villager", quantity: 5 },
    ],
  });
  const locked = lockInBriefingRoles(catalog, snapshot);
  assert.deepEqual(
    locked.map((role) => role.key),
    ["villager", "godfather", "zodiac"],
  );
});
