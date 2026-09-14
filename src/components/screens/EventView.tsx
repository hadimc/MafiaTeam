"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLang, enName } from "@/lib/lang";
import { Button, FactionPill, Panel, fieldClass } from "@/components/ui";
import { RoleSteppers } from "@/components/RoleSteppers";
import { RoleReveal } from "@/components/screens/RoleReveal";
import { Roster, RosterPeek, AddPlayerForm, type ClubMember } from "@/components/screens/Roster";
import { CopyLinkIcon, ShareJoinLink } from "@/components/CopyLink";
import { displayScenarioName } from "@/lib/briefing";
import type { SessionUser } from "@/lib/auth";
import { DEALABLE_ROLES, maxQuantity, playerCount, scenariosMatchingPlayerCount } from "@/lib/catalog";
import { parseConfig } from "@/engine";
import { zodiacRulesFromConfig, type ZodiacRules } from "@/lib/zodiac";
import { ZodiacRulesFields } from "@/components/ZodiacRulesFields";
import { MAX_NARRATORS, splitRoster } from "@/lib/roster";
import { useLivePull } from "@/lib/live";
import {
  finalizeScenarioAction,
  joinEventAction,
  leaveEventAction,
  removePlayerFromEventAction,
  reopenScenarioAction,
  selectScenarioAction,
  setZodiacRulesAction,
  switchSeatAction,
} from "@/server/actions/events";
import { dealRolesAction, closeGameAction, endGameAction, resetGameAction } from "@/server/actions/games";
import { pullEventAction } from "@/server/actions/live";
import {
  asFaction,
  canDeal,
  canReopenScenario,
  eventLane,
  factionLabel,
  hasFinalizedScenario,
  isJoinable,
  isRosterOpen,
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
    configuration?: string;
    roles?: { key: string; quantity: number }[];
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
  configuration?: string;
  roles: { key: string; quantity: number }[];
};

function qtyFrom(scenario?: { roles?: { key: string; quantity: number }[] }) {
  const qty: Record<string, number> = {};
  for (const role of DEALABLE_ROLES) qty[role.key] = 0;
  if (!scenario?.roles) return qty;
  for (const role of scenario.roles) qty[role.key] = role.quantity;
  return qty;
}

