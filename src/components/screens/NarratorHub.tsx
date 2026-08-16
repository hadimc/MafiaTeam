"use client";

import { useLang, enName } from "@/lib/lang";
import { Button, FactionPill, SeatAvatar } from "@/components/ui";
import { NarratorNav } from "@/components/NarratorNav";
import { defaultNext, type Phase } from "@/engine";
import { phaseLabel, readSnapshot } from "@/lib/scenario";
import {
  endGameAction,
  setPhaseAction,
  startGameAction,
  undoLastAction,
} from "@/server/actions/games";

export type NarratorGame = {
  id: string;
  currentDay: number;
  currentPhase: string;
  scenarioSnapshot: string;
  winningFaction: string | null;
  event: { title: string; titleEn: string; slug: string };
  players: {
    id: string;
    seatNumber: number;
    roleName: string;
    roleNameEn: string;
    faction: "citizen" | "mafia" | "independent";
    alive: boolean;
    user: { displayName: string; displayNameEn: string };
  }[];
};

export function NarratorHub({ game }: { game: NarratorGame }) {
  const { t } = useLang();
  const living = game.players.filter((p) => p.alive);
  const counts = {
    citizen: living.filter((p) => p.faction === "citizen").length,
    mafia: living.filter((p) => p.faction === "mafia").length,
    independent: living.filter((p) => p.faction === "independent").length,
  };
  const next = defaultNext(game.currentPhase as Phase);
  const snapshot = readSnapshot(game.scenarioSnapshot);
  const name = (p: NarratorGame["players"][0]) => enName(p.user);

  return (
    <div className="flex flex-1 flex-col">
      <header className="mb-5">
        <p className="text-[11px] uppercase tracking-[0.22em] text-gold">
          {game.event.titleEn || game.event.title}
        </p>
        <h1 className="display mt-1 text-2xl font-semibold">
          {t("day")} {game.currentDay}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {phaseLabel(game.currentPhase, "en")} · {snapshot.nameEn || snapshot.name}
        </p>
      </header>

      <div className="mb-5 grid grid-cols-4 gap-2 text-center">
        <Stat label={t("living")} value={living.length} />
        <Stat label={t("citizen")} value={counts.citizen} accent="text-citizen" />
        <Stat label={t("mafia")} value={counts.mafia} accent="text-mafia" />
        <Stat label={t("independent")} value={counts.independent} accent="text-indie" />
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2">
        {game.currentPhase === "lobby" ? (
          <Button onClick={() => startGameAction(game.id)}>{t("startIntro")}</Button>
        ) : next ? (
          <Button onClick={() => setPhaseAction(game.id, next)}>{t("nextPhase")}</Button>
        ) : (
          <Button onClick={() => endGameAction(game.id, "citizen")}>{t("gameOver")}</Button>
        )}
        <Button href={`/games/${game.id}/narrator/night`} variant="ghost">
          {t("startNight")}
        </Button>
        <Button onClick={() => undoLastAction(game.id)} variant="ghost">
          {t("undo")}
        </Button>
        <Button href={`/games/${game.id}/narrator/day`} variant="ghost">
          {t("day")}
        </Button>
      </div>

      {game.winningFaction ? (
        <p className="display mb-4 text-center text-gold">
          {t("winner")}: {game.winningFaction.charAt(0).toUpperCase() + game.winningFaction.slice(1)}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        {game.players.map((player) => (
          <div
            key={player.id}
            className={`flex items-center gap-3 rounded-2xl border border-line bg-card/80 p-3 ${
              player.alive ? "" : "opacity-55"
            }`}
          >
            <SeatAvatar
              name={name(player)}
              seat={player.seatNumber}
              faction={player.faction}
              alive={player.alive}
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{name(player)}</p>
              <p className="truncate text-[11px] text-muted">{player.roleNameEn || player.roleName}</p>
              <div className="mt-1">
                <FactionPill faction={player.faction} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <NarratorNav current="players" />
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card/80 py-3">
      <div className={`text-xl font-semibold ${accent ?? ""}`}>{value}</div>
      <div className="mt-1 text-[10px] uppercase tracking-wide text-muted">{label}</div>
    </div>
  );
}
