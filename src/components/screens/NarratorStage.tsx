"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLang, enName } from "@/lib/lang";
import { Button, Panel, SeatAvatar } from "@/components/ui";
import { factionLabel } from "@/lib/stats";
import { TimerBar } from "@/components/TimerBar";
import { ExitCardShow, LotteryShow } from "@/components/HoldFlipCard";
import {
  dayTasks,
  jackCurseRound,
  lastNightReport,
  lecterSelfSaved,
  mafiaLikeOrder,
  mafiaMainTonight,
  nightLine,
  nightTasks,
  nextStage,
  persistStage,
  prevStage,
  publicPlayerIds,
  resolveNight,
  scenarioRoleKeys,
  stageFromGame,
  stageSubtitle,
  stageTitle,
  sixthSenseGuess,
  tonightAction,
  tonightPicks,
  tonightTarget,
  townLikeOrder,
  type Stage,
  type StageTask,
  type NightLine,
} from "@/lib/stages";
import { readSnapshot, type SnapshotExitCard } from "@/lib/scenario";
import {
  closeGameAction,
  drawExitCardAction,
  eliminatePlayerAction,
  endGameAction,
  resetGameAction,
  recordJackCurseAction,
  recordLeonShotAction,
  clearTonightAction,
  recordLotteryAction,
  recordStageAction,
  revivePlayerAction,
  setStageAction,
  startGameAction,
  swapRolesAction,
  resetFaceChangeAction,
} from "@/server/actions/games";

type Person = { displayName: string; displayNameEn: string };

type Player = {
  id: string;
  seatNumber: number;
  roleKey: string;
  roleName: string;
  roleNameEn: string;
  faction: "citizen" | "mafia" | "independent";
  alive: boolean;
  user: Person;
};

type Game = {
  id: string;
  currentDay: number;
  currentPhase: string;
  status: string;
  winningFaction: string | null;
  scenarioSnapshot: string;
  event: { title: string; titleEn: string; slug: string };
  players: Player[];
  votes: { voteType: string; dayNumber: number; targetPlayerId: string; count: number }[];
  draws: { playerId: string; cardName: string; cardNameEn: string }[];
  actions: { id: string; actionType: string; messageEn: string; message: string; dayNumber: number; phase: string; targetPlayerId: string | null; metadata?: string | null }[];
};

