import assert from "node:assert/strict";
import test from "node:test";
import { parseConfig } from "@/engine";
import {
  parseZodiacForm,
  zodiacConfigFields,
  zodiacDescription,
  zodiacRulesFromConfig,
  zodiacShootsOnNight,
} from "./zodiac";

test("default Zodiac rules match the classic table: immortal, even nights, Watson curse", () => {
  const rules = zodiacRulesFromConfig(parseConfig("{}"));
  assert.deepEqual(rules, { mortality: "immortal", shootNights: "even", cursedRole: "watson" });
});

test("empty cursed role means no misfire target", () => {
  const rules = zodiacRulesFromConfig(parseConfig(JSON.stringify({ zodiacCursedRole: "" })));
  assert.equal(rules.cursedRole, null);
});

test("Zodiac shooting nights: even, odd, or every night after intro", () => {
  assert.equal(zodiacShootsOnNight(0, "even"), false);
  assert.equal(zodiacShootsOnNight(1, "even"), false);
  assert.equal(zodiacShootsOnNight(2, "even"), true);
  assert.equal(zodiacShootsOnNight(1, "odd"), true);
  assert.equal(zodiacShootsOnNight(2, "odd"), false);
  assert.equal(zodiacShootsOnNight(1, "all"), true);
  assert.equal(zodiacShootsOnNight(2, "all"), true);
  assert.equal(zodiacShootsOnNight(0, "all"), false);
});

test("zodiacConfigFields writes the scenario JSON keys", () => {
  assert.deepEqual(
    zodiacConfigFields({ mortality: "one_shield", shootNights: "odd", cursedRole: null }),
    { zodiacMortality: "one_shield", zodiacShootNights: "odd", zodiacCursedRole: null },
  );
});

test("form parse accepts the three house-rule fields", () => {
  const data = new FormData();
  data.set("zodiacMortality", "one_shield");
  data.set("zodiacShootNights", "odd");
  data.set("zodiacCursedRole", "detective");
  assert.deepEqual(parseZodiacForm(data), {
    mortality: "one_shield",
    shootNights: "odd",
    cursedRole: "detective",
  });
});

test("role card copy follows the chosen house rules", () => {
  const even = zodiacDescription({ mortality: "immortal", shootNights: "even", cursedRole: "watson" }, "en");
  assert.match(even, /even nights/i);
  assert.match(even, /watson/i);
  const open = zodiacDescription({ mortality: "no_shield", shootNights: "all", cursedRole: null }, "en");
  assert.match(open, /every night/i);
  assert.match(open, /no cursed role/i);
  assert.match(open, /no night shield/i);
});
