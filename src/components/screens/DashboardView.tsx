"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useLang, enName } from "@/lib/lang";
import { Button, FactionPill, Panel, SeatAvatar, StatusPill } from "@/components/ui";
import type { SessionUser } from "@/lib/auth";
import { joinEventAction, leaveEventAction } from "@/server/actions/events";
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
  const [joining, setJoining] = useState<string | null>(null);
  const [recordView, setRecordView] = useState<"individual" | "club">("individual");
  const pull = useCallback((seen: string) => pullDashboardAction(seen), []);
  useLivePull(pull, true);

  const open = events.filter((event) => eventLane(event.status) === "open");
  const live = events.filter((event) => eventLane(event.status) === "live");

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

      <NightList
        title={t("newEvent")}
        events={[...live, ...open]}
        userId={user.id}
        joining={joining}
        onJoin={join}
        onLeave={leave}
        empty={t("noNewEvent")}
      />

      <section className="space-y-3">
        <h2 className="display text-xl font-semibold">{t("records")}</h2>
        <div className="grid grid-cols-2 gap-1 rounded-full border border-line bg-card/80 p-1">
          <button
            type="button"
            onClick={() => setRecordView("individual")}
            className={`rounded-full py-2 text-center text-xs font-semibold tracking-wide ${
              recordView === "individual" ? "bg-gold text-black" : "text-muted"
            }`}
          >
            {t("individual")}
          </button>
          <button
            type="button"
            onClick={() => setRecordView("club")}
            className={`rounded-full py-2 text-center text-xs font-semibold tracking-wide ${
              recordView === "club" ? "bg-gold text-black" : "text-muted"
            }`}
          >
            {t("club")}
          </button>
        </div>
        {recordView === "club" ? (
          <>
            <p className="text-sm text-muted">{t("clubWinsHint")}</p>
            <div className="grid grid-cols-4 gap-2 text-center">
              <Stat icon={<MoonIcon />} label={t("nightsPlayed")} value={stats.nights} />
              <Stat icon={<TownIcon />} label={t("townWins")} value={stats.clubWins.citizen} accent="text-citizen" />
              <Stat icon={<MafiaIcon />} label={t("mafiaWins")} value={stats.clubWins.mafia} accent="text-mafia" />
              <Stat icon={<IndieIcon />} label={t("independentWins")} value={stats.clubWins.independent} accent="text-indie" />
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 text-center">
              <Stat icon={<MoonIcon />} label={t("nightsPlayed")} value={stats.me.played} />
              <Stat icon={<TrophyIcon />} label={t("wins")} value={stats.me.wins} accent="text-gold" />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat icon={<TownIcon />} label={t("townWins")} value={stats.me.winsBySide.citizen} accent="text-citizen" />
              <Stat icon={<MafiaIcon />} label={t("mafiaWins")} value={stats.me.winsBySide.mafia} accent="text-mafia" />
              <Stat icon={<IndieIcon />} label={t("independentWins")} value={stats.me.winsBySide.independent} accent="text-indie" />
            </div>
          </>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="display text-xl font-semibold">{t("pastEvents")}</h2>
        <Button href="/past">{t("openPastEvents")}</Button>
      </section>

      {stats.table.length ? (
        <section className="space-y-3">
          <h2 className="display text-xl font-semibold">{t("clubTable")}</h2>
          <Panel className="space-y-2">
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
        </section>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <Button href="/profile" variant="ghost">
          {t("profile")}
        </Button>
        <Button href="/rules" variant="ghost">
          {t("houseRules")}
        </Button>
      </div>
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
  empty,
}: {
  title: string;
  events: EventCard[];
  userId: string;
  joining: string | null;
  onJoin: (id: string) => void;
  onLeave: (id: string) => void;
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
        const live = eventLane(event.status) === "live";
        return (
          <Panel key={event.id} className="relative space-y-2 overflow-hidden p-3">
            <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-linear-to-r from-transparent via-gold/70 to-transparent" />
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="display text-base font-semibold leading-snug">{event.titleEn || event.title}</h3>
                <p className="mt-0.5 text-xs text-muted">
                  {formatWhen(event.date)} · {event.locationEn || event.location}
                </p>
              </div>
              <StatusPill>{live ? t("inPlay") : t("eventSetup")}</StatusPill>
            </div>
            {isNarrator ? (
              <p className="text-xs text-gold">{t("youAreNarrator")}</p>
            ) : joined ? (
              <p className="text-xs text-citizen">{t("joined")}</p>
            ) : null}
            <p className="text-[11px] text-muted">
              {event.narrators.length} {t("narrators")} · {Math.max(playerCount, 0)} {t("players")}
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              <Button href={`/events/${event.slug}`} variant="ghost" className="min-h-9! text-xs">
                {t("openEvent")}
              </Button>
              {live && isNarrator && gameId ? (
                <Button href={`/games/${gameId}/narrator`} className="min-h-9! text-xs">
                  {t("asNarrator")}
                </Button>
              ) : live && gameId && joined && !isNarrator ? (
                <Button href={`/games/${gameId}/role`} className="min-h-9! text-xs">
                  {t("revealRole")}
                </Button>
              ) : canJoin ? (
                <Button onClick={() => onJoin(event.id)} disabled={joining === event.id} className="min-h-9! text-xs">
                  {t("join")}
                </Button>
              ) : joined && isJoinable(event.status) ? (
                <Button
                  onClick={() => onLeave(event.id)}
                  variant="ghost"
                  disabled={joining === event.id}
                  className="min-h-9! text-xs"
                >
                  {t("leave")}
                </Button>
              ) : (
                <Button
                  href={`/events/${event.slug}`}
                  variant={joined ? "ghost" : "primary"}
                  className="min-h-9! text-xs"
                >
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

export function PastEventsView({ events }: { events: EventCard[] }) {
  const { t } = useLang();
  const past = events
    .filter((event) => eventLane(event.status) === "past")
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="flex flex-1 flex-col gap-6">
      <Button href="/dashboard" variant="ghost" className="w-auto self-start min-h-10 px-3 text-sm">
        {t("backToDashboard")}
      </Button>
      <header className="pt-1">
        <h1 className="display text-3xl font-semibold">{t("pastEvents")}</h1>
      </header>
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
                <h2 className="display text-lg font-semibold leading-snug">{event.titleEn || event.title}</h2>
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
                {t("day")} {overview.days} · {overview.living} {t("stillIn")} · {sideLine(overview.livingBySide)}
              </p>
            ) : null}
            <Button href={`/events/${event.slug}`}>{t("results")}</Button>
          </Panel>
        );
      })}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
  icon,
}: {
  label: string;
  value: number;
  accent?: string;
  icon: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-line bg-card/80 px-1 py-3">
      <span className={`flex h-6 w-6 items-center justify-center ${accent ?? "text-gold"}`}>{icon}</span>
      <div className={`mt-1.5 text-xl font-semibold ${accent ?? ""}`}>{value}</div>
      <div className="mt-1 text-[9px] uppercase leading-tight tracking-wide text-muted">{label}</div>
    </div>
  );
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-full w-full" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 15.2A7.4 7.4 0 0 1 8.8 4 8 8 0 1 0 20 15.2Z" />
    </svg>
  );
}

function TrophyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-full w-full" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 5h8v3.5A4 4 0 0 1 12 12.5 4 4 0 0 1 8 8.5V5Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H6a2.5 2.5 0 0 0 2.5 2.5M16 7h2a2.5 2.5 0 0 1-2.5 2.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 12.5V15M9 19h6M10 15h4v4h-4z" />
    </svg>
  );
}

function TownIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-full w-full" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 11 12 4l8 7v9H4v-9Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 20v-6h4v6" />
    </svg>
  );
}

function MafiaIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-full w-full" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 10.5c0-1.5 3.6-3.5 8-3.5s8 2 8 3.5c0 4-3.2 7-8 7s-8-3-8-7Z"
      />
      <path strokeLinecap="round" d="M8.2 11.2c.6 0 1 .4 1 .9s-.4.9-1 .9-1-.4-1-.9.4-.9 1-.9ZM15.8 11.2c.6 0 1 .4 1 .9s-.4.9-1 .9-1-.4-1-.9.4-.9 1-.9Z" />
    </svg>
  );
}

function IndieIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-full w-full" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 4.5 13.6 9h4.7l-3.8 2.9 1.5 4.6L12 13.8 8 16.5l1.5-4.6L5.7 9h4.7L12 4.5Z"
      />
    </svg>
  );
}
