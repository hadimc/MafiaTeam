"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang, enName } from "@/lib/lang";
import { Button, FactionPill, Panel, SeatAvatar, fieldClass } from "@/components/ui";
import { RoleSteppers } from "@/components/RoleSteppers";
import { RoleReveal } from "@/components/screens/RoleReveal";
import { Roster, RosterPeek } from "@/components/screens/Roster";
import { ShareJoinLink } from "@/components/CopyLink";
import type { SessionUser } from "@/lib/auth";
import { DEALABLE_ROLES, maxQuantity, playerCount } from "@/lib/catalog";
import { MAX_NARRATORS, splitRoster } from "@/lib/roster";
import { useLivePull } from "@/lib/live";
import {
  finalizeScenarioAction,
  joinEventAction,
  leaveEventAction,
  reopenScenarioAction,
  selectScenarioAction,
  switchSeatAction,
} from "@/server/actions/events";
import { dealRolesAction } from "@/server/actions/games";
import { pullEventAction } from "@/server/actions/live";
import {
  asFaction,
  canDeal,
  canReopenScenario,
  eventLane,
  factionLabel,
  gameOverview,
  isJoinable,
  isRosterOpen,
  sideLine,
} from "@/lib/stats";

type Person = { displayName: string; displayNameEn: string };

type EventPayload = {
  id: string;
  slug: string;
  title: string;
  titleEn: string;
  date: string;
  location: string;
  locationEn: string;
  status: string;
  scenarioId: string | null;
  createdById: string;
  narrators: { userId: string; user: { id: string } & Person }[];
  scenario: {
    id: string;
    name: string;
    nameEn: string;
    attendeeCount: number;
    supportedPlayerCount: number;
  } | null;
  registrations: {
    userId: string;
    narratorVolunteer: boolean;
    user: { id: string; username: string } & Person;
  }[];
  games: {
    id: string;
    status: string;
    currentDay: number;
    winningFaction: string | null;
    startedAt: string | null;
    finishedAt: string | null;
    players: {
      id: string;
      userId: string;
      seatNumber: number;
      roleKey: string;
      roleName: string;
      roleNameEn: string;
      roleDescription: string;
      roleDescriptionEn: string;
      faction: string;
      alive: boolean;
      user: Person;
    }[];
  }[];
};

type ScenarioOption = {
  id: string;
  name: string;
  nameEn: string;
  attendeeCount: number;
  narratorCount: number;
  supportedPlayerCount: number;
  active: boolean;
  roles: { key: string; quantity: number }[];
};

function qtyFrom(scenario?: ScenarioOption) {
  const qty: Record<string, number> = {};
  for (const role of DEALABLE_ROLES) qty[role.key] = 0;
  if (!scenario) return qty;
  for (const role of scenario.roles) qty[role.key] = role.quantity;
  return qty;
}

