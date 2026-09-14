"use client";

import { DEALABLE_ROLES } from "@/lib/catalog";
import { fieldClass } from "@/components/ui";
import { useLang } from "@/lib/lang";
import type { ZodiacRules } from "@/lib/zodiac";

export function ZodiacRulesFields({
  qty,
  value,
  onChange,
}: {
  qty: Record<string, number>;
  value: ZodiacRules;
  onChange: (next: ZodiacRules) => void;
}) {
  const { t } = useLang();
  if ((qty.zodiac ?? 0) < 1) return null;
  const cursedChoices = DEALABLE_ROLES.filter((role) => role.key !== "zodiac");
  return (
    <div className="space-y-3 rounded-2xl border border-line bg-bg-elev px-4 py-3.5">
      <h3 className="font-medium">{t("zodiacRules")}</h3>
      <p className="text-[12px] text-muted">{t("zodiacRulesHint")}</p>
      <label className="block text-sm">
        <span className="mb-1 block text-muted">{t("zodiacMortality")}</span>
        <select
          className={fieldClass}
          name="zodiacMortality"
          value={value.mortality}
          onChange={(e) => onChange({ ...value, mortality: e.target.value as ZodiacRules["mortality"] })}
        >
          <option value="immortal">{t("zodiacImmortal")}</option>
          <option value="one_shield">{t("zodiacOneShield")}</option>
          <option value="no_shield">{t("zodiacNoShield")}</option>
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-muted">{t("zodiacShootNights")}</span>
        <select
          className={fieldClass}
          name="zodiacShootNights"
          value={value.shootNights}
          onChange={(e) => onChange({ ...value, shootNights: e.target.value as ZodiacRules["shootNights"] })}
        >
          <option value="all">{t("zodiacAllNights")}</option>
          <option value="odd">{t("zodiacOddNights")}</option>
          <option value="even">{t("zodiacEvenNights")}</option>
        </select>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block text-muted">{t("zodiacCursedTarget")}</span>
        <select
          className={fieldClass}
          name="zodiacCursedRole"
          value={value.cursedRole ?? ""}
          onChange={(e) => onChange({ ...value, cursedRole: e.target.value || null })}
        >
          <option value="">{t("zodiacCursedNone")}</option>
          {cursedChoices.map((role) => (
            <option key={role.key} value={role.key}>
              {role.nameEn}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}
