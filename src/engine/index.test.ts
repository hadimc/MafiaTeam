import assert from "node:assert/strict";
import test from "node:test";
import { assignRoles, shuffle, type RoleDef } from "./index";

function role(key: string, quantity = 1): RoleDef {
  return {
    key,
    name: key,
    nameEn: key,
    faction: key === "godfather" ? "mafia" : "citizen",
    description: "",
    descriptionEn: "",
    quantity,
    nightOrder: 0,
  };
}

test("shuffle does not mutate the source list", () => {
  const source = ["c", "a", "b"];
  shuffle(source, () => 0);
  assert.deepEqual(source, ["c", "a", "b"]);
});

test("shuffle is not a name sort — identity swaps keep input order", () => {
  const keep = (maxExclusive: number) => maxExclusive - 1;
  assert.deepEqual(shuffle(["zack", "aaron", "mia"], keep), ["zack", "aaron", "mia"]);
  assert.deepEqual(shuffle(["aaron", "zack", "mia"], keep), ["aaron", "zack", "mia"]);
});

test("assignRoles does not sort players by name or id", () => {
  const keep = (maxExclusive: number) => maxExclusive - 1;
  const dealt = assignRoles(["zack", "aaron"], [role("godfather"), role("watson")], keep);
  const byUser = Object.fromEntries(dealt.map((row) => [row.userId, row.role.key]));
  assert.equal(byUser.zack, "godfather");
  assert.equal(byUser.aaron, "watson");
  assert.equal(dealt[0]?.seatNumber, 1);
  assert.equal(dealt[0]?.userId, "zack");
});

test("live deals are uniform and ignore registration / name order", () => {
  const roles = [role("godfather"), role("watson"), role("villager")];
  const trials = 9000;
  const orders = [
    ["aaron", "mia", "zack"],
    ["zack", "mia", "aaron"],
  ] as const;

  for (const players of orders) {
    const counts = Object.fromEntries(players.map((id) => [id, { godfather: 0, watson: 0, villager: 0 }]));
    for (let i = 0; i < trials; i++) {
      const dealt = assignRoles([...players], roles);
      for (const row of dealt) {
        counts[row.userId][row.role.key as "godfather" | "watson" | "villager"] += 1;
      }
    }
    const expected = trials / 3;
    for (const id of players) {
      for (const key of ["godfather", "watson", "villager"] as const) {
        const seen = counts[id][key];
        const chi = ((seen - expected) ** 2) / expected;
        assert.equal(
          chi < 12,
          true,
          `${id} ${key} on ${players.join(">")} got ${seen}, expected ~${expected}`,
        );
      }
    }
  }
});
