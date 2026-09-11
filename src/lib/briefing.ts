import { DEALABLE_ROLES } from "./catalog";
import type { Lang } from "./i18n";

export function displayScenarioName(
  scenario: { name: string; nameEn: string },
  slug: string,
  lang: Lang,
) {
  const suffix = ` · ${slug}`;
  const en = scenario.nameEn.endsWith(suffix)
    ? scenario.nameEn.slice(0, -suffix.length)
    : scenario.nameEn;
  if (lang === "fa") return scenario.name.trim() || en;
  return en.trim() || scenario.name;
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
