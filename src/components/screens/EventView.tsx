"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/lang";
import { Button, Panel } from "@/components/ui";
import type { SessionUser } from "@/lib/auth";
import {
  assignNarratorAction,
  finalizeScenarioAction,
  rsvpAction,
  selectScenarioAction,
  volunteerNarratorAction,
} from "@/server/actions/events";
import { dealRolesAction } from "@/server/actions/games";

type EventPayload = {
  id: string;
  slug: string;
  title: string;
  titleEn: string;
  date: string;
  location: string;
  locationEn: string;
  status: string;
  narratorId: string | null;
  scenarioId: string | null;
  narrator: { id: string; displayName: string; displayNameEn: string } | null;
  scenario: { id: string; name: string; nameEn: string; supportedPlayerCount: number } | null;
  registrations: {
    userId: string;
    narratorVolunteer: boolean;
    user: { id: string; displayName: string; displayNameEn: string; username: string };
  }[];
  games: { id: string }[];
};

type ScenarioOption = {
  id: string;
  name: string;
  nameEn: string;
  supportedPlayerCount: number;
};

export function EventView({
  user,
  event,
  scenarios,
}: {
  user: SessionUser;
  event: EventPayload;
  scenarios: ScenarioOption[];
}) {
  const { t, lang } = useLang();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const registered = event.registrations.some((r) => r.userId === user.id);
  const volunteered = event.registrations.find((r) => r.userId === user.id)?.narratorVolunteer;
  const isNarrator = user.isAdmin || event.narratorId === user.id;
  const activePlayers = event.registrations.filter((r) => r.userId !== event.narratorId).length;
  const gameId = event.games[0]?.id;
  const name = (person: { displayName: string; displayNameEn: string }) =>
    lang === "en" && person.displayNameEn ? person.displayNameEn : person.displayName;

  async function deal() {
    setError(null);
    const result = await dealRolesAction(event.id);
    if (result?.error === "count") {
      setError(`${t("countMismatch")} (${result.actual}/${result.expected})`);
      return;
    }
    if (result?.gameId) router.push(`/games/${result.gameId}/narrator`);
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <Button href="/dashboard" variant="ghost" className="w-auto self-start min-h-10 px-3 text-sm">
        {t("back")}
      </Button>

      <header>
        <h1 className="display text-3xl leading-tight">{lang === "en" ? event.titleEn : event.title}</h1>
        <p className="mt-2 text-muted">
          {new Date(event.date).toLocaleString(lang === "fa" ? "fa-IR" : "en-US")} ·{" "}
          {lang === "en" ? event.locationEn : event.location}
        </p>
      </header>

      <Panel className="space-y-2 text-sm">
        <Row label={t("narrator")} value={event.narrator ? name(event.narrator) : "—"} />
        <Row
          label={t("scenario")}
          value={event.scenario ? (lang === "en" ? event.scenario.nameEn : event.scenario.name) : "—"}
        />
        <Row label={t("status")} value={event.status} />
        <Row label={t("shareLink")} value={`/events/${event.slug}`} />
        <Row label={t("attendees")} value={`${activePlayers} + ${t("narrator")}`} />
      </Panel>

      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => rsvpAction(event.id)} variant={registered ? "ghost" : "primary"}>
          {registered ? t("registered") : t("rsvp")}
        </Button>
        <Button onClick={() => volunteerNarratorAction(event.id)} variant="ghost" disabled={!registered}>
          {volunteered ? t("volunteered") : t("volunteerNarrator")}
        </Button>
      </div>

      {isNarrator ? (
        <Panel className="space-y-3">
          <label className="text-sm text-muted">{t("scenario")}</label>
          <select
            className="min-h-12 w-full rounded-2xl border border-line bg-bg px-3"
            defaultValue={event.scenarioId ?? ""}
            onChange={(e) => selectScenarioAction(event.id, e.target.value)}
          >
            <option value="" disabled>
              —
            </option>
            {scenarios.map((scenario) => (
              <option key={scenario.id} value={scenario.id}>
                {lang === "en" ? scenario.nameEn : scenario.name} ({scenario.supportedPlayerCount})
              </option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => finalizeScenarioAction(event.id)} variant="ghost">
              {t("finalizeScenario")}
            </Button>
            <Button onClick={deal}>{t("dealRoles")}</Button>
          </div>
          {error ? <p className="text-sm text-red-2">{error}</p> : null}
        </Panel>
      ) : null}

      {user.isAdmin ? (
        <Panel>
          <p className="mb-2 text-sm text-muted">{t("narrator")}</p>
          <div className="grid grid-cols-2 gap-2">
            {event.registrations.map((reg) => (
              <Button
                key={reg.userId}
                variant={event.narratorId === reg.userId ? "primary" : "ghost"}
                className="min-h-11 text-sm"
                onClick={() => assignNarratorAction(event.id, reg.userId)}
              >
                {name(reg.user)}
              </Button>
            ))}
          </div>
        </Panel>
      ) : null}

      <Panel>
        <h2 className="mb-3 text-sm text-muted">
          {t("attendees")} · {event.registrations.length}
        </h2>
        <ol className="space-y-2">
          {event.registrations.map((reg, i) => (
            <li key={reg.userId} className="flex items-center justify-between rounded-xl bg-bg px-3 py-2">
              <span>
                <span className="ms-2 text-muted">{i + 1}.</span> {name(reg.user)}
              </span>
              {event.narratorId === reg.userId ? (
                <span className="text-xs text-gold">{t("narrator")}</span>
              ) : null}
            </li>
          ))}
        </ol>
      </Panel>

      {gameId && registered && event.narratorId !== user.id ? (
        <Button href={`/games/${gameId}/role`}>{t("revealRole")}</Button>
      ) : null}
      {gameId && isNarrator ? <Button href={`/games/${gameId}/narrator`}>{t("asNarrator")}</Button> : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="text-end font-medium">{value}</span>
    </div>
  );
}
