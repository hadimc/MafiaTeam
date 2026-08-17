"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang, enName } from "@/lib/lang";
import { Button, FactionPill, Panel, SeatAvatar, StatusPill, fieldClass } from "@/components/ui";
import type { SessionUser } from "@/lib/auth";
import { createEventAction, joinEventAction, leaveEventAction } from "@/server/actions/events";
import { pullDashboardAction } from "@/server/actions/live";
import { useLivePull } from "@/lib/live";
import { asFaction, eventLane, factionLabel, gameOverview, isJoinable, sideLine, type SideWins } from "@/lib/stats";

type Person = { displayName: string; displayNameEn: string };

type GameSummary = {
  id: string;
  status: string;
  currentDay: number;
  winningFaction: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  players: {
    userId: string;
    roleKey: string;
    roleName: string;
    roleNameEn: string;
    roleDescription: string;
    roleDescriptionEn: string;
    faction: string;
    alive: boolean;
  }[];
};

type EventCard = {
  id: string;
  slug: string;
  title: string;
  titleEn: string;
  date: string;
  location: string;
  locationEn: string;
  status: string;
  narrators: { userId: string; user: Person }[];
  registrations: { userId: string }[];
  games: GameSummary[];
};

type PlayerRecord = {
  userId: string;
  name: string;
  played: number;
  wins: number;
  winsBySide: SideWins;
};

