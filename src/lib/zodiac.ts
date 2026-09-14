import type { ScenarioConfig } from "@/engine";
import { CATALOG_BY_KEY } from "./catalog";

export type { ZodiacMortality, ZodiacShootNights } from "@/engine";
import type { ZodiacMortality, ZodiacShootNights } from "@/engine";

export type ZodiacRules = {
  mortality: ZodiacMortality;
  shootNights: ZodiacShootNights;
  cursedRole: string | null;
};

export const DEFAULT_ZODIAC_RULES: ZodiacRules = {
  mortality: "immortal",
  shootNights: "even",
  cursedRole: "watson",
};

function asMortality(value: unknown): ZodiacMortality {
  return value === "one_shield" || value === "no_shield" || value === "immortal" ? value : "immortal";
}

function asShoot(value: unknown): ZodiacShootNights {
  return value === "all" || value === "odd" || value === "even" ? value : "even";
}

function asCursed(value: unknown): string | null {
  if (value === undefined) return "watson";
  if (value === null || value === "" || value === "none") return null;
  return String(value);
}

export function zodiacRulesFromConfig(config?: Partial<ScenarioConfig> | null): ZodiacRules {
  return {
    mortality: asMortality(config?.zodiacMortality),
    shootNights: asShoot(config?.zodiacShootNights),
    cursedRole: asCursed(config?.zodiacCursedRole),
  };
}

export function zodiacRulesFromSnapshot(raw: string): ZodiacRules {
  try {
    const snap = JSON.parse(raw) as { configuration?: Partial<ScenarioConfig> };
    return zodiacRulesFromConfig(snap.configuration);
  } catch {
    return { ...DEFAULT_ZODIAC_RULES };
  }
}

export function parseZodiacForm(formData: FormData): ZodiacRules {
  return {
    mortality: asMortality(formData.get("zodiacMortality")),
    shootNights: asShoot(formData.get("zodiacShootNights")),
    cursedRole: asCursed(formData.get("zodiacCursedRole")),
  };
}

export function zodiacConfigFields(rules: ZodiacRules) {
  return {
    zodiacMortality: rules.mortality,
    zodiacShootNights: rules.shootNights,
    zodiacCursedRole: rules.cursedRole,
  };
}

export function withZodiacRoleCopy<T extends { key: string; description: string; descriptionEn: string }>(
  roles: T[],
  rules: ZodiacRules,
) {
  if (!roles.some((role) => role.key === "zodiac")) return roles;
  return roles.map((role) =>
    role.key === "zodiac"
      ? { ...role, description: zodiacDescription(rules, "fa"), descriptionEn: zodiacDescription(rules, "en") }
      : role,
  );
}

export function zodiacShootsOnNight(night: number, shootNights: ZodiacShootNights) {
  if (night <= 0) return false;
  if (shootNights === "all") return true;
  if (shootNights === "odd") return night % 2 === 1;
  return night % 2 === 0;
}

function roleLabel(key: string | null, lang: "en" | "fa") {
  if (!key) return null;
  const role = CATALOG_BY_KEY[key];
  if (!role) return key;
  return lang === "fa" ? role.name : role.nameEn;
}

export function zodiacDescription(rules: ZodiacRules, lang: "en" | "fa") {
  const cursed = roleLabel(rules.cursedRole, lang);
  if (lang === "fa") {
    const nights =
      rules.shootNights === "all" ? "هر شب" : rules.shootNights === "odd" ? "شب‌های فرد" : "شب‌های زوج";
    const mortal =
      rules.mortality === "immortal"
        ? "در برابر شلیک شب مافیا و لئون نامیرا است"
        : rules.mortality === "one_shield"
          ? "یک سپر شب دارد؛ شلیک اول را می‌گیرد و بعد آسیب‌پذیر است"
          : "سپر شب ندارد و با شلیک مافیا یا لئون خارج می‌شود";
    const curse = cursed
      ? `اگر به ${cursed} شلیک کند، شلیک خنثی و خودش خارج می‌شود`
      : "نقش نفرین‌شده‌ای ندارد";
    return `در ${nights} بیدار می‌شود و به یک بازیکن شلیک می‌کند. ${mortal}. ${curse}. با رأی روز یا گلوله جنگی تفنگ‌دار هم خارج می‌شود.`;
  }
  const nights =
    rules.shootNights === "all" ? "every night" : rules.shootNights === "odd" ? "odd nights" : "even nights";
  const mortal =
    rules.mortality === "immortal"
      ? "Night-immortal to the Mafia shot and Leon’s shot"
      : rules.mortality === "one_shield"
        ? "Has one night shield; the first night kill is absorbed, then they can leave"
        : "Has no night shield and can be removed by the Mafia shot or Leon";
  const curse = cursed
    ? `Misfiring on ${cursed} cancels the shot and removes the Zodiac instead`
    : "There is no cursed role";
  return `Wakes on ${nights} to shoot one player from either side. ${mortal}. ${curse}. A day vote or the Gunner’s real round still removes them.`;
}
