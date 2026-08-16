"use client";

import { useState } from "react";
import { useLang, enName } from "@/lib/lang";
import { Button, Panel, SeatAvatar } from "@/components/ui";
import { NarratorNav } from "@/components/NarratorNav";
import { nightStepLabel } from "@/lib/catalog";
import { readSnapshot } from "@/lib/scenario";
import { recordNightAction, setPhaseAction } from "@/server/actions/games";

type Player = {
  id: string;
  seatNumber: number;
  alive: boolean;
  user: { displayName: string; displayNameEn: string };
};

export function NarratorNight({
  game,
}: {
  game: {
    id: string;
    nightStep: number;
    currentPhase: string;
    scenarioSnapshot: string;
    players: Player[];
  };
}) {
  const { t } = useLang();
  const snapshot = readSnapshot(game.scenarioSnapshot);
  const order = snapshot.configuration.nightOrder;
  const stepKey = order[game.nightStep] ?? order[order.length - 1];
  const role = snapshot.roles.find((r) => r.key === stepKey);
  const living = game.players.filter((p) => p.alive);
  const [target, setTarget] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const name = (p: Player) => enName(p.user);

  async function confirm() {
    if (!target) return;
    const res = await recordNightAction(game.id, target);
    setResult(res.result);
    setTarget(null);
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <header>
        <p className="text-[11px] uppercase tracking-[0.22em] text-gold">
          {t("night")} · {Math.min(game.nightStep + 1, order.length)}/{order.length}
        </p>
        <h1 className="display mt-1 text-2xl font-semibold">{t("currentStep")}</h1>
      </header>

      <Panel className="relative overflow-hidden text-center">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(88,28,135,0.18),transparent_55%)]" />
        <p className="relative display text-3xl text-gold">
          {role ? role.nameEn || role.name : nightStepLabel(stepKey)}
        </p>
        <p className="relative mt-2 text-sm text-muted">{t("chooseTarget")}</p>
      </Panel>

      <div className="grid grid-cols-2 gap-2">
        {living.map((player) => (
          <button
            key={player.id}
            type="button"
            onClick={() => {
              setTarget(player.id);
              setResult(null);
            }}
            className={`flex min-h-16 items-center gap-3 rounded-2xl border px-3 text-start text-sm ${
              target === player.id ? "border-gold bg-gold/10 text-gold" : "border-line bg-card"
            }`}
          >
            <SeatAvatar name={name(player)} seat={player.seatNumber} />
            {name(player)}
          </button>
        ))}
      </div>

      {target ? <Button onClick={confirm}>{t("confirm")}</Button> : null}

      {result ? (
        <Panel className="text-center">
          <p className="text-sm text-muted">{t("result")}</p>
          <p className="display mt-1 text-3xl text-gold">
            {result === "positive" ? t("positive") : result === "negative" ? t("negative") : t("confirm")}
          </p>
          {game.currentPhase !== "night" ? (
            <Button className="mt-4" onClick={() => setPhaseAction(game.id, "morning_report")}>
              {t("nextPhase")}
            </Button>
          ) : null}
        </Panel>
      ) : null}

      <NarratorNav current="night" />
    </div>
  );
}
