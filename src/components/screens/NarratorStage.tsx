"use client";

import { useEffect, useState } from "react";
import { useLang, enName } from "@/lib/lang";
import { Button, Panel, SeatAvatar } from "@/components/ui";
import { TimerBar } from "@/components/TimerBar";
import { ExitCardShow, LotteryShow } from "@/components/HoldFlipCard";
import {
  dayTasks,
  jackCurseRound,
  lastNightReport,
  mafiaLikeOrder,
  nightTasks,
  nextStage,
  persistStage,
  prevStage,
  stageFromGame,
  stageSubtitle,
  stageTitle,
  townLikeOrder,
  type Stage,
  type StageTask,
} from "@/lib/stages";
import { readSnapshot, type SnapshotExitCard } from "@/lib/scenario";
import {
  drawExitCardAction,
  eliminatePlayerAction,
  endGameAction,
  recordJackCurseAction,
  recordLotteryAction,
  recordStageAction,
  setStageAction,
  startGameAction,
  swapRolesAction,
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
  actions: { id: string; actionType: string; messageEn: string; message: string; dayNumber: number; phase: string; targetPlayerId: string | null }[];
};

export function NarratorStage({ game }: { game: Game }) {
  const { t } = useLang();
  const [open, setOpen] = useState<string | null>(null);
  const [lotteryOpen, setLotteryOpen] = useState(false);
  const [exitCard, setExitCard] = useState<SnapshotExitCard | null>(null);
  const [jackOut, setJackOut] = useState<{ jackName: string; cursedName: string } | null>(null);

  useEffect(() => {
    if (game.currentPhase === "lobby" && game.status !== "finished") {
      void startGameAction(game.id);
    }
  }, [game.currentPhase, game.status, game.id]);

  const stage = stageFromGame(game);
  const living = game.players.filter((player) => player.alive);
  const dead = game.players.filter((player) => !player.alive);
  const roles = [...new Set(living.map((player) => player.roleKey))];
  const dealtRoles = [...new Set(game.players.map((player) => player.roleKey))];
  const mayorCoupon = game.actions.find(
    (action) => action.actionType === "mayorVeto" || action.actionType === "mayorCoupon",
  );
  const tasks =
    stage.kind === "day"
      ? dayTasks(stage, roles, mayorCoupon?.dayNumber ?? null)
      : nightTasks(stage, roles, dead.length > 0, dealtRoles);
  const name = (player?: Player) => (!player ? "—" : enName(player.user));
  const snapshot = readSnapshot(game.scenarioSnapshot);
  const remainingCards = snapshot.exitCards.filter((item) => !item.used);
  const counts = {
    citizen: living.filter((player) => player.faction === "citizen").length,
    mafia: living.filter((player) => player.faction === "mafia").length,
    independent: living.filter((player) => player.faction === "independent").length,
  };
  const back = prevStage(stage);
  const ahead = nextStage(stage);

  async function go(to: "next" | "prev") {
    const target = to === "next" ? ahead : back;
    if (!target) return;
    await setStageAction(game.id, persistStage(target));
  }

  return (
    <div className="flex flex-1 flex-col pb-28">
      <Button href={`/events/${game.event.slug}`} variant="ghost" className="mb-3 w-auto self-start min-h-10 px-3 text-sm">
        {t("back")}
      </Button>

      <p className="text-[11px] uppercase tracking-[0.22em] text-gold">
        {game.event.titleEn || game.event.title}
      </p>
      <h1 className="display mt-1 text-3xl font-semibold">{stageTitle(stage)}</h1>
      <p className="mt-1 text-sm text-muted">{stageSubtitle(stage)}</p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button onClick={() => go("prev")} variant="ghost" disabled={!back}>
          {t("previous")}
        </Button>
        <Button onClick={() => go("next")}>{t("next")}</Button>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 text-center">
        <Stat label={t("living")} value={living.length} />
        <Stat label={t("town")} value={counts.citizen} accent="text-citizen" />
        <Stat label={t("mafia")} value={counts.mafia} accent="text-mafia" />
        <Stat label={t("independent")} value={counts.independent} accent="text-indie" />
      </div>

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
                onRemove={async (playerId, reason) => {
                  const result = await eliminatePlayerAction(game.id, playerId, reason);
                  if (result && "jackOut" in result && result.jackOut) setJackOut(result.jackOut);
                }}
              />
            ) : null}
          </li>
        ))}
      </ol>

      {game.winningFaction ? (
        <p className="display mt-4 text-center text-gold">
          {t("winner")}: {game.winningFaction}
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button href={`/games/${game.id}/narrator/history`} variant="ghost">
            {t("history")}
          </Button>
          <Button onClick={() => endGameAction(game.id, "citizen")} variant="ghost">
            {t("gameOver")}
          </Button>
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
}) {
  const mafiaBits = [
    { key: "godfather", label: "Godfather — shot / sixth sense" },
    { key: "saul", label: "Saul — buy" },
    { key: "lecter", label: "Lecter — save" },
    { key: "matador", label: "Matador — block" },
  ].filter((item) => living.some((player) => player.roleKey === item.key));
  const townBits = [
    { key: "watson", label: "Watson — save" },
    { key: "leon", label: "Leon — shot" },
    { key: "kane", label: "Kane — mark" },
    { key: "detective", label: "Detective — inquiry" },
    { key: "constantine", label: "Constantine — spirit" },
    { key: "gunner", label: "Gunner — give gun" },
  ].filter((item) => living.some((player) => player.roleKey === item.key));

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

      {task.key === "speak" || task.key === "challenge" || task.key === "defense" ? (
        <p className="text-xs text-gold">Use the 1 min / 30 sec timers at the bottom.</p>
      ) : null}

      {task.key === "nightBrief" ? (
        <NightReport
          leave={night.leaveIds.map((id) => byId.get(id))}
          back={night.returnIds.map((id) => byId.get(id))}
          name={name}
        />
      ) : null}

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
        <PickList
          label="Target"
          players={living}
          name={name}
          onPick={(player) =>
            recordStageAction(game.id, task.key, `${task.nameEn} → ${name(player)}`, player.id)
          }
        />
      ) : null}

      {task.key === "jack" ? (
        <JackCurse
          gameId={game.id}
          living={living}
          name={name}
          curses={curses}
          byId={byId}
          frozen={jackShown || !jackPlayer?.alive}
        />
      ) : null}

      {task.key === "mafia" && introNight ? <LikeOrder label="Like order" players={mafiaLikes} name={name} /> : null}
      {task.key === "town" && introNight ? (
        <LikeOrder label="Thumbs-up order" players={townLikes} name={name} />
      ) : null}

      {task.key === "mafia" && !introNight
        ? mafiaBits.map((bit) => (
            <PickList
              key={bit.key}
              label={bit.label}
              players={living}
              name={name}
              onPick={(player) => recordStageAction(game.id, bit.key, `${bit.label} → ${name(player)}`, player.id)}
            />
          ))
        : null}

      {task.key === "town" && !introNight
        ? townBits.map((bit) => (
            <PickList
              key={bit.key}
              label={bit.label}
              players={bit.key === "constantine" ? dead : living}
              name={name}
              onPick={(player) => recordStageAction(game.id, bit.key, `${bit.label} → ${name(player)}`, player.id)}
            />
          ))
        : null}

      {task.key === "faceChange" ? (
        <FaceChange dead={dead} living={living} name={name} gameId={game.id} />
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
  return (
    <div className="space-y-3">
      <ReportNames label="Leave the game" players={leave} name={name} empty="Nobody leaves." />
      <ReportNames label="Back in the game" players={back} name={name} empty="Nobody returns." />
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
          Town {out.citizen} · Mafia {out.mafia} · Independent {out.independent}
        </p>
      </div>
      <div>
        <p className="mb-1 text-[11px] uppercase tracking-wide text-muted">Still in play</p>
        <p className="text-sm">
          Town {inPlay.citizen} · Mafia {inPlay.mafia} · Independent {inPlay.independent}
        </p>
      </div>
      <p className="text-xs text-muted">{used}/2 inquiries used</p>
      <Button
        disabled={used >= 2}
        onClick={() =>
          recordStageAction(
            gameId,
            "inquiry",
            `Inquiry asked. Out: Town ${out.citizen}, Mafia ${out.mafia}, Independent ${out.independent}. In play: Town ${inPlay.citizen}, Mafia ${inPlay.mafia}, Independent ${inPlay.independent}.`,
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
}: {
  label: string;
  players: Player[];
  name: (player?: Player) => string;
  onPick: (player: Player) => void;
  selectedId?: string | null;
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
            <span className="min-w-0 truncate">{name(player)}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function FaceChange({
  dead,
  living,
  name,
  gameId,
}: {
  dead: Player[];
  living: Player[];
  name: (player?: Player) => string;
  gameId: string;
}) {
  const [from, setFrom] = useState<string | null>(null);
  return (
    <div className="space-y-3">
      <PickList label="Eliminated player" players={dead} name={name} onPick={(player) => setFrom(player.id)} />
      {from ? (
        <PickList
          label="Swap with"
          players={living}
          name={name}
          onPick={(player) => {
            void swapRolesAction(gameId, from, player.id);
            setFrom(null);
          }}
        />
      ) : null}
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
