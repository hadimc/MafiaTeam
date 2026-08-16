"use client";

import { useLang } from "@/lib/lang";
import { Panel } from "@/components/ui";
import { NarratorNav } from "@/components/NarratorNav";
import { phaseLabel } from "@/lib/scenario";

export function NarratorHistory({
  game,
}: {
  game: {
    actions: { id: string; dayNumber: number; phase: string; message: string; messageEn: string }[];
  };
}) {
  const { t, lang } = useLang();
  return (
    <div className="flex flex-1 flex-col gap-4">
      <header>
        <h1 className="display text-2xl">{t("history")}</h1>
      </header>
      <Panel className="space-y-3">
        {game.actions.length === 0 ? <p className="text-muted">{t("noGame")}</p> : null}
        {game.actions.map((entry) => (
          <div key={entry.id} className="border-b border-line/70 pb-3 last:border-0 last:pb-0">
            <p className="text-[11px] uppercase tracking-[0.18em] text-muted">
              {t("day")} {entry.dayNumber} · {phaseLabel(entry.phase, lang)}
            </p>
            <p className="mt-1">{lang === "en" ? entry.messageEn : entry.message}</p>
          </div>
        ))}
      </Panel>
      <NarratorNav current="history" />
    </div>
  );
}