export function NarratorStage({ game }: { game: Game }) {
  const { t } = useLang();
  const [open, setOpen] = useState<string | null>(null);
  const [lotteryOpen, setLotteryOpen] = useState(false);
  const [exitCard, setExitCard] = useState<SnapshotExitCard | null>(null);
  const [jackOut, setJackOut] = useState<{ jackName: string; cursedName: string } | null>(null);
  const [danger, setDanger] = useState<null | "end" | "reset">(null);

  useEffect(() => {
    if (game.currentPhase === "lobby" && game.status !== "finished") {
      void startGameAction(game.id);
    }
  }, [game.currentPhase, game.status, game.id]);

  const stage = stageFromGame(game);
  const living = game.players.filter((player) => player.alive);
  const dead = game.players.filter((player) => !player.alive);
  const snapshot = readSnapshot(game.scenarioSnapshot);
  const remainingCards = snapshot.exitCards.filter((item) => !item.used);
  const scenarioKeys = scenarioRoleKeys(snapshot.roles);
  const publicIds = publicPlayerIds(game.actions);
  const lineFor = (roleKey: string) => nightLine(roleKey, scenarioKeys, game.players, publicIds);
  const scriptRoles = [...scenarioKeys].filter((key) => lineFor(key) !== "skip");
  const livingRoles = new Set(living.map((player) => player.roleKey));
  const mayorCoupon = game.actions.find(
    (action) => action.actionType === "mayorVeto" || action.actionType === "mayorCoupon",
  );
  const tasks =
    stage.kind === "day"
      ? dayTasks(stage, scriptRoles, mayorCoupon?.dayNumber ?? null, livingRoles)
      : nightTasks(
          stage,
          dead.length > 0,
          lineFor,
          game.actions.find((action) => action.actionType === "faceChange")?.dayNumber ?? null,
        );
  const name = (player?: Player) => (!player ? "—" : enName(player.user));
  const counts = {
    citizen: living.filter((player) => player.faction === "citizen").length,
    mafia: living.filter((player) => player.faction === "mafia").length,
    independent: living.filter((player) => player.faction === "independent").length,
  };
  const back = prevStage(stage);
  const ahead = nextStage(stage);

  async function overrideSeat(playerId: string, currentlyAlive: boolean, reason = "override") {
    if (currentlyAlive) {
      const result = await eliminatePlayerAction(game.id, playerId, reason);
      if (result && "jackOut" in result && result.jackOut) setJackOut(result.jackOut);
      return;
    }
    await revivePlayerAction(game.id, playerId);
  }

  async function go(to: "next" | "prev") {
    const target = to === "next" ? ahead : back;
    if (!target) return;
    const result = await setStageAction(game.id, persistStage(target));
    if (result && "jackOut" in result && result.jackOut) setJackOut(result.jackOut);
  }

  return (
    <div className="flex flex-1 flex-col pb-28">
      <header className="sticky top-0 z-20 -mx-5 space-y-3 border-b border-line bg-bg/95 px-5 py-4 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-[11px] uppercase tracking-[0.22em] text-gold">
            <Link href={`/events/${game.event.slug}`} className="hover:text-ink">
              {game.event.titleEn || game.event.title}
            </Link>
          </p>
          <Button href="/dashboard" variant="ghost" className="w-auto min-h-9 shrink-0 px-3 text-sm">
            {t("exitGame")}
          </Button>
        </div>
        <h1 className="display text-3xl font-semibold">{stageTitle(stage)}</h1>
        <p className="text-sm text-muted">{stageSubtitle(stage)}</p>
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={() => go("prev")} variant="ghost" disabled={!back}>
            {t("previous")}
          </Button>
          <Button onClick={() => go("next")}>{t("next")}</Button>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-4 gap-2 text-center">
        <Stat label={t("living")} value={living.length} />
        <Stat label={t("town")} value={counts.citizen} accent="text-citizen" />
        <Stat label={t("mafia")} value={counts.mafia} accent="text-mafia" />
        <Stat label={t("independent")} value={counts.independent} accent="text-indie" />
      </div>

      <SeatOverride
        living={living}
        dead={dead}
        name={name}
        onToggle={overrideSeat}
        blockedId={tonightTarget(game.actions, game.currentDay, "matador")}
      />

      <ol className="mt-5 space-y-2">
        {tasks.map((task, index) => (
          <li key={task.key}>
            <button
              type="button"
              onClick={() => setOpen((current) => (current === task.key ? null : task.key))}
              className="flex w-full items-start gap-3 rounded-2xl border border-line bg-card/90 px-4 py-3 text-start"
            >
              <span className="display mt-0.5 w-6 text-gold">{index + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{task.nameEn}</span>
                <span dir="rtl" lang="fa" className="farsi block text-[12px] text-muted">
                  {task.nameFa}
                </span>
              </span>
            </button>
            {open === task.key ? (
              <TaskBody
                task={task}
                stage={stage}
                game={game}
                living={living}
                dead={dead}
                name={name}
                remainingCards={remainingCards}
                counts={counts}
                onLottery={() => setLotteryOpen(true)}
                onExitCard={setExitCard}
                onRemove={(playerId, reason) => overrideSeat(playerId, true, reason)}
                lineFor={lineFor}
              />
            ) : null}
          </li>
        ))}
      </ol>

      {game.winningFaction ? (
        <p className="display mt-4 text-center text-gold">
          {t("winner")}: {factionLabel(game.winningFaction)}
        </p>
      ) : null}

      {danger === "end" ? (
        <Panel className="mt-4 space-y-3">
          <p className="text-sm text-muted">{t("gameOverWarn")}</p>
          <Button
            onClick={() => {
              setDanger(null);
              void endGameAction(game.id, "citizen");
            }}
            variant="danger"
          >
            {t("townWins")}
          </Button>
          <Button
            onClick={() => {
              setDanger(null);
              void endGameAction(game.id, "mafia");
            }}
            variant="danger"
          >
            {t("mafiaWins")}
          </Button>
          <Button
            onClick={() => {
              setDanger(null);
              void endGameAction(game.id, "independent");
            }}
            variant="danger"
          >
            {t("independentWins")}
          </Button>
          <Button onClick={() => setDanger(null)} variant="ghost">
            {t("cancel")}
          </Button>
        </Panel>
      ) : danger === "reset" ? (
        <Panel className="mt-4 space-y-3">
          <p className="text-sm text-muted">{t("resetGameWarn")}</p>
          <Button onClick={() => resetGameAction(game.id)} variant="danger">
            {t("yesResetGame")}
          </Button>
          <Button onClick={() => setDanger(null)} variant="ghost">
            {t("cancel")}
          </Button>
        </Panel>
      ) : (
        <div className="mt-4 space-y-2">
          {game.winningFaction ? (
            <Button onClick={() => closeGameAction(game.id)}>{t("closeGame")}</Button>
          ) : null}
          <div className="grid grid-cols-3 gap-2">
            <Button href={`/games/${game.id}/narrator/history`} variant="ghost">
              {t("history")}
            </Button>
            <Button onClick={() => setDanger("end")} variant="ghost">
              {game.winningFaction ? t("changeWinner") : t("gameOver")}
            </Button>
            <Button onClick={() => setDanger("reset")} variant="ghost">
              {t("resetGame")}
            </Button>
          </div>
        </div>
      )}

      <TimerBar />

      {lotteryOpen ? (
        <LotteryShow
          onClose={() => setLotteryOpen(false)}
          onReveal={(color) => {
            void recordLotteryAction(game.id, color);
          }}
        />
      ) : null}
      {exitCard ? (
        <ExitCardShow
          card={exitCard}
          onClose={() => setExitCard(null)}
          onDrawn={() => {
            void drawExitCardAction(game.id, exitCard.id);
          }}
        />
      ) : null}
      {jackOut ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-5">
          <div className="w-full max-w-sm rounded-3xl border border-gold/40 bg-card px-5 py-6 text-center shadow-[0_24px_60px_rgba(0,0,0,0.55)]">
            <p className="text-[11px] uppercase tracking-[0.22em] text-gold">Announce now</p>
            <h2 className="display mt-3 text-3xl font-semibold">Jack is out</h2>
            <p dir="rtl" lang="fa" className="farsi mt-2 text-xl text-gold">
              جک گنجشکه حذف شد
            </p>
            <p className="mt-4 text-sm leading-6 text-muted">
              The curse left with {jackOut.cursedName}. Jack ({jackOut.jackName}) leaves with it.
            </p>
            <Button className="mt-6" onClick={() => setJackOut(null)}>
              Announced
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TaskBody({
  task,
  stage,
  game,
  living,
  dead,
  name,
  remainingCards,
  counts,
  onLottery,
  onExitCard,
  onRemove,
  lineFor,
}: {
  task: StageTask;
  stage: Stage;
  game: Game;
  living: Player[];
  dead: Player[];
  name: (player?: Player) => string;
  remainingCards: SnapshotExitCard[];
  counts: { citizen: number; mafia: number; independent: number };
  onLottery: () => void;
  onExitCard: (card: SnapshotExitCard) => void;
  onRemove: (playerId: string, reason: string) => void;
  lineFor: (roleKey: string) => NightLine;
}) {
  const introNight = stage.kind === "night" && stage.n === 0;
  const mayorCouponUsed = game.actions.some(
    (action) => action.actionType === "mayorVeto" || action.actionType === "mayorCoupon",
  );
  const jackPlayer = game.players.find((player) => player.roleKey === "jack");
  const jackShown = Boolean(
    jackPlayer &&
      game.actions.some((action) => action.actionType === "shown" && action.targetPlayerId === jackPlayer.id),
  );
  const curses = jackCurseRound(game.actions, living, game.currentDay);
  const byId = new Map(game.players.map((player) => [player.id, player]));
  const night = lastNightReport(game.actions, game.currentDay, game.players);
  const inquiriesUsed = game.actions.filter((action) => action.actionType === "inquiry").length;
  const mafiaLikes = mafiaLikeOrder(living);
  const townLikes = townLikeOrder(living);

  const mafiaSummary = introNight
    ? "Intro night only. Call likes in this order. No shot tonight."
    : task.summaryEn;
  const townSummary = introNight
    ? "Intro night only. Thumbs-up in this order when you name the role. No abilities tonight."
    : task.summaryEn;

  return (
    <Panel className="mt-2 space-y-3">
      <p className="text-sm">
        {task.key === "mafia" ? mafiaSummary : task.key === "town" ? townSummary : task.summaryEn}
      </p>
      {introNight && (task.key === "mafia" || task.key === "town") ? null : (
        <p className="text-[12px] text-muted">{task.notesEn}</p>
      )}

      {task.key === "speak" || task.key === "defense" ? (
        <p className="text-xs text-gold">Use the 1 min / 30 sec timers at the bottom.</p>
      ) : null}

      {task.key === "nightBrief" ? (
        <NightReport
          leave={night.leaveIds.map((id) => byId.get(id))}
          back={night.returnIds.map((id) => byId.get(id))}
          name={name}
        />
      ) : null}

      {task.key === "nightEnd" ? <NightPreview game={game} name={name} byId={byId} /> : null}

      {task.key === "inquiry" ? (
        <InquiryReport
          gameId={game.id}
          inPlay={counts}
          out={{
            citizen: dead.filter((player) => player.faction === "citizen").length,
            mafia: dead.filter((player) => player.faction === "mafia").length,
            independent: dead.filter((player) => player.faction === "independent").length,
          }}
          used={inquiriesUsed}
        />
      ) : null}

      {task.key === "nostradamus" ? (
        lineFor("nostradamus") === "record" ? (
          <PickList
            label="Target"
            players={living}
            name={name}
            onPick={(player) =>
              recordStageAction(game.id, task.key, `${task.nameEn} → ${name(player)}`, player.id)
            }
          />
        ) : (
          <p className="text-xs text-muted">Say the line. Nothing to record.</p>
        )
      ) : null}

      {task.key === "jack" ? (
        lineFor("jack") === "record" && !jackShown ? (
          <JackCurse
            gameId={game.id}
            living={living}
            name={name}
            curses={curses}
            byId={byId}
            frozen={false}
          />
        ) : (
          <p className="text-xs text-muted">
            {jackShown ? "The curse stays where it is." : "Say the line. Nothing to record."}
          </p>
        )
      ) : null}

      {task.key === "mafia" && introNight ? <LikeOrder label="Like order" players={mafiaLikes} name={name} /> : null}
      {task.key === "town" && introNight ? (
        <LikeOrder label="Thumbs-up order" players={townLikes} name={name} />
      ) : null}

      {task.key === "mafia" && !introNight ? (
        <MafiaNight game={game} living={living} name={name} lineFor={lineFor} />
      ) : null}

      {task.key === "town" && !introNight ? (
        <TownNight game={game} living={living} dead={dead} name={name} lineFor={lineFor} />
      ) : null}

      {task.key === "faceChange" ? (
        <FaceChange
          dead={dead}
          living={living}
          name={name}
          gameId={game.id}
          used={game.actions.find((action) => action.actionType === "faceChange")}
        />
      ) : null}

      {task.key === "mayorVeto" ? (
        mayorCouponUsed ? (
          <p className="text-sm text-gold">Coupon used. This step will not appear on later days.</p>
        ) : (
          <Button onClick={() => recordStageAction(game.id, "mayorCoupon", "Mayor used the voting coupon")}>
            Use coupon
          </Button>
        )
      ) : null}

      {task.key === "lottery" ? (
        <Button variant="ghost" onClick={onLottery}>
          Draw Blue / Green
        </Button>
      ) : null}

      {task.key === "exitCard" ? (
        remainingCards.length === 0 ? (
          <p className="text-xs text-muted">No exit cards left in the deck.</p>
        ) : (
          <div className="grid grid-cols-5 gap-2">
            {remainingCards.map((item) => (
              <button
                key={item.id}
                type="button"
                className="playing-card card-pattern min-h-16 rounded-xl text-sm font-semibold text-gold"
                onClick={() => onExitCard(item)}
                aria-label={item.nameEn}
              />
            ))}
          </div>
        )
      ) : null}

      {task.key === "removePlayers" ? (
        <PickList
          label="Tap to remove"
          players={living}
          name={name}
          onPick={(player) => onRemove(player.id, "day")}
        />
      ) : null}
    </Panel>
  );
}

function NightReport({
  leave,
  back,
  name,
}: {
  leave: (Player | undefined)[];
  back: (Player | undefined)[];
  name: (player?: Player) => string;
}) {
  const independents = leave.filter(
    (player): player is Player => Boolean(player) && player.faction === "independent",
  );
  return (
    <div className="space-y-3">
      <ReportNames label="Leave the game" players={leave} name={name} empty="Nobody leaves." />
      {independents.map((player) => (
        <div key={player.id} className="rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-gold">Announce</p>
          <p className="mt-1 font-semibold">{player.roleNameEn} is out</p>
          <p dir="rtl" lang="fa" className="farsi mt-1 text-sm text-gold">
            {player.roleName} حذف شد
          </p>
          <p className="mt-2 text-sm text-muted">
            {name(player)} was {player.roleNameEn}.
          </p>
        </div>
      ))}
      <ReportNames label="Back in the game" players={back} name={name} empty="Nobody returns." />
    </div>
  );
}

const NIGHT_PICK_LABELS: { key: string; label: string }[] = [
  { key: "mafiaShot", label: "Mafia shot" },
  { key: "sixthSense", label: "Sixth sense" },
  { key: "saul", label: "Purchase" },
  { key: "lecter", label: "Lecter save" },
  { key: "matador", label: "Matador block" },
  { key: "watson", label: "Watson save" },
  { key: "leon", label: "Leon shot" },
  { key: "kane", label: "Kane coupon" },
  { key: "constantine", label: "Constantine" },
  { key: "gunner", label: "Gunner" },
  { key: "jack", label: "Jack curse" },
];

function NightPreview({
  game,
  name,
  byId,
}: {
  game: Game;
  name: (player?: Player) => string;
  byId: Map<string, Player>;
}) {
  const preview = resolveNight(game.actions, game.players, game.currentDay);
  const picks = tonightPicks(game.actions, game.currentDay);
  const recorded = NIGHT_PICK_LABELS.flatMap((item) => {
    const id = picks.get(item.key);
    return id ? [{ ...item, player: byId.get(id) }] : [];
  });

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-[11px] uppercase tracking-wide text-muted">Recorded tonight</p>
        {recorded.length === 0 ? (
          <p className="text-sm text-muted">Nothing recorded.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {recorded.map((row) => (
              <li key={row.key}>
                {row.label}: {name(row.player)}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <p className="mb-2 text-[11px] uppercase tracking-wide text-muted">Why</p>
        <ul className="space-y-2">
          {preview.notes.map((note) => (
            <li key={note} className="text-sm text-gold">
              {note}
            </li>
          ))}
        </ul>
      </div>
      <ReportNames
        label="Would leave"
        players={preview.leaveIds.map((id) => byId.get(id))}
        name={name}
        empty="Nobody leaves."
      />
      <ReportNames
        label="Would return"
        players={preview.returnIds.map((id) => byId.get(id))}
        name={name}
        empty="Nobody returns."
      />
      {preview.shieldBreakIds.length > 0 ? (
        <ReportNames
          label="Shield breaks"
          players={preview.shieldBreakIds.map((id) => byId.get(id))}
          name={name}
          empty="None."
        />
      ) : null}
    </div>
  );
}

function ReportNames({
  label,
  players,
  name,
  empty,
}: {
  label: string;
  players: (Player | undefined)[];
  name: (player?: Player) => string;
  empty: string;
}) {
  const list = players.filter((player): player is Player => Boolean(player));
  return (
    <div>
      <p className="mb-2 text-[11px] uppercase tracking-wide text-muted">{label}</p>
      {list.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {list.map((player) => (
            <li
              key={player.id}
              className="flex items-center gap-3 rounded-2xl border border-line bg-bg-elev px-3 py-2"
            >
              <SeatAvatar name={name(player)} seat={player.seatNumber} faction={player.faction} alive={player.alive} />
              <span className="truncate text-sm">{name(player)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function InquiryReport({
  gameId,
  inPlay,
  out,
  used,
}: {
  gameId: string;
  inPlay: { citizen: number; mafia: number; independent: number };
  out: { citizen: number; mafia: number; independent: number };
  used: number;
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1 text-[11px] uppercase tracking-wide text-muted">Out of the game</p>
        <p className="text-sm">
          Citizen {out.citizen} · Mafia {out.mafia} · Independent {out.independent}
        </p>
      </div>
      <div>
        <p className="mb-1 text-[11px] uppercase tracking-wide text-muted">Still in play</p>
        <p className="text-sm">
          Citizen {inPlay.citizen} · Mafia {inPlay.mafia} · Independent {inPlay.independent}
        </p>
      </div>
      <p className="text-xs text-muted">{used}/2 inquiries used</p>
      <Button
        disabled={used >= 2}
        onClick={() =>
          recordStageAction(
            gameId,
            "inquiry",
            `Inquiry asked. Out: Citizen ${out.citizen}, Mafia ${out.mafia}, Independent ${out.independent}. In play: Citizen ${inPlay.citizen}, Mafia ${inPlay.mafia}, Independent ${inPlay.independent}.`,
          )
        }
      >
        Inquiry asked
      </Button>
    </div>
  );
}

function JackCurse({
  gameId,
  living,
  name,
  curses,
  byId,
  frozen,
}: {
  gameId: string;
  living: Player[];
  name: (player?: Player) => string;
  curses: ReturnType<typeof jackCurseRound>;
  byId: Map<string, Player>;
  frozen: boolean;
}) {
  const eligible = living.filter((player) => curses.eligibleIds.includes(player.id));
  return (
    <div className="space-y-3">
      {curses.nights.length > 0 ? (
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-wide text-muted">
            Curse history · round {curses.round}
          </p>
          <ol className="space-y-1 text-sm">
            {curses.nights.map((row) => (
              <li key={`${row.day}-${row.playerId}`} className="flex items-center justify-between gap-2">
                <span className="text-muted">Night {row.day}</span>
                <span className="flex items-center gap-2">
                  {curses.active?.day === row.day && curses.active.playerId === row.playerId ? (
                    <span className="text-[10px] uppercase tracking-wide text-gold">current</span>
                  ) : null}
                  <span>{name(byId.get(row.playerId))}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : (
        <p className="text-xs text-muted">No curse recorded yet.</p>
      )}
      {curses.newRound ? (
        <p className="text-xs text-gold">New round. All remaining players can take the curse again.</p>
      ) : null}
      {frozen ? (
        <p className="text-sm text-gold">The curse stays where it is.</p>
      ) : eligible.length === 0 ? (
        <p className="text-sm text-muted">No living players left to curse.</p>
      ) : (
        <PickList
          label={curses.tonightId ? "Switch tonight’s curse" : "Curse tonight"}
          players={eligible}
          name={name}
          selectedId={curses.tonightId}
          onPick={(player) => recordJackCurseAction(gameId, player.id)}
        />
      )}
    </div>
  );
}

function LikeOrder({
  label,
  players,
  name,
}: {
  label: string;
  players: Player[];
  name: (player?: Player) => string;
}) {
  if (players.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <ol className="space-y-2">
        {players.map((player, index) => (
          <li
            key={player.id}
            className="flex items-center gap-3 rounded-2xl border border-line bg-bg-elev px-3 py-2"
          >
            <span className="display w-6 text-gold">{index + 1}</span>
            <SeatAvatar name={name(player)} seat={player.seatNumber} faction={player.faction} alive={player.alive} />
            <span className="min-w-0">
              <span className="block truncate text-sm">{name(player)}</span>
              <span className="block text-[12px] text-muted">{player.roleNameEn}</span>
              <span dir="rtl" lang="fa" className="farsi block text-[11px] text-muted">
                {player.roleName}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function PickList({
  label,
  players,
  name,
  onPick,
  selectedId,
  showRole = false,
  markedId,
  markedNote,
}: {
  label: string;
  players: Player[];
  name: (player?: Player) => string;
  onPick: (player: Player) => void;
  selectedId?: string | null;
  showRole?: boolean;
  markedId?: string | null;
  markedNote?: string;
}) {
  if (players.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <div className="grid grid-cols-2 gap-2">
        {players.map((player) => (
          <button
            key={player.id}
            type="button"
            onClick={() => onPick(player)}
            className={`flex min-h-12 items-center gap-2 rounded-2xl border px-3 text-start text-sm ${
              selectedId === player.id ? "border-gold bg-gold/10 text-gold" : "border-line bg-bg-elev"
            }`}
          >
            <SeatAvatar name={name(player)} seat={player.seatNumber} faction={player.faction} alive={player.alive} />
            <span className="min-w-0 truncate">
              <span className="block truncate">{name(player)}</span>
              {showRole ? (
                <span className="block truncate text-[11px] text-muted">{player.roleNameEn || player.roleName}</span>
              ) : null}
              {markedId === player.id && markedNote ? (
                <span className="block truncate text-[11px] font-semibold text-gold">{markedNote}</span>
              ) : null}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function SeatOverride({
  living,
  dead,
  name,
  onToggle,
  blockedId,
}: {
  living: Player[];
  dead: Player[];
  name: (player?: Player) => string;
  onToggle: (playerId: string, currentlyAlive: boolean) => void;
  blockedId?: string | null;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="w-full rounded-2xl border border-line bg-card/90 px-4 py-3 text-start text-sm font-semibold"
      >
        Seats - Add/Remove
      </button>
      {open ? (
        <Panel className="mt-2 space-y-3">
          <p className="text-xs text-muted">Overrides the night rules. Use anytime.</p>
          <PickList
            label="Remove from the game"
            players={living}
            name={name}
            showRole
            markedId={blockedId}
            markedNote="Cannot act tonight"
            onPick={(player) => onToggle(player.id, true)}
          />
          <PickList
            label="Add back in"
            players={dead}
            name={name}
            showRole
            onPick={(player) => onToggle(player.id, false)}
          />
        </Panel>
      ) : null}
    </div>
  );
}

function NightAbility({
  title,
  line,
  blocked,
  children,
}: {
  title: string;
  line: NightLine;
  blocked?: string | null;
  children: React.ReactNode;
}) {
  if (line === "skip") return null;
  return (
    <div>
      <p className="mb-2 text-[11px] uppercase tracking-wide text-muted">{title}</p>
      {line === "cover" ? (
        <p className="text-xs text-muted">Say the line. Nothing to record.</p>
      ) : blocked ? (
        <CannotActNote who={blocked} />
      ) : (
        children
      )}
    </div>
  );
}

function CannotActNote({ who }: { who: string }) {
  return (
    <div className="rounded-2xl border border-gold/50 bg-gold/10 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.22em] text-gold">Cannot act tonight</p>
      <p dir="rtl" lang="fa" className="farsi mt-1 text-sm text-gold">
        امشب توانایی ندارد
      </p>
      <p className="mt-2 text-sm font-semibold">{who}</p>
      <p className="mt-1 text-xs text-muted">Matador took this ability. Say the line. Do not record.</p>
    </div>
  );
}

function MafiaNight({
  game,
  living,
  name,
  lineFor,
}: {
  game: Game;
  living: Player[];
  name: (player?: Player) => string;
  lineFor: (roleKey: string) => NightLine;
}) {
  const [main, setMain] = useState<"mafiaShot" | "sixthSense" | "saul" | null>(null);
  const taken = mafiaMainTonight(game.actions, game.currentDay);
  const saulUsed = game.actions.some(
    (action) => action.actionType === "saul" && action.dayNumber !== game.currentDay,
  );
  const blocked = game.players.find(
    (player) => player.id === tonightTarget(game.actions, game.currentDay, "matador"),
  );
  const blockedRole = blocked?.roleKey;
  const canShot = living.some((player) => player.faction === "mafia") && blockedRole !== "godfather";
  const canSixth = living.some((player) => player.roleKey === "godfather") && blockedRole !== "godfather";
  const canBuy = living.some((player) => player.roleKey === "saul") && !saulUsed && blockedRole !== "saul";
  const lecter = living.find((player) => player.roleKey === "lecter");
  const lecterSelfUsed = Boolean(
    lecter && lecterSelfSaved(
      game.actions.filter((action) => action.dayNumber !== game.currentDay),
      lecter.id,
    ),
  );
  const lecterTargets = living.filter(
    (player) => player.faction === "mafia" && !(player.roleKey === "lecter" && lecterSelfUsed),
  );
  const lecterPick = tonightTarget(game.actions, game.currentDay, "lecter");
  const sixthAction = tonightAction(game.actions, game.currentDay, "sixthSense");
  const sixthTarget = sixthAction?.targetPlayerId ?? null;
  const sixthGuess = sixthSenseGuess(sixthAction);
  const options = [
    ...(canShot ? [{ key: "mafiaShot" as const, label: "Shot" }] : []),
    ...(canSixth ? [{ key: "sixthSense" as const, label: "Sixth sense" }] : []),
    ...(canBuy ? [{ key: "saul" as const, label: "Purchase" }] : []),
  ];
  const requested = main ?? (taken?.actionType as "mafiaShot" | "sixthSense" | "saul" | undefined) ?? null;
  const selectedMain = options.some((option) => option.key === requested) ? requested : null;
  return (
    <div className="space-y-4">
      <p className="text-xs text-gold">Say the list for roles in this scenario. Tap a different name to correct it. Nobody leaves yet.</p>
      <div>
        <p className="mb-2 text-[11px] uppercase tracking-wide text-muted">Main action — pick one</p>
        {blockedRole === "godfather" && blocked ? (
          <CannotActNote who={`${name(blocked)} (${blocked.roleNameEn})`} />
        ) : null}
        {options.length === 0 && blockedRole !== "godfather" ? (
          <p className="text-xs text-muted">Mafia is out. Say the line if the table should not know. Nothing to record.</p>
        ) : options.length > 0 ? (
          <>
            <div className={`grid gap-2 ${options.length === 3 ? "grid-cols-3" : options.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
              {options.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setMain(option.key)}
                  className={`min-h-12 rounded-2xl border px-2 text-xs font-semibold ${
                    selectedMain === option.key ? "border-gold bg-gold/10 text-gold" : "border-line bg-bg-elev"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {selectedMain ? (
              <div className="mt-3">
                <PickList
                  label={
                    selectedMain === "sixthSense"
                      ? "Guess — then Cancel, Wrong, or Correct"
                      : "Target — tap again to change"
                  }
                  players={living}
                  name={name}
                  selectedId={tonightTarget(game.actions, game.currentDay, selectedMain)}
                  onPick={(player) => {
                    void recordStageAction(
                      game.id,
                      selectedMain,
                      `Mafia ${selectedMain} → ${name(player)}`,
                      player.id,
                    );
                  }}
                />
                {selectedMain === "sixthSense" && sixthTarget ? (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <Button
                      variant="ghost"
                      className="min-h-9! px-2 text-xs"
                      onClick={() => {
                        void clearTonightAction(game.id, "sixthSense");
                        setMain(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant={sixthGuess === "wrong" ? "primary" : "ghost"}
                      className="min-h-9! px-2 text-xs"
                      onClick={() =>
                        void recordStageAction(
                          game.id,
                          "sixthSense",
                          `Sixth sense wrong → ${name(living.find((player) => player.id === sixthTarget))}`,
                          sixthTarget,
                          JSON.stringify({ result: "wrong" }),
                        )
                      }
                    >
                      Wrong
                    </Button>
                    <Button
                      variant={sixthGuess === "correct" ? "primary" : "ghost"}
                      className="min-h-9! px-2 text-xs"
                      onClick={() =>
                        void recordStageAction(
                          game.id,
                          "sixthSense",
                          `Sixth sense correct → ${name(living.find((player) => player.id === sixthTarget))}`,
                          sixthTarget,
                          JSON.stringify({ result: "correct" }),
                        )
                      }
                    >
                      Correct
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
      <NightAbility
        title="Lecter save"
        line={lineFor("lecter")}
        blocked={blockedRole === "lecter" && blocked ? `${name(blocked)} (${blocked.roleNameEn})` : null}
      >
        {lecterSelfUsed ? <p className="mb-2 text-xs text-gold">Self-save already used. Lecter cannot save themselves again.</p> : null}
        <PickList
          label="Save — tap again to change"
          players={lecterTargets}
          name={name}
          selectedId={lecterPick}
          onPick={(player) => recordStageAction(game.id, "lecter", `Lecter save → ${name(player)}`, player.id)}
        />
        {lecter && lecterPick === lecter.id ? (
          <p className="mt-2 text-xs text-gold">Self-save (once). Lecter cannot do this again.</p>
        ) : null}
      </NightAbility>
      <NightAbility title="Matador disability" line={lineFor("matador")}>
        <PickList
          label="Block — tap again to change"
          players={living}
          name={name}
          selectedId={blocked?.id}
          markedId={blocked?.id}
          markedNote="Cannot act tonight"
          showRole
          onPick={(player) => recordStageAction(game.id, "matador", `Matador block → ${name(player)}`, player.id)}
        />
        {blocked ? <CannotActNote who={`${name(blocked)} (${blocked.roleNameEn})`} /> : null}
      </NightAbility>
    </div>
  );
}

function TownNight({
  game,
  living,
  dead,
  name,
  lineFor,
}: {
  game: Game;
  living: Player[];
  dead: Player[];
  name: (player?: Player) => string;
  lineFor: (roleKey: string) => NightLine;
}) {
  const watson = living.find((player) => player.roleKey === "watson");
  const leon = living.find((player) => player.roleKey === "leon");
  const watsonSelfUsed = Boolean(
    watson &&
      game.actions.some(
        (action) =>
          action.actionType === "watson" &&
          action.targetPlayerId === watson.id &&
          action.dayNumber !== game.currentDay,
      ),
  );
  const watsonTargets = living.filter((player) => !(player.roleKey === "watson" && watsonSelfUsed));
  const leonNights = new Set(
    game.actions
      .filter((action) => action.actionType === "leon" && action.dayNumber !== game.currentDay)
      .map((action) => action.dayNumber),
  );
  const extras = [
    { key: "constantine", label: "Constantine — spirit", cancel: null, players: dead, once: true },
    { key: "gunner", label: "Gunner — give gun", cancel: null, players: living, once: false },
  ] as const;
  const kane = living.find((player) => player.roleKey === "kane");
  const kaneUsed = game.actions.some(
    (action) => action.actionType === "kane" && action.dayNumber !== game.currentDay,
  );
  const kaneTarget = tonightTarget(game.actions, game.currentDay, "kane");
  const kaneLine = lineFor("kane");
  const detectiveLine = lineFor("detective");
  const leonTarget = tonightTarget(game.actions, game.currentDay, "leon");
  const preview = resolveNight(game.actions, game.players, game.currentDay);
  const kaneNotes = preview.notes.filter((note) => /kane/i.test(note));
  const leonNotes = preview.notes.filter((note) => /leon|citizen hit|lecter|shield/i.test(note));
  const leonLine = lineFor("leon");
  const leonSpent = leonNights.size >= 2;
  const blocked = game.players.find(
    (player) => player.id === tonightTarget(game.actions, game.currentDay, "matador"),
  );
  const blockedRole = blocked?.roleKey;
  const blockedWho = blocked ? `${name(blocked)} (${blocked.roleNameEn})` : null;

  return (
    <div className="space-y-4">
      <p className="text-xs text-gold">Say the list for roles in this scenario. Tap a different name to correct a mistake. Removals wait until Next.</p>
      <NightAbility title="Dr. Watson — save" line={lineFor("watson")} blocked={blockedRole === "watson" ? blockedWho : null}>
        <PickList
          label="Save — tap again to change"
          players={watsonTargets}
          name={name}
          selectedId={tonightTarget(game.actions, game.currentDay, "watson")}
          onPick={(player) => recordStageAction(game.id, "watson", `Watson save → ${name(player)}`, player.id)}
        />
      </NightAbility>
      {leonLine === "skip" ? null : (
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-wide text-muted">Leon — shot</p>
          {leonLine === "cover" || leonSpent || !leon ? (
            <p className="text-xs text-muted">
              {leonSpent ? "Leon’s two shots are spent. Still say the line." : "Say the line. Nothing to record."}
            </p>
          ) : blockedRole === "leon" && blockedWho ? (
            <CannotActNote who={blockedWho} />
          ) : (
            <>
              <PickList
                label="If Leon shoots — tap the name again to cancel"
                players={living.filter((player) => player.id !== leon.id)}
                name={name}
                selectedId={leonTarget}
                onPick={(player) => {
                  if (leonTarget === player.id) {
                    void clearTonightAction(game.id, "leon");
                    return;
                  }
                  void recordLeonShotAction(game.id, player.id);
                }}
              />
              {leonTarget ? (
                <Button variant="ghost" className="mt-2" onClick={() => clearTonightAction(game.id, "leon")}>
                  Cancel shot
                </Button>
              ) : null}
              {leonNotes.map((note) => (
                <p key={note} className="mt-2 text-xs text-gold">
                  {note}
                </p>
              ))}
            </>
          )}
        </div>
      )}
      {kaneLine === "skip" ? null : (
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-wide text-muted">Citizen Kane — coupon</p>
          {kaneLine === "cover" || kaneUsed || !kane ? (
            <p className="text-xs text-muted">
              {kaneUsed ? "Coupon already used. Still say the line." : "Say the line. Nothing to record."}
            </p>
          ) : blockedRole === "kane" && blockedWho ? (
            <CannotActNote who={blockedWho} />
          ) : (
            <>
              <PickList
                label="Target — tap the name again to cancel"
                players={living.filter((player) => player.id !== kane.id)}
                name={name}
                selectedId={kaneTarget}
                onPick={(player) => {
                  if (kaneTarget === player.id) {
                    void clearTonightAction(game.id, "kane");
                    return;
                  }
                  void recordStageAction(game.id, "kane", `Kane coupon → ${name(player)}`, player.id);
                }}
              />
              {kaneTarget ? (
                <Button variant="ghost" className="mt-2" onClick={() => clearTonightAction(game.id, "kane")}>
                  Cancel coupon
                </Button>
              ) : null}
              {kaneNotes.map((note) => (
                <p key={note} className="mt-2 text-xs text-gold">
                  {note}
                </p>
              ))}
            </>
          )}
        </div>
      )}
      {detectiveLine === "skip" ? null : (
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-wide text-muted">Detective</p>
          <p className="text-xs text-muted">Say the line. Do not record the inquiry.</p>
        </div>
      )}
      {extras.map((item) => {
        const line = lineFor(item.key);
        const usedBefore = game.actions.some(
          (action) => action.actionType === item.key && action.dayNumber !== game.currentDay,
        );
        const spent = item.once && usedBefore;
        const selectedId = tonightTarget(game.actions, game.currentDay, item.key);
        if (line === "skip") return null;
        return (
          <div key={item.key}>
            <p className="mb-2 text-[11px] uppercase tracking-wide text-muted">{item.label}</p>
            {line === "cover" || spent ? (
              <p className="text-xs text-muted">
                {spent ? "Already used. Still say the line." : "Say the line. Nothing to record."}
              </p>
            ) : blockedRole === item.key && blockedWho ? (
              <CannotActNote who={blockedWho} />
            ) : (
              <>
                <PickList
                  label={item.cancel ? "Target — tap the name again to cancel" : "Target — tap again to change"}
                  players={item.players}
                  name={name}
                  selectedId={selectedId}
                  onPick={(player) => {
                    if (item.cancel && selectedId === player.id) {
                      void clearTonightAction(game.id, item.key);
                      return;
                    }
                    void recordStageAction(game.id, item.key, `${item.label} → ${name(player)}`, player.id);
                  }}
                />
                {item.cancel && selectedId ? (
                  <Button variant="ghost" className="mt-2" onClick={() => clearTonightAction(game.id, item.key)}>
                    {item.cancel}
                  </Button>
                ) : null}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function FaceChange({
  dead,
  living,
  name,
  gameId,
  used,
}: {
  dead: Player[];
  living: Player[];
  name: (player?: Player) => string;
  gameId: string;
  used?: { messageEn: string } | null;
}) {
  const [outside, setOutside] = useState<string | null>(null);
  const [inside, setInside] = useState<string | null>(null);
  if (used) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gold">Face-off used. Cancel only tonight if this swap was a mistake.</p>
        <p className="text-sm">{used.messageEn}</p>
        <Button variant="ghost" onClick={() => resetFaceChangeAction(gameId)}>
          Cancel Face-off
        </Button>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <p className="text-xs text-gold">Pick exactly one from each list, then swap. Cancel tonight if this was a mistake.</p>
      <PickList
        label="Outside — pick one (eliminated)"
        players={dead}
        name={name}
        selectedId={outside}
        onPick={(player) => setOutside(player.id)}
      />
      <PickList
        label="Inside — pick one (still in the game)"
        players={living}
        name={name}
        selectedId={inside}
        onPick={(player) => setInside(player.id)}
      />
      <Button
        disabled={!outside || !inside}
        onClick={() => {
          if (!outside || !inside) return;
          void swapRolesAction(gameId, outside, inside);
        }}
      >
        Swap roles
      </Button>
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
