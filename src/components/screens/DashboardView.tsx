"use client";

import { useLang } from "@/lib/lang";
import { Button, Panel } from "@/components/ui";
import type { SessionUser } from "@/lib/auth";

type EventCard = {
  id: string;
  slug: string;
  title: string;
  titleEn: string;
  date: string;
  location: string;
  locationEn: string;
  status: string;
  narratorId: string | null;
  narrator: { displayName: string; displayNameEn: string } | null;
  registrations: { userId: string }[];
  games: { id: string }[];
};

export function DashboardView({
  user,
  events,
}: {
  user: SessionUser;
  events: EventCard[];
  name?: unknown;
}) {
  const { t, lang } = useLang();

  return (
    <div className="flex flex-1 flex-col gap-5">
      <header>
        <p className="text-sm text-muted">
          {lang === "en" ? user.displayNameEn || user.displayName : user.displayName}
          {user.isAdmin ? " · admin" : ""}
        </p>
        <h1 className="display mt-1 text-3xl">{t("upcoming")}</h1>
      </header>

      {events.map((event) => {
        const registered = event.registrations.some((r) => r.userId === user.id);
        const isNarrator = event.narratorId === user.id;
        const gameId = event.games[0]?.id;
        return (
          <Panel key={event.id} className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">{lang === "en" ? event.titleEn : event.title}</h2>
                <p className="mt-1 text-sm text-muted">
                  {new Date(event.date).toLocaleString(lang === "fa" ? "fa-IR" : "en-US")}
                </p>
                <p className="text-sm text-muted">{lang === "en" ? event.locationEn : event.location}</p>
              </div>
              <span className="rounded-full bg-red/20 px-2 py-1 text-[11px] text-red-2">{event.status}</span>
            </div>
            {isNarrator ? (
              <div className="rounded-2xl bg-gold/10 px-3 py-2 text-sm text-gold">{t("youAreNarrator")}</div>
            ) : registered && gameId ? (
              <div className="rounded-2xl bg-citizen/10 px-3 py-2 text-sm text-citizen">{t("youArePlayer")}</div>
            ) : null}
            <div className="grid grid-cols-2 gap-2">
              <Button href={`/events/${event.slug}`} variant="ghost">
                {t("openEvent")}
              </Button>
              {isNarrator && gameId ? (
                <Button href={`/games/${gameId}/narrator`}>{t("asNarrator")}</Button>
              ) : gameId && registered ? (
                <Button href={`/games/${gameId}/role`}>{t("revealRole")}</Button>
              ) : (
                <Button href={`/events/${event.slug}`}>{registered ? t("registered") : t("rsvp")}</Button>
              )}
            </div>
          </Panel>
        );
      })}

      {user.isAdmin ? <Button href="/admin" variant="ghost">{t("admin")}</Button> : null}
    </div>
  );
}