export function EventView({
  user,
  event,
  scenarios,
}: {
  user: SessionUser;
  event: EventPayload;
  scenarios: ScenarioOption[];
}) {
  const { t } = useLang();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [scenarioId, setScenarioId] = useState(event.scenarioId ?? "");
  const [qty, setQty] = useState(() => qtyFrom(scenarios.find((s) => s.id === event.scenarioId)));
  const [cardOpen, setCardOpen] = useState(false);
  const [warnReset, setWarnReset] = useState(false);
  const shownCard = useRef<string | null>(null);

  const pull = useCallback((seen: string) => pullEventAction(event.id, seen), [event.id]);
  useLivePull(pull, eventLane(event.status) !== "past");

  useEffect(() => {
    setScenarioId(event.scenarioId ?? "");
    setQty(qtyFrom(scenarios.find((s) => s.id === event.scenarioId)));
    // Qty edits stay local until status or scenario changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.scenarioId, event.status]);

  const registered = event.registrations.some((r) => r.userId === user.id);
  const amNarrator = event.narrators.some((n) => n.userId === user.id);
  const { narrators, players } = splitRoster(event.registrations, event);
  const game = event.games[0];
  const gameId = game?.id;
  const past = eventLane(event.status) === "past";
  const live = eventLane(event.status) === "live";
  const setup = !past && !live;
  const joinable = isJoinable(event.status) || (narrators.length === 0 && setup && event.status !== "roles_assigned");
  const rosterOpen = isRosterOpen(event.status) || (narrators.length === 0 && setup && event.status !== "roles_assigned");
  const dealtCards = event.status === "roles_assigned" || live;
  const winner = game?.winningFaction;
  const winnerFaction = winner ? asFaction(winner) : undefined;
  const overview = game ? gameOverview(game) : null;
  const name = (person: Person) => enName(person);
  const attendees = narrators.length + players.length;
  const dealt = playerCount(qty);
  const mine = game?.players.find((player) => player.userId === user.id);
  const catalog = scenarios.filter((s) => s.active);
  const matching = catalog.filter(
    (s) => s.attendeeCount === attendees || s.supportedPlayerCount === players.length,
  );
  const picker = matching.length ? matching : catalog;

  useEffect(() => {
    if (mine && gameId && shownCard.current !== gameId) {
      shownCard.current = gameId;
      sessionStorage.setItem(`mafia-card-${gameId}`, "1");
      setCardOpen(true);
    }
    if (!mine) shownCard.current = null;
  }, [mine, gameId]);

  async function deal() {
    setError(null);
    const result = await dealRolesAction(event.id);
    if (result?.error === "count") {
      setError(`${t("countMismatch")} (${result.actual}/${result.expected})`);
      return;
    }
    if (result?.error === "max") setError(t("maxNarrators"));
    if (result?.error === "not_final") setError(t("finalizeScenario"));
    if (result?.gameId) router.refresh();
  }

  async function pickScenario(id: string) {
    setScenarioId(id);
    setQty(qtyFrom(scenarios.find((s) => s.id === id) ?? catalog.find((s) => s.id === id)));
    setError(null);
    await selectScenarioAction(event.id, id);
  }

  async function finalize(formData: FormData) {
    setError(null);
    formData.set("scenarioId", scenarioId);
    const result = await finalizeScenarioAction(event.id, formData);
    if (result?.error === "count") setError(`${t("seatedVsDealt")} (${result.actual}/${result.expected})`);
    else if (result?.error === "incomplete") setError(t("scenario"));
    else if (result?.error === "max") setError(t("maxNarrators"));
    router.refresh();
  }

  async function switchSeat() {
    setError(null);
    const result = await switchSeatAction(event.id);
    if (result?.error === "max") setError(t("maxNarrators"));
    if (result?.error === "locked") setError(t("seatsLocked"));
    router.refresh();
  }

  async function reopen() {
    setError(null);
    setWarnReset(false);
    await reopenScenarioAction(event.id);
    router.refresh();
  }

  const statusLabel = past
    ? t("results")
    : live
      ? t("inPlay")
      : event.status === "roles_assigned"
        ? t("rolesDealt")
        : event.status === "scenario_finalized"
          ? t("scenarioFinalized")
          : t("eventSetup");

  return (
    <div className="flex flex-1 flex-col gap-4">
      <Button href="/dashboard" variant="ghost" className="w-auto self-start min-h-10 px-3 text-sm">
        {t("back")}
      </Button>

      <header>
        <p className="text-[11px] uppercase tracking-[0.22em] text-gold">
          {statusLabel}
        </p>
        <h1 className="display mt-1 text-3xl font-semibold leading-tight">{event.titleEn || event.title}</h1>
        <p className="mt-2 text-sm text-muted">
          {event.locationEn || event.location} ·{" "}
          {new Date(event.date).toLocaleString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      </header>

      {user.isAdmin && !past ? (
        <Panel>
          <ShareJoinLink slug={event.slug} />
        </Panel>
      ) : null}

      {setup && joinable ? (
        registered ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => leaveEventAction(event.id)} variant="ghost">
                {t("leave")}
              </Button>
              <Button onClick={switchSeat}>{amNarrator ? t("bePlayer") : t("beNarrator")}</Button>
            </div>
            <p className="text-center text-[11px] text-muted">{t("maxNarrators")}</p>
          </>
        ) : (
          <Button onClick={() => joinEventAction(event.id)}>{t("join")}</Button>
        )
      ) : !past ? (
        <p className="text-center text-[11px] text-muted">
          {registered ? t("seatsLocked") : t("closedJoin")}
        </p>
      ) : null}

      <Panel className="space-y-2 text-sm">
        <Row
          label={t("narrators")}
          value={narrators.length ? narrators.map((n) => name(n.user)).join(", ") : "—"}
        />
        <Row
          label={t("scenario")}
          value={event.scenario ? event.scenario.nameEn || event.scenario.name : "—"}
        />
        <Row
          label={t("status")}
          value={statusLabel}
        />
        <Row
          label={t("attendees")}
          value={`${narrators.length} ${t("narrators").toLowerCase()} · ${players.length} ${t("players").toLowerCase()}`}
        />
        {winner ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted">{t("winner")}</span>
            <span className="flex items-center gap-2 font-medium">
              {winnerFaction ? <FactionPill faction={winnerFaction} /> : null}
              {factionLabel(winner)}
            </span>
          </div>
        ) : null}
      </Panel>

      {!past && amNarrator ? (
        <>
          <Roster
            title={`${t("narrators")} · ${narrators.length}/${MAX_NARRATORS}`}
            people={narrators}
            me={user.id}
            name={name}
            seat="narrator"
            canSwitch={rosterOpen && registered}
            onSwitch={switchSeat}
          />
          <Roster
            title={`${t("players")} · ${players.length}`}
            people={players}
            me={user.id}
            name={name}
            seat="player"
            canSwitch={rosterOpen && registered}
            onSwitch={switchSeat}
          />
        </>
      ) : !past ? (
        <RosterPeek
          href={`/events/${event.slug}/players`}
          narrators={narrators}
          players={players}
        />
      ) : null}

      {past && game?.players.length && overview ? (
        <>
          <Panel className="space-y-2 text-sm">
            <h2 className="mb-3 text-sm text-muted">{t("overview")}</h2>
            <Row label={t("daysPlayed")} value={`${t("day")} ${overview.days}`} />
            <Row
              label={t("players")}
              value={`${overview.seated} ${t("seated").toLowerCase()} · ${overview.living} ${t("stillIn").toLowerCase()} · ${overview.out} ${t("eliminated").toLowerCase()}`}
            />
            <Row label={t("stillIn")} value={sideLine(overview.livingBySide)} />
            <Row label={t("dealtSides")} value={sideLine(overview.dealtBySide)} />
            {overview.durationLabel ? <Row label={t("duration")} value={overview.durationLabel} /> : null}
          </Panel>
          <Panel>
            <h2 className="mb-3 text-sm text-muted">{t("results")}</h2>
            <ol className="space-y-2">
              {game.players.map((player) => {
                const faction = asFaction(player.faction);
                const won = winner && player.faction === winner;
                return (
                  <li
                    key={player.id}
                    className={`flex items-center justify-between gap-3 rounded-2xl bg-bg-elev px-3 py-2.5 ${
                      player.alive ? "" : "opacity-55"
                    }`}
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <SeatAvatar
                        name={name(player.user)}
                        seat={player.seatNumber}
                        faction={faction}
                        alive={player.alive}
                      />
                      <span className="min-w-0">
                        <span className="block truncate">{name(player.user)}</span>
                        <span className="block truncate text-[11px] text-muted">
                          {player.roleNameEn || player.roleName}
                        </span>
                      </span>
                    </span>
                    <span className="flex shrink-0 flex-col items-end gap-1">
                      {faction ? <FactionPill faction={faction} /> : null}
                      {won ? <span className="text-[11px] text-gold">{t("won")}</span> : null}
                    </span>
                  </li>
                );
              })}
            </ol>
          </Panel>
        </>
      ) : null}

      {amNarrator && setup && rosterOpen ? (
        <form action={finalize}>
          <Panel className="space-y-3">
            <h2 className="display text-lg font-semibold">{t("scenarioSetup")}</h2>
            <label className="text-sm text-muted">
              {matching.length ? t("matchingScenarios") : t("noMatchScenarios")}
            </label>
            <select
              className={fieldClass}
              value={scenarioId}
              onChange={(e) => pickScenario(e.target.value)}
            >
              <option value="" disabled>
                —
              </option>
              {picker.map((scenario) => (
                <option key={scenario.id} value={scenario.id}>
                  {scenario.nameEn || scenario.name} · {scenario.attendeeCount} {t("attendees").toLowerCase()}
                </option>
              ))}
            </select>
            {scenarioId ? (
              <>
                <p className="text-sm text-muted">{t("adjustRoles")}</p>
                <RoleSteppers
                  qty={qty}
                  onChange={(key, next) =>
                    setQty((current) => ({
                      ...current,
                      [key]: Math.min(maxQuantity(key), Math.max(0, next)),
                    }))
                  }
                />
                <p className={`text-center text-sm ${dealt === players.length ? "text-citizen" : "text-mafia"}`}>
                  {dealt} {t("players").toLowerCase()} dealt · {players.length} seated
                </p>
              </>
            ) : null}
            {error ? <p className="text-sm text-mafia">{error}</p> : null}
            <Button type="submit" disabled={!scenarioId || dealt !== players.length || narrators.length < 1}>
              {t("finalizeScenario")}
            </Button>
          </Panel>
        </form>
      ) : null}

      {amNarrator && canDeal(event.status) ? (
        <Panel className="space-y-3">
          <h2 className="display text-lg font-semibold">{t("scenarioFinalized")}</h2>
          <p className="text-sm text-muted">
            {event.scenario?.nameEn || event.scenario?.name} · {players.length} {t("players").toLowerCase()}
          </p>
          {error ? <p className="text-sm text-mafia">{error}</p> : null}
          <Button onClick={deal}>{t("dealRoles")}</Button>
          <Button onClick={reopen} variant="ghost">
            {t("reopenScenario")}
          </Button>
        </Panel>
      ) : null}

      {amNarrator && canReopenScenario(event.status) && !canDeal(event.status) ? (
        dealtCards && warnReset ? (
          <Panel className="space-y-3">
            <p className="text-sm text-muted">{t("resetGameWarn")}</p>
            <Button onClick={reopen} variant="danger">
              {t("yesResetGame")}
            </Button>
            <Button onClick={() => setWarnReset(false)} variant="ghost">
              {t("cancel")}
            </Button>
          </Panel>
        ) : (
          <Button
            onClick={dealtCards ? () => setWarnReset(true) : reopen}
            variant="ghost"
          >
            {dealtCards ? t("resetGame") : t("reopenScenario")}
          </Button>
        )
      ) : null}

      {mine && !amNarrator && !cardOpen ? (
        <Button onClick={() => setCardOpen(true)}>{t("roleReady")}</Button>
      ) : null}

      {amNarrator && gameId && (live || event.status === "roles_assigned") ? (
        <Button href={`/games/${gameId}/narrator`}>{t("asNarrator")}</Button>
      ) : null}

      {mine && !amNarrator && cardOpen ? (
        <RoleReveal
          gameId={gameId!}
          roleKey={mine.roleKey}
          roleName={mine.roleName}
          roleNameEn={mine.roleNameEn}
          faction={mine.faction as "citizen" | "mafia" | "independent"}
          description={mine.roleDescription}
          descriptionEn={mine.roleDescriptionEn}
          backHref={`/events/${event.slug}`}
          onClose={() => setCardOpen(false)}
        />
      ) : null}
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
