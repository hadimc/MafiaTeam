import { DEALABLE_ROLES } from "./catalog";
import type { Lang } from "./i18n";

export function peelScenarioLabel(raw: string, slug = "", titles: (string | null | undefined)[] = []) {
  let value = (raw || "").trim();
  if (!value) return "";
  if (slug) {
    const suffix = ` · ${slug}`;
    if (value.endsWith(suffix)) value = value.slice(0, -suffix.length).trim();
  }
  const prefixes = titles.map((title) => (title ?? "").trim()).filter(Boolean);
  let looping = true;
  while (looping) {
    looping = false;
    for (const title of prefixes) {
      const prefix = `${title} · `;
      if (value.startsWith(prefix)) {
        value = value.slice(prefix.length).trim();
        looping = true;
      }
    }
  }
  const parts = value.split(" · ").map((part) => part.trim()).filter(Boolean);
  const unique: string[] = [];
  for (const part of parts) {
    if (unique.at(-1) !== part) unique.push(part);
  }
  while (unique.length > 1 && prefixes.includes(unique[0] ?? "")) unique.shift();
  return unique.join(" · ");
}

export function displayScenarioName(
  scenario: { name: string; nameEn: string },
  slug: string,
  lang: Lang,
  event?: { title?: string; titleEn?: string },
) {
  const titles = [event?.titleEn, event?.title];
  const en = peelScenarioLabel(scenario.nameEn, slug, titles);
  const fa = peelScenarioLabel(scenario.name, slug, titles);
  if (lang === "fa") return fa || en || scenario.name;
  return en || fa || scenario.nameEn;
}


export function briefingRoles<T extends { key: string; quantity: number }>(roles: T[]) {
  const byKey = new Map(roles.filter((role) => role.quantity > 0).map((role) => [role.key, role]));
  const ordered: T[] = [];
  for (const def of DEALABLE_ROLES) {
    const role = byKey.get(def.key);
    if (role) ordered.push(role);
  }
  for (const role of roles) {
    if (role.quantity > 0 && !ordered.some((item) => item.key === role.key)) ordered.push(role);
  }
  return ordered;
}

export function briefingPlayerCount(roles: { quantity: number }[]) {
  return roles.reduce((sum, role) => sum + Math.max(0, role.quantity), 0);
}

/** Roles actually locked in for this night — never a catalog preset for the headcount. */
export function lockInBriefingRoles<T extends { key: string; quantity: number }>(
  scenarioRoles: T[],
  snapshotRaw?: string | null,
) {
  if (snapshotRaw) {
    try {
      const snapshot = JSON.parse(snapshotRaw) as { roles?: T[] };
      if (Array.isArray(snapshot.roles) && snapshot.roles.some((role) => role.quantity > 0)) {
        return briefingRoles(snapshot.roles);
      }
    } catch {
      // Use the event's finalized scenario roles.
    }
  }
  return briefingRoles(scenarioRoles);
}
