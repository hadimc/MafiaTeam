"use client";

import { useLang } from "@/lib/lang";
import { Button, Panel } from "@/components/ui";

export function AdminScenarios({
  scenarios,
}: {
  scenarios: {
    id: string;
    name: string;
    nameEn: string;
    supportedPlayerCount: number;
    roles: { name: string; nameEn: string; quantity: number; nightOrder: number }[];
  }[];
}) {
  const { t, lang } = useLang();
  return (
    <div className="flex flex-1 flex-col gap-4">
      <Button href="/admin" variant="ghost" className="w-auto self-start min-h-10 px-3 text-sm">
        {t("back")}
      </Button>
      <h1 className="display text-2xl">{t("scenarios")}</h1>
      {scenarios.map((scenario) => (
        <Panel key={scenario.id} className="space-y-3">
          <h2 className="text-lg font-semibold">
            {lang === "en" ? scenario.nameEn : scenario.name}
          </h2>
          <p className="text-sm text-muted">{scenario.supportedPlayerCount}</p>
          <ol className="space-y-2">
            {scenario.roles
              .slice()
              .sort((a, b) => a.nightOrder - b.nightOrder)
              .map((role, i) => (
                <li key={`${role.name}-${i}`} className="rounded-xl bg-bg px-3 py-2">
                  {role.quantity}× {lang === "en" ? role.nameEn : role.name}
                </li>
              ))}
          </ol>
        </Panel>
      ))}
    </div>
  );
}
