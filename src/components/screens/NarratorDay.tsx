"use client";

import { useEffect, useMemo, useState } from "react";
import { useLang, enName } from "@/lib/lang";
import { Button, Panel } from "@/components/ui";
import { NarratorNav } from "@/components/NarratorNav";
import { defenseQualifiers, defenseThreshold } from "@/engine";
import { readSnapshot } from "@/lib/scenario";
import {
  drawExitCardAction,
  eliminatePlayerAction,
  randomizeTieAction,
  setSpeakerAction,
  setVoteAction,
} from "@/server/actions/games";

type Player = {
  id: string;
  seatNumber: number;
  alive: boolean;
  user: { displayName: string; displayNameEn: string };
};

type Game = {
  id: string;
  currentDay: number;
  speakerIndex: number;
  scenarioSnapshot: string;
  players: Player[];
  votes: { voteType: string; dayNumber: number; targetPlayerId: string; count: number }[];
  draws: { playerId: string; cardName: string; cardNameEn: string }[];
};

export function NarratorDay({ game }: { game: Game }) {
  const { t } = useLang();
  const living = useMemo(() => game.players.filter((p) => p.alive), [game.players]);
  const snapshot = readSnapshot(game.scenarioSnapshot);
  const [index, setIndex] = useState(game.speakerIndex);
  const [seconds, setSeconds] = useState(snapshot.configuration.speakSeconds);
  const [running, setRunning] = useState(false);
  const [challenge, setChallenge] = useState(false);
  const [picking, setPicking] = useState(false);
  const [color, setColor] = useState<string | null>(null);
  const [card, setCard] = useState<string | null>(null);

  const speaker = living[index] ?? living[0];
  const next = living[(index + 1) % Math.max(living.length, 1)];
  const name = (p?: Player) => (!p ? "—" : enName(p.user));

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      setSeconds((s) => {
        if (s <= 1) {
          window.clearInterval(id);
          setRunning(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  const duration = challenge ? snapshot.configuration.challengeSeconds : snapshot.configuration.speakSeconds;

  async function go(delta: number) {
    const nextIndex = (index + delta + living.length) % living.length;
    setIndex(nextIndex);
    setSeconds(snapshot.configuration.speakSeconds);
    setChallenge(false);
    setRunning(false);
    await setSpeakerAction(game.id, nextIndex);
  }

  const defenseVotes = game.votes.filter((v) => v.voteType === "defense" && v.dayNumber === game.currentDay);
  const queue = defenseQualifiers(
    living.map((p) => ({
      playerId: p.id,
      count: defenseVotes.find((v) => v.targetPlayerId === p.id)?.count ?? 0,
    })),
    living.length,
  );
  const threshold = defenseThreshold(living.length);
  const remainingCards = snapshot.exitCards.filter((c) => !c.used);
  const lastEliminated = game.players.find((p) => !p.alive);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <header>
        <p className="text-[11px] uppercase tracking-[0.22em] text-gold">{t("introDay")}</p>
        <h1 className="display mt-1 text-2xl font-semibold">{t("currentSpeaker")}</h1>
      </header>

      <Panel className="text-center">
        {challenge ? (
          <p className="mb-2 text-[11px] uppercase tracking-[0.22em] text-mafia">{t("challenge")}</p>
        ) : null}
        <p className="display text-2xl">{name(speaker)}</p>
        <div
          className="timer-ring mx-auto mt-5 grid h-40 w-40 place-items-center rounded-full"
          style={{ ["--p" as string]: `${duration ? (seconds / duration) * 100 : 0}%` }}
        >
          <div className="grid h-[9.25rem] w-[9.25rem] place-items-center rounded-full bg-card">
            <p className="font-mono text-4xl tabular-nums tracking-tight">
              {mm}:{ss}
            </p>
          </div>
        </div>
        <p className="mt-4 text-sm text-muted">
          {t("nextSpeaker")}: {name(next)}
        </p>
      </Panel>

      <div className="grid grid-cols-3 gap-2">
        <Button onClick={() => setRunning((v) => !v)}>{running ? t("pause") : t("start")}</Button>
        <Button
          onClick={() => {
            setSeconds(duration);
            setRunning(false);
          }}
          variant="ghost"
        >
          {t("reset")}
        </Button>
        <Button onClick={() => go(1)} variant="ghost">
          {t("skip")}
        </Button>
        <Button onClick={() => go(-1)} variant="ghost">
          {t("previous")}
        </Button>
        <Button onClick={() => go(1)} variant="ghost">
          {t("next")}
        </Button>
        <Button onClick={() => setPicking(true)} variant="ghost">
          {t("giveChallenge")}
        </Button>
      </div>

      {picking ? (
        <Panel>
          <div className="grid grid-cols-2 gap-2">
            {living.map((player) => (
              <Button
                key={player.id}
                variant="ghost"
                className="min-h-11 text-sm"
                onClick={() => {
                  setChallenge(true);
                  setPicking(false);
                  setSeconds(snapshot.configuration.challengeSeconds);
                  setRunning(true);
                }}
              >
                {name(player)}
              </Button>
            ))}
          </div>
        </Panel>
      ) : null}

      <Panel>
        <h2 className="mb-3 font-semibold">{t("defenseVote")}</h2>
        <p className="mb-3 text-xs text-muted">
          {t("defenseQueue")} · {">"} {threshold}
        </p>
        <div className="space-y-2">
          {living.map((player) => {
            const count = defenseVotes.find((v) => v.targetPlayerId === player.id)?.count ?? 0;
            return (
              <div key={player.id} className="flex items-center justify-between gap-2">
                <span>{name(player)}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="h-10 w-10 rounded-xl border border-line"
                    onClick={() => setVoteAction(game.id, "defense", player.id, count - 1)}
                  >
                    −
                  </button>
                  <span className="w-6 text-center">{count}</span>
                  <button
                    type="button"
                    className="h-10 w-10 rounded-xl border border-line"
                    onClick={() => setVoteAction(game.id, "defense", player.id, count + 1)}
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {queue.length > 0 ? (
          <p className="mt-3 text-sm text-gold">
            {t("defenseQueue")}:{" "}
            {queue
              .map((q) => name(living.find((p) => p.id === q.playerId)))
              .join(" · ")}
          </p>
        ) : null}
      </Panel>

      <Panel>
        <h2 className="mb-3 font-semibold">{t("markEliminated")}</h2>
        <div className="grid grid-cols-2 gap-2">
          {living.map((player) => (
            <Button
              key={player.id}
              variant="danger"
              className="min-h-11 text-sm"
              onClick={() => eliminatePlayerAction(game.id, player.id, "day_vote")}
            >
              {name(player)}
            </Button>
          ))}
        </div>
      </Panel>

      <Panel>
        <h2 className="mb-3 font-semibold">{t("randomize")}</h2>
        <Button
          variant="ghost"
          onClick={async () => {
            const result = await randomizeTieAction(game.id);
            setColor(result.color);
          }}
        >
          {t("red")} / {t("blue")} {color ? `→ ${color === "red" ? t("red") : t("blue")}` : ""}
        </Button>
      </Panel>

      <Panel>
        <h2 className="mb-3 font-semibold">{t("exitCard")}</h2>
        <div className="grid grid-cols-5 gap-2">
          {remainingCards.map((c, i) => (
            <button
              key={c.key}
              type="button"
              className="playing-card card-pattern min-h-16 rounded-xl text-sm font-semibold text-gold"
              onClick={async () => {
                const result = await drawExitCardAction(game.id, c.id);
                if (result.card) setCard(result.card.nameEn || result.card.name);
              }}
            >
              {i + 1}
            </button>
          ))}
        </div>
        {card ? <p className="display mt-3 text-center text-gold">{card}</p> : null}
      </Panel>

      <NarratorNav current="day" />
    </div>
  );
}
