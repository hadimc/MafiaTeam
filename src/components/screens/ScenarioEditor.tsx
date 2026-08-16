"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/lang";
import { Button, fieldClass } from "@/components/ui";
import { CATALOG_ROLES, maxQuantity, playerCount } from "@/lib/catalog";
import {
  createScenarioAction,
  deleteScenarioAction,
  updateScenarioAction,
} from "@/server/actions/scenarios";

type ScenarioPayload = {
  id: string;
  nameEn: string;
  descriptionEn: string;
  narratorCount: number;
  eventCount: number;
  roles: { key: string; quantity: number }[];
};

function initialQty(scenario?: ScenarioPayload) {
  const qty: Record<string, number> = {};
  for (const role of CATALOG_ROLES) qty[role.key] = 0;
  qty.host = 1;
  if (!scenario) return qty;
  qty.host = scenario.narratorCount >= 1 ? 1 : 0;
  qty.assistant = scenario.narratorCount >= 2 ? 1 : 0;
  for (const role of scenario.roles) qty[role.key] = role.quantity;
  return qty;
}

export function ScenarioEditor({ scenario }: { scenario?: ScenarioPayload }) {
  const { t } = useLang();
  const router = useRouter();
  const [qty, setQty] = useState(() => initialQty(scenario));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const narrators = Math.min(2, Math.max(0, (qty.host ?? 0) + (qty.assistant ?? 0)));
  const players = playerCount(qty);
  const attendees = narrators + players;
  const canSave = Boolean(attendees) && players > 0 && narrators >= 1;

  function setRole(key: string, next: number) {
    const max = maxQuantity(key);
    let value = Math.min(max, Math.max(0, next));
    const nextQty = { ...qty, [key]: value };
    const nextNarrators = (nextQty.host ?? 0) + (nextQty.assistant ?? 0);
    if (nextNarrators < 1) return;
    setQty(nextQty);
  }

  async function submit(formData: FormData) {
    setError(null);
    setBusy(true);
    if (scenario) {
      const result = await updateScenarioAction(scenario.id, formData);
      setBusy(false);
      if ("error" in result) {
        if (result.error === "exists") setError(t("scenarioExists"));
        else if (result.error === "missing") setError(t("scenarioName"));
        else if (result.error === "roles") setError(t("needRoles"));
        return;
      }
      router.push("/admin/scenarios");
      return;
    }
    const result = await createScenarioAction(formData);
    setBusy(false);
    if ("error" in result) {
      if (result.error === "exists") setError(t("scenarioExists"));
      else if (result.error === "missing") setError(t("scenarioName"));
      else if (result.error === "roles") setError(t("needRoles"));
      return;
    }
    router.push("/admin/scenarios");
  }

  async function remove() {
    if (!scenario) return;
    if (scenario.eventCount > 0) {
      setError(t("scenarioInUse"));
      return;
    }
    if (!window.confirm(t("deleteScenario"))) return;
    setBusy(true);
    const result = await deleteScenarioAction(scenario.id);
    setBusy(false);
    if (result?.error === "in_use") setError(t("scenarioInUse"));
    else router.push("/admin/scenarios");
  }

  const rows = useMemo(() => CATALOG_ROLES, []);

  return (
    <div className="flex flex-1 flex-col gap-5">
      <Button href="/admin/scenarios" variant="ghost" className="w-auto self-start min-h-10 px-3 text-sm">
        {t("back")}
      </Button>

      <header className="text-center">
        <h1 className="display text-3xl font-semibold">{t("characters")}</h1>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">{t("charactersHint")}</p>
      </header>

      <form action={submit} className="flex flex-col gap-4">
        <label className="text-sm text-muted">{t("scenarioName")}</label>
        <input
          name="nameEn"
          required
          defaultValue={scenario?.nameEn ?? ""}
          placeholder="14 attendees — Detective for Kane"
          className={fieldClass}
        />
        <label className="text-sm text-muted">{t("scenarioNotes")}</label>
        <textarea
          name="notes"
          defaultValue={scenario?.descriptionEn ?? ""}
          rows={2}
          className={`${fieldClass} h-auto py-3`}
        />

        <div className="space-y-2">
          {rows.map((role) => (
            <div
              key={role.key}
              className="flex items-center justify-between gap-3 rounded-2xl bg-bg-elev px-4 py-3.5"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">{role.nameEn}</p>
                <p className="truncate text-[11px] text-muted">{role.summaryEn}</p>
              </div>
              <Stepper value={qty[role.key] ?? 0} onChange={(n) => setRole(role.key, n)} max={maxQuantity(role.key)} />
              <input type="hidden" name={`qty_${role.key}`} value={qty[role.key] ?? 0} />
            </div>
          ))}
        </div>

        <p className="text-center text-sm text-muted">
          {players} {t("players").toLowerCase()} · {narrators} {t("narrators").toLowerCase()} · {attendees}{" "}
          {t("attendees").toLowerCase()}
        </p>
        {error ? <p className="text-center text-sm text-mafia">{error}</p> : null}
        <Button type="submit" disabled={busy || !canSave}>
          {t("save")}
        </Button>
        {scenario ? (
          <Button type="button" variant="danger" disabled={busy} onClick={remove}>
            {t("deleteScenario")}
          </Button>
        ) : null}
      </form>
    </div>
  );
}

function Stepper({
  value,
  onChange,
  max,
}: {
  value: number;
  onChange: (n: number) => void;
  max: number;
}) {
  const btn =
    "flex h-9 w-9 items-center justify-center rounded-full text-lg text-muted disabled:opacity-25";
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button type="button" className={btn} disabled={value <= 0} onClick={() => onChange(value - 1)} aria-label="Decrease">
        −
      </button>
      <span className="min-w-7 text-center text-lg font-semibold text-gold">{value}</span>
      <button type="button" className={btn} disabled={value >= max} onClick={() => onChange(value + 1)} aria-label="Increase">
        +
      </button>
    </div>
  );
}
