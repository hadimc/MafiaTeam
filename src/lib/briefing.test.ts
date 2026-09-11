import assert from "node:assert/strict";
import test from "node:test";
import { briefingRoles, displayScenarioName } from "./briefing";
import { hasFinalizedScenario } from "./stats";

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