function formatWhen(date: string) {
  return new Date(date).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function DashboardView({
  user,
  events,
  stats,
}: {
  user: SessionUser;
  events: EventCard[];
  stats: {
    nights: number;
    clubWins: SideWins;
    me: PlayerRecord;
    table: PlayerRecord[];
  };
}) {
  const { t } = useLang();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState<string | null>(null);
  const pull = useCallback((seen: string) => pullDashboardAction(seen), []);
  useLivePull(pull, true);

  const open = events.filter((event) => eventLane(event.status) === "open");
  const live = events.filter((event) => eventLane(event.status) === "live");
  const past = events
    .filter((event) => eventLane(event.status) === "past")
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  async function create(formData: FormData) {
    setError(null);
    const result = await createEventAction(formData);
    if (result?.error) setError(result.error);
    if (result?.slug) router.push(`/events/${result.slug}`);
  }

  async function join(eventId: string) {
    setJoining(eventId);
    await joinEventAction(eventId);
    setJoining(null);
    router.refresh();
  }

  async function leave(eventId: string) {
    setJoining(eventId);
    await leaveEventAction(eventId);
    setJoining(null);
    router.refresh();
  }

  const myCard = events
    .flatMap((event) => event.games.map((game) => ({ event, game })))
    .find(({ event, game }) => {
      if (eventLane(event.status) === "past") return false;
      return game.players.some((player) => player.userId === user.id);
    });
  const myRole = myCard?.game.players.find((player) => player.userId === user.id);

  useEffect(() => {
    if (!myCard || !myRole) return;
    const key = `mafia-card-${myCard.game.id}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    router.push(`/games/${myCard.game.id}/role`);
  }, [myCard, myRole, router]);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <header className="pt-1">
        <p className="text-[11px] uppercase tracking-[0.22em] text-gold">{enName(user)}</p>
        <h1 className="display mt-2 text-3xl font-semibold">{t("dashboard")}</h1>
      </header>

      {myCard && myRole ? (
        <Button href={`/games/${myCard.game.id}/role`}>{t("roleReady")}</Button>
      ) : null}

      <section className="grid grid-cols-4 gap-2 text-center">
        <Stat label={t("nightsPlayed")} value={stats.nights} />
        <Stat label={t("town")} value={stats.clubWins.citizen} accent="text-citizen" />
        <Stat label={t("mafia")} value={stats.clubWins.mafia} accent="text-mafia" />
        <Stat label={t("independent")} value={stats.clubWins.independent} accent="text-indie" />
      </section>

      <Panel className="space-y-3">
        <h2 className="display text-lg font-semibold">{t("yourRecord")}</h2>
        <p className="text-sm text-muted">
          {stats.me.played} {t("nightsPlayed").toLowerCase()} · {stats.me.wins} {t("wins").toLowerCase()}
        </p>
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="text-citizen">
            {t("town")} {stats.me.winsBySide.citizen}
          </span>
          <span className="text-mafia">
            {t("mafia")} {stats.me.winsBySide.mafia}
          </span>
          <span className="text-indie">
            {t("independent")} {stats.me.winsBySide.independent}
          </span>
        </div>
      </Panel>

      {live.length ? (
        <NightList
          title={t("inPlay")}
          events={live}
          userId={user.id}
          joining={joining}
          onJoin={join}
          onLeave={leave}
          live
        />
      ) : null}

      <NightList
        title={t("openNights")}
        events={open}
        userId={user.id}
        joining={joining}
        onJoin={join}
        onLeave={leave}
        empty={t("noOpenNights")}
      />

      <section className="space-y-3">
        <h2 className="display text-xl font-semibold">{t("pastNights")}</h2>
        {past.length === 0 ? <p className="text-sm text-muted">{t("noPastNights")}</p> : null}
        {past.map((event) => {
          const game = event.games[0];
          const winner = game?.winningFaction;
          const faction = winner ? asFaction(winner) : undefined;
          const overview = game ? gameOverview(game) : null;
          return (
            <Panel key={event.id} className="space-y-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="display text-lg font-semibold leading-snug">{event.titleEn || event.title}</h3>
                  <p className="mt-1 text-sm text-muted">{formatWhen(event.date)}</p>
                  <p className="text-sm text-muted">{event.locationEn || event.location}</p>
                </div>
                {faction ? <FactionPill faction={faction} /> : <StatusPill>{t("results")}</StatusPill>}
              </div>
              {winner ? (
                <p className="text-sm text-gold">
                  {t("winner")}: {factionLabel(winner)}
                </p>
              ) : null}
              {overview ? (
                <p className="text-sm text-muted">
                  {t("day")} {overview.days} · {overview.living} {t("stillIn").toLowerCase()} · {sideLine(overview.livingBySide)}
                </p>
              ) : null}
              <Button href={`/events/${event.slug}`}>{t("results")}</Button>
            </Panel>
          );
        })}
      </section>

      {stats.table.length ? (
        <Panel className="space-y-3">
          <h2 className="display text-lg font-semibold">{t("clubTable")}</h2>
          <ol className="space-y-2">
            {stats.table.slice(0, 10).map((row, i) => (
              <li
                key={row.userId}
                className={`flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 ${
                  row.userId === user.id ? "bg-gold/10" : "bg-bg-elev"
                }`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <SeatAvatar name={row.name} seat={i + 1} />
                  <span className="truncate">{row.name}</span>
                </span>
                <span className="shrink-0 text-sm text-muted">
                  {row.wins}W · {row.played - row.wins}L
                </span>
              </li>
            ))}
          </ol>
        </Panel>
      ) : null}

      <Button href="/rules" variant="ghost">
        {t("houseRules")}
      </Button>

      {user.isAdmin ? (
        <form action={create}>
          <Panel className="space-y-3">
            <h2 className="display text-lg font-semibold">{t("hostNight")}</h2>
            <input name="title" placeholder="Title" className={fieldClass} />
            <input name="location" placeholder={t("location")} className={fieldClass} />
            <input name="date" type="datetime-local" className={fieldClass} />
            {error ? <p className="text-sm text-mafia">{error}</p> : null}
            <Button type="submit">{t("confirm")}</Button>
          </Panel>
        </form>
      ) : null}
    </div>
  );
}

function NightList({
  title,
  events,
  userId,
  joining,
  onJoin,
  onLeave,
  live = false,
  empty,
}: {
  title: string;
  events: EventCard[];
  userId: string;
  joining: string | null;
  onJoin: (id: string) => void;
  onLeave: (id: string) => void;
  live?: boolean;
  empty?: string;
}) {
  const { t } = useLang();
  return (
    <section className="space-y-3">
      <h2 className="display text-xl font-semibold">{title}</h2>
      {events.length === 0 && empty ? <p className="text-sm text-muted">{empty}</p> : null}
      {events.map((event) => {
        const joined = event.registrations.some((r) => r.userId === userId);
        const isNarrator = event.narrators.some((n) => n.userId === userId);
        const gameId = event.games[0]?.id;
        const playerCount = event.registrations.length - event.narrators.length;
        const canJoin = isJoinable(event.status) && !joined;
        return (
          <Panel key={event.id} className="relative space-y-4 overflow-hidden p-5">
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-linear-to-r from-transparent via-gold/70 to-transparent" />
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="display text-xl font-semibold leading-snug">{event.titleEn || event.title}</h3>
                <p className="mt-2 text-sm text-muted">{formatWhen(event.date)}</p>
                <p className="text-sm text-muted">{event.locationEn || event.location}</p>
              </div>
              <StatusPill>{live ? t("inPlay") : t("eventSetup")}</StatusPill>
            </div>
            {isNarrator ? (
              <p className="rounded-2xl border border-gold/20 bg-gold/10 px-3 py-2 text-sm text-gold">
                {t("youAreNarrator")}
              </p>
            ) : joined ? (
              <p className="rounded-2xl border border-citizen/20 bg-citizen/10 px-3 py-2 text-sm text-citizen">
                {t("joined")}
              </p>
            ) : null}
            <p className="text-xs text-muted">
              {event.narrators.length} {t("narrators").toLowerCase()} · {Math.max(playerCount, 0)}{" "}
              {t("players").toLowerCase()}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button href={`/events/${event.slug}`} variant="ghost">
                {t("openEvent")}
              </Button>
              {live && isNarrator && gameId ? (
                <Button href={`/games/${gameId}/narrator`}>{t("asNarrator")}</Button>
              ) : live && gameId && joined && !isNarrator ? (
                <Button href={`/games/${gameId}/role`}>{t("revealRole")}</Button>
              ) : canJoin ? (
                <Button onClick={() => onJoin(event.id)} disabled={joining === event.id}>
                  {t("join")}
                </Button>
              ) : joined && isJoinable(event.status) ? (
                <Button onClick={() => onLeave(event.id)} variant="ghost" disabled={joining === event.id}>
                  {t("leave")}
                </Button>
              ) : (
                <Button href={`/events/${event.slug}`} variant={joined ? "ghost" : "primary"}>
                  {joined ? t("joined") : t("join")}
                </Button>
              )}
            </div>
          </Panel>
        );
      })}
    </section>
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
