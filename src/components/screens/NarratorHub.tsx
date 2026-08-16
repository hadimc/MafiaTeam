"use client";

import { useLang } from "@/lib/lang";
import { Button, FactionPill, Panel } from "@/components/ui";
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
  const { t, lang } = useLang();
  const living = game.players.filter((p) => p.alive);
  const counts = {
    citizen: living.filter((p) => p.faction === "citizen").length,
    mafia: living.filter((p) => p.faction === "mafia").length,
    independent: living.filter((p) => p.faction === "independent").length,
  };
  const next = defaultNext(game.currentPhase as Phase);
  const snapshot = readSnapshot(game.scenarioSnapshot);
  const name = (p: NarratorGame["players"][0]) =>
    lang === "en" && p.user.displayNameEn ? p.user.displayNameEn : p.user.displayName;

  return (
    <div className="flex flex-1 flex-col">
      <header className="mb-4">
        <p className="text-xs text-gold">{lang === "en" ? game.event.titleEn : game.event.title}</p>
        <h1 className="display text-2xl">
          {t("day")} {game.currentDay} — {phaseLabel(game.currentPhase, lang)}
        </h1>
        <p className="text-xs text-muted">{lang === "en" ? snapshot.nameEn : snapshot.name}</p>
      </header>

      <div className="mb-4 grid grid-cols-4 gap-2 text-center">
        <Stat label={t("living")} value={living.length} />
        <Stat label={t("citizen")} value={counts.citizen} />
        <Stat label={t("mafia")} value={counts.mafia} />
        <Stat label={t("independent")} value={counts.independent} />
      </div>

      <div className="mb-4 grid grid-cols-2 gap-2">
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
        <p className="mb-3 text-center text-gold">
          {t("winner")}: {game.winningFaction}
        </p>
      ) : null}

      <Panel className="flex-1 overflow-hidden p-0">
        <table className="w-full text-sm">
          <thead className="text-muted">
            <tr className="border-b border-line">
              <th className="px-3 py-2 text-start font-normal">{t("seat")}</th>
              <th className="px-3 py-2 text-start font-normal">{t("players")}</th>
              <th className="px-3 py-2 text-start font-normal">{t("revealRole")}</th>
              <th className="px-3 py-2 text-start font-normal">{t("status")}</th>
            </tr>
          </thead>
          <tbody>
            {game.players.map((player) => (
              <tr key={player.id} className="border-b border-line/60 last:border-0">
                <td className="px-3 py-2 text-muted">{player.seatNumber}</td>
                <td className="px-3 py-2 font-medium">{name(player)}</td>
                <td className="px-3 py-2">
                  <div className="flex flex-col gap-1">
                    <span>{lang === "en" ? player.roleNameEn : player.roleName}</span>
                    <FactionPill faction={player.faction} />
                  </div>
                </td>
                <td className={`px-3 py-2 ${player.alive ? "text-citizen" : "text-muted line-through"}`}>
                  {player.alive ? t("alive") : t("eliminated")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <NarratorNav current="players" />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-line bg-card py-3">
      <div className="display text-xl">{value}</div>
      <div className="mt-1 text-[10px] text-muted">{label}</div>
    </div>
  );
}