export function EventView({
  user,
  event,
  scenarios,
  members = [],
}: {
  user: SessionUser;
  event: EventPayload;
  scenarios: ScenarioOption[];
  members?: ClubMember[];
}) {
  const { t } = useLang();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [scenarioId, setScenarioId] = useState(event.scenarioId ?? "");
  const [qty, setQty] = useState(() => qtyFrom(scenarios.find((s) => s.id === event.scenarioId)));
  const [zodiac, setZodiac] = useState<ZodiacRules>(() =>
    zodiacRulesFromConfig(parseConfig(event.scenario?.configuration || "{}")),
  );
  const [cardOpen, setCardOpen] = useState(false);
  const [warnReset, setWarnReset] = useState(false);
  const [adminDanger, setAdminDanger] = useState<null | "end" | "reset">(null);
  const shownCard = useRef<string | null>(null);

  const pull = useCallback((seen: string) => pullEventAction(event.id, seen), [event.id]);
  useLivePull(pull, eventLane(event.status) !== "past");

  useEffect(() => {
    setScenarioId(event.scenarioId ?? "");
    setQty(qtyFrom(event.scenario ?? scenarios.find((s) => s.id === event.scenarioId)));
    setZodiac(zodiacRulesFromConfig(parseConfig(event.scenario?.configuration || "{}")));
    // Qty edits stay local until status or scenario changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.scenarioId, event.status]);

  const registered = event.registrations.some((r) => r.userId === user.id);
  const amNarrator = event.narrators.some((n) => n.userId === user.id);
  const canEditScenario = amNarrator || user.isAdmin;
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
  const name = (person: Person) => enName(person);
  const dealt = playerCount(qty);
  const mine = game?.players.find((player) => player.userId === user.id);
  const catalog = scenarios.filter((s) => s.active);
  const matching = scenariosMatchingPlayerCount(catalog, players.length);
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
    const picked = scenarios.find((s) => s.id === id) ?? catalog.find((s) => s.id === id);
    setZodiac(zodiacRulesFromConfig(parseConfig(picked?.configuration || "{}")));
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
          value={
            event.scenario
              ? displayScenarioName(event.scenario, event.slug, "en", event)
              : "—"
          }
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

      {(hasFinalizedScenario(event.status) && event.scenario) || (past && game?.winningFaction) ? (
        <div className="space-y-2">
          {hasFinalizedScenario(event.status) && event.scenario ? (
            <div className="flex gap-2">
              <Button href={`/events/${event.slug}/briefing`} className="flex-1">
                {t("scenarioDescription")}
              </Button>
              <CopyLinkIcon path={`/events/${event.slug}/briefing`} />
            </div>
          ) : null}
          {past && game?.winningFaction ? (
            <div className="flex gap-2">
              <Button href={`/events/${event.slug}/results`} className="flex-1">
                {t("resultOverview")}
              </Button>
              <CopyLinkIcon path={`/events/${event.slug}/results`} />
            </div>
          ) : null}
        </div>
      ) : null}

      {user.isAdmin && game && (!amNarrator || past) ? (
        adminDanger === "end" ? (
          <Panel className="space-y-3">
            <p className="text-sm text-muted">{past ? t("changeResultWarn") : t("gameOverWarn")}</p>
            <Button
              onClick={() => {
                setAdminDanger(null);
                void endGameAction(game.id, "citizen").then(() => router.refresh());
              }}
              variant="danger"
            >
              {t("townWins")}
            </Button>
            <Button
              onClick={() => {
                setAdminDanger(null);
                void endGameAction(game.id, "mafia").then(() => router.refresh());
              }}
              variant="danger"
            >
              {t("mafiaWins")}
            </Button>
            <Button
              onClick={() => {
                setAdminDanger(null);
                void endGameAction(game.id, "independent").then(() => router.refresh());
              }}
              variant="danger"
            >
              {t("independentWins")}
            </Button>
            <Button onClick={() => setAdminDanger(null)} variant="ghost">
              {t("cancel")}
            </Button>
          </Panel>
        ) : adminDanger === "reset" ? (
          <Panel className="space-y-3">
            <p className="text-sm text-muted">{t("resetGameWarn")}</p>
            <Button onClick={() => resetGameAction(game.id)} variant="danger">
              {t("yesResetGame")}
            </Button>
            <Button onClick={() => setAdminDanger(null)} variant="ghost">
              {t("cancel")}
            </Button>
          </Panel>
        ) : (
          <div className="space-y-2">
            {winner && !past ? (
              <Button onClick={() => closeGameAction(game.id)}>{t("closeGame")}</Button>
            ) : null}
            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => setAdminDanger("end")} variant="ghost">
                {winner ? t("changeWinner") : t("gameOver")}
              </Button>
              <Button onClick={() => setAdminDanger("reset")} variant="ghost">
                {t("resetGame")}
              </Button>
            </div>
          </div>
        )
      ) : null}

      {!past && (amNarrator || user.isAdmin) ? (
        <>
          <Roster
            title={`${t("narrators")} · ${narrators.length}/${MAX_NARRATORS}`}
            people={narrators}
            me={user.id}
            name={name}
            seat="narrator"
            canSwitch={rosterOpen && registered}
            onSwitch={switchSeat}
            onRemove={
              user.isAdmin && rosterOpen
                ? (userId) => void removePlayerFromEventAction(event.id, userId)
                : undefined
            }
          />
          <Roster
            title={`${t("players")} · ${players.length}`}
            people={players}
            me={user.id}
            name={name}
            seat="player"
            canSwitch={rosterOpen && registered}
            onSwitch={switchSeat}
            onRemove={
              user.isAdmin && rosterOpen
                ? (userId) => void removePlayerFromEventAction(event.id, userId)
                : undefined
            }
          />
          {user.isAdmin && rosterOpen ? (
            <AddPlayerForm
              eventId={event.id}
              members={members}
              registeredIds={event.registrations.map((row) => row.userId)}
            />
          ) : null}
        </>
      ) : !past ? (
        <RosterPeek
          href={`/events/${event.slug}/players`}
          narrators={narrators}
          players={players}
        />
      ) : null}

      {canEditScenario && setup && rosterOpen ? (
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
                  {displayScenarioName(scenario, event.slug, "en", event)} · {scenario.supportedPlayerCount}{" "}
                  {t("players").toLowerCase()}
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
                <ZodiacRulesFields qty={qty} value={zodiac} onChange={setZodiac} />
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

      {canEditScenario && canDeal(event.status) ? (
        <Panel className="space-y-3">
          <h2 className="display text-lg font-semibold">{t("scenarioFinalized")}</h2>
          <p className="text-sm text-muted">
            {event.scenario
              ? `${displayScenarioName(event.scenario, event.slug, "en", event)} · ${players.length} ${t("players").toLowerCase()}`
              : `${players.length} ${t("players").toLowerCase()}`}
          </p>
          <ZodiacRulesFields
            qty={qty}
            value={zodiac}
            onChange={(next) => {
              setZodiac(next);
              const data = new FormData();
              data.set("zodiacMortality", next.mortality);
              data.set("zodiacShootNights", next.shootNights);
              data.set("zodiacCursedRole", next.cursedRole ?? "");
              void setZodiacRulesAction(event.id, data);
            }}
          />
          {error ? <p className="text-sm text-mafia">{error}</p> : null}
          <Button onClick={deal}>{t("dealRoles")}</Button>
          <Button onClick={reopen} variant="ghost">
            {t("reopenScenario")}
          </Button>
        </Panel>
      ) : null}

      {canEditScenario && canReopenScenario(event.status) && !canDeal(event.status) ? (
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

      {(amNarrator || user.isAdmin) && gameId && (live || event.status === "roles_assigned") ? (
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
