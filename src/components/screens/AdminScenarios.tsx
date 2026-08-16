"use client";

import Link from "next/link";
import { useLang } from "@/lib/lang";
import { Button, Panel } from "@/components/ui";

type ScenarioRow = {
  id: string;
  name: string;
  nameEn: string;
  attendeeCount: number;
  narratorCount: number;
  supportedPlayerCount: number;
  eventCount: number;
  roles: { name: string; nameEn: string; quantity: number }[];
};

export function AdminScenarios({ scenarios }: { scenarios: ScenarioRow[] }) {
  const { t } = useLang();
  const groups = new Map<number, ScenarioRow[]>();
  for (const scenario of scenarios) {
    const list = groups.get(scenario.attendeeCount) ?? [];
    list.push(scenario);
    groups.set(scenario.attendeeCount, list);
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="display text-2xl font-semibold">{t("scenarios")}</h1>
        <Button href="/admin/scenarios/new" className="w-auto min-h-10 px-4 text-sm">
          {t("newScenario")}
        </Button>
      </div>
      {[...groups.entries()].map(([count, rows]) => (
        <section key={count} className="space-y-2">
          <p className="text-[11px] uppercase tracking-[0.18em] text-gold">
            {count} {t("attendees").toLowerCase()}
          </p>
          {rows.map((scenario) => (
            <Link key={scenario.id} href={`/admin/scenarios/${scenario.id}`}>
              <Panel className="space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="display text-base font-semibold leading-snug">
                    {scenario.nameEn || scenario.name}
                  </h2>
                  {scenario.eventCount > 0 ? (
                    <span className="shrink-0 text-[11px] text-gold">{scenario.eventCount} nights</span>
                  ) : null}
                </div>
                <p className="text-xs text-muted">
                  {scenario.narratorCount} {t("narrators").toLowerCase()} · {scenario.supportedPlayerCount}{" "}
                  {t("players").toLowerCase()}
                </p>
                <p className="text-sm leading-relaxed text-ink/90">
                  {scenario.roles
                    .filter((role) => role.quantity > 0)
                    .map((role) => `${role.quantity}× ${role.nameEn || role.name}`)
                    .join(" · ")}
                </p>
              </Panel>
            </Link>
          ))}
        </section>
      ))}
    </div>
  );
}
