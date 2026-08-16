"use client";

import { useState } from "react";
import { useLang } from "@/lib/lang";
import { Button, Panel } from "@/components/ui";
import { NarratorNav } from "@/components/NarratorNav";
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
  const { t, lang } = useLang();
  const snapshot = readSnapshot(game.scenarioSnapshot);
  const order = snapshot.configuration.nightOrder;
  const stepKey = order[game.nightStep] ?? order[order.length - 1];
  const role = snapshot.roles.find((r) => r.key === stepKey);
  const living = game.players.filter((p) => p.alive);
  const [target, setTarget] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const name = (p: Player) =>
    lang === "en" && p.user.displayNameEn ? p.user.displayNameEn : p.user.displayName;

  async function confirm() {
    if (!target) return;
    const res = await recordNightAction(game.id, target);
    setResult(res.result);
    setTarget(null);
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <header>
        <p className="text-xs text-gold">
          {t("night")} · {Math.min(game.nightStep + 1, order.length)}/{order.length}
        </p>
        <h1 className="display text-2xl">{t("currentStep")}</h1>
      </header>

      <Panel className="text-center">
        <p className="display text-3xl">
          {role ? (lang === "en" ? role.nameEn : role.name) : stepKey}
        </p>
        <p className="mt-2 text-muted">{t("chooseTarget")}</p>
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
            className={`min-h-14 rounded-2xl border px-3 text-sm ${
              target === player.id ? "border-gold bg-gold/15 text-gold" : "border-line bg-card"
            }`}
          >
            {player.seatNumber}. {name(player)}
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
