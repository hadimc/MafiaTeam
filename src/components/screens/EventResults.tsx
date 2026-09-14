"use client";

import { Button, FactionPill, Panel, SeatAvatar } from "@/components/ui";
import { BiTitle, LangToggle, usePageLang } from "@/components/bilingual";
import { CopyLinkIcon } from "@/components/CopyLink";
import { displayScenarioName } from "@/lib/briefing";
import {
  formatGameDuration,
  pickPlayerOfTheGame,
  potgWhyKey,
  recapHighlights,
  recapTimeline,
  recapViaKey,
  type RecapAction,
  type RecapPlayer,
} from "@/lib/gameRecap";
import { asFaction, gameOverview, type SideWins } from "@/lib/stats";

type ResultsEvent = {
  slug: string;
  title: string;
  titleEn: string;
  scenario: { name: string; nameEn: string } | null;
};

type ResultsGame = {
  currentDay: number;
  winningFaction: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  players: RecapPlayer[];
  actions: RecapAction[];
};

export function EventResults({ event, game }: { event: ResultsEvent; game: ResultsGame }) {
  const { lang, fa, tx, switchLang } = usePageLang();
  const winner = game.winningFaction;
  const winnerFaction = winner ? asFaction(winner) : undefined;
  const overview = gameOverview(game);
  const duration = formatGameDuration(game.startedAt, game.finishedAt, lang);
  const potg = pickPlayerOfTheGame(game.players, winner, game.actions);
  const timeline = recapTimeline(game.actions);
  const highlights = recapHighlights(game.actions);
  const title = fa ? event.title || event.titleEn : event.titleEn || event.title;
  const tableName = event.scenario
    ? displayScenarioName(event.scenario, event.slug, lang, event)
    : "";
  const byId = new Map(game.players.map((player) => [player.id, player]));

  function personName(player: RecapPlayer) {
    return fa
      ? player.user.displayName || player.user.displayNameEn
      : player.user.displayNameEn || player.user.displayName;
  }

  function roleName(player: RecapPlayer) {
    return fa ? player.roleName || player.roleNameEn : player.roleNameEn || player.roleName;
  }

  return (
    <div
      dir={fa ? "rtl" : "ltr"}
      lang={fa ? "fa" : "en"}
      className={`flex flex-1 flex-col gap-4 ${fa ? "farsi" : ""}`}
    >
      <div className="flex items-center justify-between gap-3">
        <Button href={`/events/${event.slug}`} variant="ghost" className="w-auto self-start min-h-10 px-3 text-sm">
          {tx("back")}
        </Button>
        <LangToggle
          fa={fa}
          onSwitch={switchLang}
          englishLabel={tx("langEnglish")}
          farsiLabel={tx("langFarsi")}
        />
      </div>

      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.22em] text-gold">{tx("resultOverview")}</p>
          <h1 className={`${fa ? "" : "display"} mt-1 text-3xl font-semibold leading-tight`}>{title}</h1>
          {tableName ? <p className="mt-2 text-sm text-muted">{tableName}</p> : null}
        </div>
        <CopyLinkIcon path={`/events/${event.slug}/results`} label={tx("copyLink")} />
      </header>

      <Panel className="space-y-3 text-sm">
        {winner ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted">{tx("winner")}</span>
            <span className="flex items-center gap-2 font-medium">
              {winnerFaction ? <FactionPill faction={winnerFaction} farsi={fa} /> : null}
            </span>
          </div>
        ) : null}
        <Row label={tx("daysPlayed")} value={`${tx("day")} ${overview.days}`} />
        <Row
          label={tx("players")}
          value={`${overview.seated} ${tx("seated")} · ${overview.living} ${tx("stillIn")} · ${overview.out} ${tx("eliminated")}`}
        />
        <Row label={tx("stillIn")} value={sideLine(overview.livingBySide, tx)} />
        <Row label={tx("dealtSides")} value={sideLine(overview.dealtBySide, tx)} />
        {duration ? <Row label={tx("duration")} value={duration} /> : null}
      </Panel>

      {potg ? (
        <Panel className="space-y-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-gold">{tx("playerOfTheGame")}</p>
          <div className="flex items-center gap-3">
            <SeatAvatar
              name={personName(potg.player)}
              seat={potg.player.seatNumber}
              faction={asFaction(potg.player.faction)}
              alive={potg.player.alive}
            />
            <div className="min-w-0">
              <p className={`${fa ? "" : "display"} text-lg font-semibold leading-tight`}>{personName(potg.player)}</p>
              <p className="text-sm text-muted">{roleName(potg.player)}</p>
            </div>
          </div>
          <p className="text-sm leading-6 text-muted">{tx(potgWhyKey(potg.why))}</p>
        </Panel>
      ) : null}

      <Panel>
        <h2 className="mb-3 text-sm text-muted">{tx("results")}</h2>
        <ol className="space-y-2">
          {game.players.map((player) => {
            const faction = asFaction(player.faction);
            const won = Boolean(winner && player.faction === winner);
            return (
              <li
                key={player.id}
                className={`flex items-center justify-between gap-3 rounded-2xl bg-bg-elev px-3 py-2.5 ${
                  player.alive ? "" : "opacity-55"
                }`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <SeatAvatar
                    name={personName(player)}
                    seat={player.seatNumber}
                    faction={faction}
                    alive={player.alive}
                  />
                  <span className="min-w-0">
                    <span className="block truncate">{personName(player)}</span>
                    <span className="block truncate text-[11px] text-muted">{roleName(player)}</span>
                  </span>
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1">
                  {faction ? <FactionPill faction={faction} farsi={fa} /> : null}
                  {won ? <span className="text-[11px] text-gold">{tx("won")}</span> : null}
                </span>
              </li>
            );
          })}
        </ol>
      </Panel>

      {timeline.length ? (
        <Panel className="space-y-3">
          <h2 className={`${fa ? "" : "display"} text-lg font-semibold`}>{tx("recapTimeline")}</h2>
          <ol className="space-y-2 text-sm">
            {timeline.map((row, index) => {
              const player = byId.get(row.playerId);
              const name = player ? personName(player) : row.playerId;
              return (
                <li key={`${row.day}-${row.kind}-${row.playerId}-${index}`} className="rounded-2xl bg-bg-elev px-4 py-3">
                  <p className="font-medium">
                    {tx("day")} {row.day} · {name}
                  </p>
                  <p className="mt-0.5 text-muted">
                    {row.kind === "left" ? tx("recapLeft") : tx("recapReturned")} · {tx(recapViaKey(row.via))}
                  </p>
                </li>
              );
            })}
          </ol>
        </Panel>
      ) : null}

      {highlights.length ? (
        <Panel className="space-y-3">
          <h2 className={`${fa ? "" : "display"} text-lg font-semibold`}>{tx("keyPlays")}</h2>
          <ol className="space-y-2 text-sm">
            {highlights.map((action, index) => (
              <li key={`${action.actionType}-${action.dayNumber}-${index}`} className="rounded-2xl bg-bg-elev px-4 py-3">
                <p className="text-[11px] text-gold">
                  {tx("day")} {action.dayNumber}
                </p>
                <BiTitle fa={action.message ?? ""} en={action.messageEn ?? ""} lang={lang} />
              </li>
            ))}
          </ol>
        </Panel>
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

function sideLine(sides: SideWins, tx: (key: "citizen" | "mafia" | "independent") => string) {
  return `${tx("citizen")} ${sides.citizen} · ${tx("mafia")} ${sides.mafia} · ${tx("independent")} ${sides.independent}`;
}
