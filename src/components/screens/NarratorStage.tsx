"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useLang, enName } from "@/lib/lang";
import { completedTonightTypes, latestNewCompletedType, nextNightFocus, nightStepElementId } from "@/lib/nightFocus";
import { useGameLive } from "@/lib/useGameLive";
import { Button, Panel, SeatAvatar } from "@/components/ui";
import { factionLabel } from "@/lib/stats";
import { TimerBar } from "@/components/TimerBar";
import { ExitCardShow, LotteryShow } from "@/components/HoldFlipCard";
import {
  dayTasks,
  gunnerActiveHolders,
  gunnerAmmo,
  gunnerBulletType,
  handcuffsTarget,
  jackCurseRound,
  lastNightReport,
  lecterSelfSaved,
  mafiaLikeOrder,
  mafiaLostAMember,
  mafiaMainTonight,
  nightDisables,
  nightLine,
  nightTasks,
  nextStage,
  persistStage,
  prevStage,
  publicPlayerIds,
  beautifulMindDeckState,
  beautifulMindHasGuess,
  resolveNight,
  roleDisabledOnNight,
  scenarioRoleKeys,
  stageFromGame,
  stageSubtitle,
  stageTitle,
  sixthSenseGuess,
  tonightAction,
  tonightPicks,
  tonightTarget,
  townLikeOrder,
  type GunnerBullet,
  type Stage,
  type StageTask,
  type NightLine,
} from "@/lib/stages";
import { readSnapshot, type SnapshotExitCard } from "@/lib/scenario";
import { zodiacDescription, zodiacRulesFromSnapshot } from "@/lib/zodiac";
import {
  closeGameAction,
  discardBeautifulMindAction,
  drawExitCardAction,
  eliminatePlayerAction,
  endGameAction,
  resetGameAction,
  recordGunnerShotAction,
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
  undoLastInquiryAction,
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
  event: { title: string; titleEn: string; slug: string; showHints: boolean; narrators?: { userId: string }[] };
  players: Player[];
  votes: { voteType: string; dayNumber: number; targetPlayerId: string; count: number }[];
  draws: { playerId: string; cardName: string; cardNameEn: string }[];
  actions: { id: string; actionType: string; messageEn: string; message: string; dayNumber: number; phase: string; targetPlayerId: string | null; metadata?: string | null }[];
};

const HintsContext = createContext(false);

/** Script/reminder text for the narrator. Hidden unless the event's "show hints" setting is on. */
function Hint({ className, children }: { className?: string; children: React.ReactNode }) {
  const show = useContext(HintsContext);
  if (!show) return null;
  return <p className={className ?? "text-[12px] text-muted"}>{children}</p>;
}

function disableForRole(game: Game, roleKey: string, name: (player?: Player) => string) {
  const hit = roleDisabledOnNight(game.actions, game.players, game.currentDay, roleKey);
  if (!hit) return null;
  const player = game.players.find((item) => item.id === hit.id);
  if (!player) return null;
  return { who: `${name(player)} (${player.roleNameEn})`, source: hit.source, player };
}

function handcuffsDrawnToday(actions: Game["actions"], dayNumber: number) {
  if (handcuffsTarget(actions, dayNumber)) return true;
  return actions.some((action) => {
    if (action.actionType !== "exit_card" || action.dayNumber !== dayNumber) return false;
    try {
      return (JSON.parse(action.metadata || "{}") as { key?: string }).key === "handcuffs";
    } catch {
      return false;
    }
  });
}

export function NarratorStage({ game }: { game: Game }) {
  const { t } = useLang();
  useGameLive(game.id);
  const [open, setOpen] = useState<string | null>(null);
  const [lotteryOpen, setLotteryOpen] = useState(false);
  const [exitCard, setExitCard] = useState<SnapshotExitCard | null>(null);
  const [jackOut, setJackOut] = useState<{ jackName: string; cursedName: string } | null>(null);
  const [danger, setDanger] = useState<null | "end" | "reset">(null);
  const seenNightTypes = useRef<Set<string>>(new Set());
  const nightKeyRef = useRef("");
  const openedNightStart = useRef(false);
  const [nightScroll, setNightScroll] = useState<{ step: string; token: number } | null>(null);

  useEffect(() => {
    if (game.currentPhase === "lobby" && game.status !== "finished") {
      void startGameAction(game.id);
    }
  }, [game.currentPhase, game.status, game.id]);

  const stage = stageFromGame(game);
  const living = game.players.filter((player) => player.alive);
  const dead = game.players.filter((player) => !player.alive);
  const snapshot = readSnapshot(game.scenarioSnapshot);
  const zodiacRules = zodiacRulesFromSnapshot(game.scenarioSnapshot);
  const remainingCards = snapshot.exitCards.filter((item) => !item.used);
  const scenarioKeys = scenarioRoleKeys(snapshot.roles);
  const publicIds = publicPlayerIds(game.actions);
  const lineFor = (roleKey: string) => nightLine(roleKey, scenarioKeys, game.players, publicIds);
  const scriptRoles = [...scenarioKeys].filter((key) => lineFor(key) !== "skip");
  const livingRoles = new Set(living.map((player) => player.roleKey));
  const mayorCoupon = game.actions.find(
    (action) => action.actionType === "mayorVeto" || action.actionType === "mayorCoupon",
  );
  const hasActiveGunHolder = gunnerActiveHolders(game.actions).size > 0;
  const tasks =
    stage.kind === "day"
      ? dayTasks(stage, scriptRoles, mayorCoupon?.dayNumber ?? null, livingRoles, hasActiveGunHolder)
      : nightTasks(
          stage,
          dead.length > 0,
          lineFor,
          game.actions.find((action) => action.actionType === "faceChange")?.dayNumber ?? null,
          zodiacRules.shootNights,
        );
  const name = (player?: Player) => (!player ? "—" : enName(player.user));
  const cuffedId = handcuffsTarget(game.actions, game.currentDay);
  const cuffed = living.find((player) => player.id === cuffedId);
  const counts = {
    citizen: living.filter((player) => player.faction === "citizen").length,
    mafia: living.filter((player) => player.faction === "mafia").length,
    independent: living.filter((player) => player.faction === "independent").length,
  };
  const back = prevStage(stage);
  const ahead = nextStage(stage);
  const nightTaskKeys = stage.kind === "night" ? tasks.map((task) => task.key) : [];
  const nightTaskKeyList = nightTaskKeys.join(",");
  const tonightTypes = stage.kind === "night" ? completedTonightTypes(game.actions, game.currentDay) : new Set<string>();
  const tonightTypeKey = [...tonightTypes].sort().join(",");

  useEffect(() => {
    if (stage.kind !== "night") {
      nightKeyRef.current = "";
      seenNightTypes.current = new Set();
      openedNightStart.current = false;
      return;
    }
    const nightKey = `${game.currentDay}:${game.currentPhase}`;
    if (nightKeyRef.current !== nightKey) {
      nightKeyRef.current = nightKey;
      seenNightTypes.current = new Set();
      openedNightStart.current = false;
    }
    const addedType = latestNewCompletedType(seenNightTypes.current, game.actions, game.currentDay);
    seenNightTypes.current = new Set(tonightTypes);
    if (!addedType) {
      if (!openedNightStart.current && tonightTypes.size === 0) {
        openedNightStart.current = true;
        const first = nextNightFocus(null, nightTaskKeys, lineFor);
        if (first) setOpen(first.task);
      }
      return;
    }
    openedNightStart.current = true;
    const next = nextNightFocus(addedType, nightTaskKeys, lineFor);
    if (!next) return;
    setOpen(next.task);
    setNightScroll({ step: next.step, token: Date.now() });
  }, [tonightTypeKey, nightTaskKeyList, stage.kind, game.currentDay, game.currentPhase]);

  useEffect(() => {
    if (!nightScroll) return;
    const timer = window.setTimeout(() => {
      document.getElementById(nightStepElementId(nightScroll.step))?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [nightScroll]);

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
    <HintsContext.Provider value={game.event.showHints}>
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
        <p className="text-[11px] uppercase tracking-[0.22em] text-gold">
          {(game.event.narrators?.length ?? 0) > 1 ? t("liveNarrators") : t("liveSync")}
        </p>
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
        disableIds={nightDisables(game.actions, game.players, game.currentDay).map((item) => item.id)}
      />
      {cuffed ? (
        <div className="mt-3 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-gold">Handcuffs tonight</p>
          <p dir="rtl" lang="fa" className="farsi mt-1 text-sm text-gold">
            دستبند امشب
          </p>
          <p className="mt-1 text-sm font-semibold">
            {name(cuffed)} ({cuffed.roleNameEn}) cannot use a night ability.
          </p>
        </div>
      ) : null}

      <ol className="mt-5 space-y-2">
        {tasks.map((task, index) => (
          <li key={task.key} id={nightStepElementId(task.key)} className="scroll-mt-72">
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
                onJackOut={setJackOut}
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
    </HintsContext.Provider>
  );
}

function BeautifulMindRemove({ game }: { game: Game }) {
  const snapshot = readSnapshot(game.scenarioSnapshot);
  const state = beautifulMindDeckState(snapshot.exitCards, game.actions);
  if (state === "absent" || state === "drawn") return null;
  const useful = beautifulMindHasGuess(game.players, game.actions);

  return (
    <div className="space-y-2">
      {state === "in_deck" ? (
        <>
          <Hint>
            Remove Beautiful Mind when it cannot be used — for example Jack and the curse are already
            out.
          </Hint>
          <p dir="rtl" lang="fa" className="farsi text-xs text-muted">
            اگر جک و طلسم دیگر در بازی نیستند، ذهن زیبا را از دسته خارج کنید.
          </p>
          {!useful ? (
            <p className="text-xs text-gold">No valid guess left (Jack, curse, and Nostradamus are out).</p>
          ) : null}
          <Button variant="ghost" className="flex-col py-2" onClick={() => void discardBeautifulMindAction(game.id)}>
            Remove Beautiful Mind
            <span dir="rtl" lang="fa" className="farsi mt-0.5 block text-xs font-normal">
              حذف ذهن زیبا
            </span>
          </Button>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold">Beautiful Mind is out of the deck</p>
          <p dir="rtl" lang="fa" className="farsi text-sm text-gold">
            ذهن زیبا از دسته خارج شد
          </p>
          <Button variant="ghost" className="flex-col py-2" onClick={() => void discardBeautifulMindAction(game.id)}>
            Put Beautiful Mind back
            <span dir="rtl" lang="fa" className="farsi mt-0.5 block text-xs font-normal">
              برگرداندن ذهن زیبا
            </span>
          </Button>
        </>
      )}
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
  onJackOut,
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
  onJackOut: (value: { jackName: string; cursedName: string } | null) => void;
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
  const jackDisabled = disableForRole(game, "jack", name);
  const night = lastNightReport(game.actions, game.currentDay, game.players, zodiacRulesFromSnapshot(game.scenarioSnapshot));
  const inquiriesUsed = game.actions.filter((action) => action.actionType === "inquiry").length;
  const mafiaLikes = mafiaLikeOrder(living);
  const townLikes = townLikeOrder(living);

  const mafiaSummary = introNight
    ? "Intro night only. Call likes in this order. No shot tonight."
    : task.summaryEn;
  const townSummary = introNight
    ? "Intro night only. Thumbs-up in this order when you name the role. No abilities tonight."
    : task.summaryEn;
  const zodiacSummary = introNight
    ? "Intro night only. Call the Zodiac. They show thumbs-up. No shot tonight."
    : task.summaryEn;

  return (
    <Panel className="mt-2 space-y-3">
      <Hint className="text-sm">
        {task.key === "mafia"
          ? mafiaSummary
          : task.key === "town"
            ? townSummary
            : task.key === "zodiac"
              ? zodiacSummary
              : task.summaryEn}
      </Hint>
      {introNight && (task.key === "mafia" || task.key === "town" || task.key === "zodiac") ? null : (
        <Hint>{task.notesEn}</Hint>
      )}

      {task.key === "speak" || task.key === "defense" ? (
        <Hint className="text-xs text-gold">Use the 1 min / 30 sec timers at the bottom.</Hint>
      ) : null}

      {task.key === "nightBrief" ? (
        <NightReport
          leave={night.leaveIds.map((id) => byId.get(id))}
          back={night.returnIds.map((id) => byId.get(id))}
          kaneReveal={byId.get(night.kaneMafiaMarkId ?? "")}
          name={name}
        />
      ) : null}

      {task.key === "nightEnd" ? <NightPreview game={game} name={name} byId={byId} /> : null}

      {task.key === "dayShot" ? (
        <DayShot game={game} living={living} name={name} onJackOut={onJackOut} />
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
        <>
          <AbilityHeader
            label="Nostradamus"
            holder={living.find((player) => player.roleKey === "nostradamus")}
            name={name}
          />
          {lineFor("nostradamus") === "record" ? (
            <PickList
              label="Target"
              players={living}
              name={name}
              onPick={(player) =>
                recordStageAction(game.id, task.key, `${task.nameEn} → ${name(player)}`, player.id)
              }
            />
          ) : (
            <Hint className="text-xs text-muted">Say the line. Nothing to record.</Hint>
          )}
        </>
      ) : null}

      {task.key === "jack" ? (
        <>
          <AbilityHeader label="Jack" holder={living.find((player) => player.roleKey === "jack")} name={name} />
          {jackDisabled ? (
            <CannotActNote who={jackDisabled.who} source={jackDisabled.source} />
          ) : lineFor("jack") === "record" && !jackShown ? (
            <JackCurse
              gameId={game.id}
              living={living}
              name={name}
              curses={curses}
              byId={byId}
              frozen={false}
            />
          ) : jackShown ? (
            <p className="text-xs text-muted">The curse stays where it is.</p>
          ) : (
            <Hint className="text-xs text-muted">Say the line. Nothing to record.</Hint>
          )}
        </>
      ) : null}

      {task.key === "zodiac" ? (
        <ZodiacShot game={game} living={living} name={name} introNight={introNight} />
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
        <>
          {remainingCards.length === 0 ? (
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
          )}
          <BeautifulMindRemove game={game} />
          {handcuffsDrawnToday(game.actions, game.currentDay) ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold">Handcuffs — pick any living player</p>
              <p dir="rtl" lang="fa" className="farsi text-sm text-gold">
                دستبند — یک بازیکن زنده را انتخاب کنید
              </p>
              <Hint>
                Citizen, Mafia, or independent — including Matador. They cannot use their night ability
                tonight.
              </Hint>
              <PickList
                label="Disable tonight — tap another name to change"
                players={living}
                name={name}
                showRole
                selectedId={handcuffsTarget(game.actions, game.currentDay)}
                onPick={(player) =>
                  void recordStageAction(game.id, "handcuffs", `Handcuffs → ${name(player)}`, player.id)
                }
              />
            </div>
          ) : null}
        </>
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
  kaneReveal,
  name,
}: {
  leave: (Player | undefined)[];
  back: (Player | undefined)[];
  kaneReveal?: Player;
  name: (player?: Player) => string;
}) {
  const independents = leave.filter(
    (player): player is Player => player != null && player.faction === "independent",
  );
  const kaneAmongLeavers = leave.find(
    (player): player is Player => player != null && player.roleKey === "kane",
  );
  return (
    <div className="space-y-3">
      {kaneReveal ? (
        <div className="rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.22em] text-gold">Announce — Kane’s coupon</p>
          <p className="mt-1 font-semibold">
            {name(kaneReveal)} is {kaneReveal.roleNameEn}
          </p>
          <p dir="rtl" lang="fa" className="farsi mt-1 text-sm text-gold">
            {kaneReveal.roleName}
          </p>
          <p className="mt-2 text-sm text-muted">
            Kane sat with them last night and confirmed Mafia. Kane leaves the following night.
          </p>
        </div>
      ) : null}
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
      {kaneAmongLeavers ? (
        <p className="text-xs text-gold">
          {name(kaneAmongLeavers)}’s departure is Kane’s delayed mark catching up. Do not explain why.
        </p>
      ) : null}
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
  { key: "zodiac", label: "Zodiac shot" },
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
  const preview = resolveNight(
    game.actions,
    game.players,
    game.currentDay,
    zodiacRulesFromSnapshot(game.scenarioSnapshot),
  );
  const picks = tonightPicks(game.actions, game.currentDay);
  const gunnerTonight = tonightAction(game.actions, game.currentDay, "gunner");
  const recorded = NIGHT_PICK_LABELS.flatMap((item) => {
    const id = picks.get(item.key);
    if (!id) return [];
    const label =
      item.key === "gunner" && gunnerTonight
        ? `${item.label} (${gunnerBulletType(gunnerTonight) ?? "fake"})`
        : item.label;
    return [{ ...item, label, player: byId.get(id) }];
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
      {used > 0 ? (
        <Button variant="ghost" onClick={() => undoLastInquiryAction(gameId)}>
          Remove last inquiry
        </Button>
      ) : null}
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

function ZodiacShot({
  game,
  living,
  name,
  introNight,
}: {
  game: Game;
  living: Player[];
  name: (player?: Player) => string;
  introNight: boolean;
}) {
  const rules = zodiacRulesFromSnapshot(game.scenarioSnapshot);
  const line = nightLine(
    "zodiac",
    scenarioRoleKeys(readSnapshot(game.scenarioSnapshot).roles),
    game.players,
    publicPlayerIds(game.actions),
  );
  const zodiac = living.find((player) => player.roleKey === "zodiac");
  const target = tonightTarget(game.actions, game.currentDay, "zodiac");
  const blocked = disableForRole(game, "zodiac", name);
  const preview = resolveNight(game.actions, game.players, game.currentDay, rules);
  const notes = preview.notes.filter((note) => /zodiac/i.test(note));
  return (
    <>
      <AbilityHeader
        label="Zodiac"
        holder={zodiac}
        name={name}
        tone={line === "cover" || !zodiac ? "cover" : "act"}
      />
      <Hint className="text-xs">{zodiacDescription(rules, "en")}</Hint>
      {introNight ? (
        line === "record" && zodiac ? (
          <LikeOrder label="Thumbs-up" players={[zodiac]} name={name} />
        ) : (
          <Hint className="text-xs text-muted">Say the line. Nothing to record.</Hint>
        )
      ) : blocked ? (
        <CannotActNote who={blocked.who} source={blocked.source} />
      ) : line === "record" && zodiac ? (
        <>
          <PickList
            label="Shoot — tap the name again to cancel"
            players={living.filter((player) => player.id !== zodiac.id)}
            name={name}
            selectedId={target}
            onPick={(player) => {
              if (target === player.id) {
                void clearTonightAction(game.id, "zodiac");
                return;
              }
              void recordStageAction(game.id, "zodiac", `Zodiac shot → ${name(player)}`, player.id);
            }}
          />
          {target ? (
            <Button variant="ghost" className="mt-2" onClick={() => clearTonightAction(game.id, "zodiac")}>
              Cancel shot
            </Button>
          ) : null}
          {notes.map((note) => (
            <p key={note} className="mt-2 text-xs text-gold">
              {note}
            </p>
          ))}
        </>
      ) : (
        <Hint className="text-xs text-muted">Say the line. Nothing to record.</Hint>
      )}
    </>
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
  markedIds,
  markedNote,
}: {
  label: string;
  players: Player[];
  name: (player?: Player) => string;
  onPick: (player: Player) => void;
  selectedId?: string | null;
  showRole?: boolean;
  markedId?: string | null;
  markedIds?: string[];
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
              {(markedId === player.id || markedIds?.includes(player.id)) && markedNote ? (
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
  disableIds,
}: {
  living: Player[];
  dead: Player[];
  name: (player?: Player) => string;
  onToggle: (playerId: string, currentlyAlive: boolean) => void;
  disableIds?: string[];
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
            markedIds={disableIds}
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

/** Bold, high-contrast action title with the current role holder's seat + name next to it. */
function AbilityHeader({
  label,
  holder,
  name,
  tone = "act",
}: {
  label: string;
  holder?: Player | null;
  name: (player?: Player) => string;
  tone?: "act" | "cover" | "spent";
}) {
  const idle = tone === "cover" || tone === "spent";
  return (
    <div className={`mb-2 flex flex-wrap items-center justify-between gap-2 ${idle ? "opacity-60" : ""}`}>
      <p className={`text-sm font-bold ${idle ? "text-muted" : "text-ink"}`}>{label}</p>
      {tone === "cover" ? (
        <span className="inline-flex items-center rounded-full border border-line bg-bg-elev px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          Out · no action
        </span>
      ) : tone === "spent" ? (
        <span className="inline-flex items-center rounded-full border border-line bg-bg-elev px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
          Spent
        </span>
      ) : holder ? (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/50 bg-gold/15 px-2.5 py-1 text-xs font-semibold text-gold">
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold text-[10px] font-bold text-black">
            {holder.seatNumber}
          </span>
          <span className="truncate">{name(holder)}</span>
        </span>
      ) : null}
    </div>
  );
}

function NightAbility({
  title,
  line,
  blocked,
  blockedSource,
  holder,
  name,
  step,
  children,
}: {
  title: string;
  line: NightLine;
  blocked?: string | null;
  blockedSource?: "matador" | "handcuffs";
  holder?: Player | null;
  name: (player?: Player) => string;
  step?: string;
  children: React.ReactNode;
}) {
  if (line === "skip") return null;
  return (
    <div id={step ? nightStepElementId(step) : undefined} className="scroll-mt-72">
      <AbilityHeader label={title} holder={holder} name={name} tone={line === "cover" ? "cover" : "act"} />
      {line === "cover" ? (
        <Hint className="text-xs text-muted">Out. Say the line so the table does not learn. No action.</Hint>
      ) : blocked ? (
        <CannotActNote who={blocked} source={blockedSource} />
      ) : (
        children
      )}
    </div>
  );
}

function CannotActNote({
  who,
  source,
}: {
  who: string;
  source?: "matador" | "handcuffs";
}) {
  return (
    <div className="rounded-2xl border border-gold/50 bg-gold/10 px-4 py-3">
      <p className="text-[11px] uppercase tracking-[0.22em] text-gold">Cannot act tonight</p>
      <p dir="rtl" lang="fa" className="farsi mt-1 text-sm text-gold">
        امشب توانایی ندارد
      </p>
      <p className="mt-2 text-sm font-semibold">{who}</p>
      <Hint className="mt-1 text-xs text-muted">
        {source === "handcuffs"
          ? "Handcuffs took this ability. Say the line. Do not record."
          : "Matador took this ability. Say the line. Do not record."}
      </Hint>
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
  const godfatherDisabled = disableForRole(game, "godfather", name);
  const saulDisabled = disableForRole(game, "saul", name);
  const lecterDisabled = disableForRole(game, "lecter", name);
  const matadorDisabled = disableForRole(game, "matador", name);
  const matadorTargetId = tonightTarget(game.actions, game.currentDay, "matador");
  const matadorTarget = game.players.find((player) => player.id === matadorTargetId);
  const saulIn = living.some((player) => player.roleKey === "saul");
  const lostMafia = mafiaLostAMember(game.players);
  const canShot = living.some((player) => player.faction === "mafia") && !godfatherDisabled;
  const canSixth = living.some((player) => player.roleKey === "godfather") && !godfatherDisabled;
  const canBuy = saulIn && lostMafia && !saulUsed && !saulDisabled;
  const lecter = living.find((player) => player.roleKey === "lecter");
  const matador = living.find((player) => player.roleKey === "matador");
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
  const preview = resolveNight(
    game.actions,
    game.players,
    game.currentDay,
    zodiacRulesFromSnapshot(game.scenarioSnapshot),
  );
  const saulNotes = preview.notes.filter((note) => /saul|purchase/i.test(note));
  const options = [
    ...(canShot ? [{ key: "mafiaShot" as const, label: "Shot" }] : []),
    ...(canSixth ? [{ key: "sixthSense" as const, label: "Sixth sense" }] : []),
    ...(canBuy ? [{ key: "saul" as const, label: "Purchase" }] : []),
  ];
  const requested =
    main ??
    (taken?.actionType as "mafiaShot" | "sixthSense" | "saul" | undefined) ??
    (canShot ? "mafiaShot" : null);
  const selectedMain = options.some((option) => option.key === requested) ? requested : null;
  return (
    <div className="space-y-4">
      <Hint className="text-xs text-gold">
        Say the list for roles in this scenario. Tap a different name to correct it. Nobody leaves yet.
      </Hint>
      <div>
        <p className="mb-2 text-sm font-bold text-ink">Main action — pick one</p>
        {godfatherDisabled ? (
          <CannotActNote who={godfatherDisabled.who} source={godfatherDisabled.source} />
        ) : null}
        {saulIn && !lostMafia && !saulUsed ? (
          <p className="mt-2 text-xs text-muted">Purchase unlocks after Mafia has lost a member.</p>
        ) : null}
        {options.length === 0 && !godfatherDisabled ? (
          <>
            <p className="text-xs text-muted">Mafia is out.</p>
            <Hint className="text-xs text-muted">Say the line if the table should not know. Nothing to record.</Hint>
          </>
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
                  players={
                    selectedMain === "saul"
                      ? living.filter((player) => player.faction !== "mafia")
                      : living
                  }
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
                {selectedMain === "saul"
                  ? saulNotes.map((note) => (
                      <p key={note} className="mt-2 text-xs text-gold">
                        {note}
                      </p>
                    ))
                  : null}
              </div>
            ) : null}
          </>
        ) : null}
      </div>
      <NightAbility
        title="Lecter save"
        step="lecter"
        line={lineFor("lecter")}
        blocked={lecterDisabled?.who}
        blockedSource={lecterDisabled?.source}
        holder={lecter}
        name={name}
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
      <NightAbility
        title="Matador disability"
        step="matador"
        line={lineFor("matador")}
        blocked={matadorDisabled?.who}
        blockedSource={matadorDisabled?.source}
        holder={matador}
        name={name}
      >
        <PickList
          label="Block — tap again to change"
          players={living.filter((player) => player.faction !== "mafia")}
          name={name}
          selectedId={matadorTarget?.id}
          markedId={matadorTarget?.id}
          markedNote="Cannot act tonight"
          showRole
          onPick={(player) => recordStageAction(game.id, "matador", `Matador block → ${name(player)}`, player.id)}
        />
        {matadorTarget ? (
          <CannotActNote who={`${name(matadorTarget)} (${matadorTarget.roleNameEn})`} source="matador" />
        ) : null}
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
  ] as const;
  const kane = living.find((player) => player.roleKey === "kane");
  const kaneUsed = game.actions.some(
    (action) => action.actionType === "kane" && action.dayNumber !== game.currentDay,
  );
  const kaneTarget = tonightTarget(game.actions, game.currentDay, "kane");
  const kaneLine = lineFor("kane");
  const detective = living.find((player) => player.roleKey === "detective");
  const detectiveLine = lineFor("detective");
  const leonTarget = tonightTarget(game.actions, game.currentDay, "leon");
  const preview = resolveNight(
    game.actions,
    game.players,
    game.currentDay,
    zodiacRulesFromSnapshot(game.scenarioSnapshot),
  );
  const kaneNotes = preview.notes.filter((note) => /kane/i.test(note));
  const leonNotes = preview.notes.filter((note) => /leon|citizen hit|lecter|shield/i.test(note));
  const leonLine = lineFor("leon");
  const leonSpent = leonNights.size >= 2;
  const watsonDisabled = disableForRole(game, "watson", name);
  const leonDisabled = disableForRole(game, "leon", name);
  const kaneDisabled = disableForRole(game, "kane", name);
  const gunnerDisabled = disableForRole(game, "gunner", name);

  return (
    <div className="space-y-4">
      <Hint className="text-xs text-gold">
        Say the list for roles in this scenario. Tap a different name to correct a mistake. Removals wait until Next.
      </Hint>
      <NightAbility
        title="Dr. Watson — save"
        step="watson"
        line={lineFor("watson")}
        blocked={watsonDisabled?.who}
        blockedSource={watsonDisabled?.source}
        holder={watson}
        name={name}
      >
        <PickList
          label="Save — tap again to change"
          players={watsonTargets}
          name={name}
          selectedId={tonightTarget(game.actions, game.currentDay, "watson")}
          onPick={(player) => recordStageAction(game.id, "watson", `Watson save → ${name(player)}`, player.id)}
        />
      </NightAbility>
      {leonLine === "skip" ? null : (
        <div id={nightStepElementId("leon")} className="scroll-mt-72">
          <AbilityHeader
            label="Leon — shot"
            holder={leon}
            name={name}
            tone={leonLine === "cover" || !leon ? "cover" : leonSpent ? "spent" : "act"}
          />
          {leonLine === "cover" || leonSpent || !leon ? (
            leonSpent ? (
              <p className="text-xs text-muted">Leon’s two shots are spent.</p>
            ) : (
              <Hint className="text-xs text-muted">Out. Say the line so the table does not learn. No action.</Hint>
            )
          ) : leonDisabled ? (
            <CannotActNote who={leonDisabled.who} source={leonDisabled.source} />
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
        <div id={nightStepElementId("kane")} className="scroll-mt-72">
          <AbilityHeader
            label="Citizen Kane — coupon"
            holder={kane}
            name={name}
            tone={kaneLine === "cover" || !kane ? "cover" : kaneUsed ? "spent" : "act"}
          />
          {kaneLine === "cover" || kaneUsed || !kane ? (
            kaneUsed && kane ? (
              <p className="text-xs text-muted">Coupon already used.</p>
            ) : (
              <Hint className="text-xs text-muted">Out. Say the line so the table does not learn. No action.</Hint>
            )
          ) : kaneDisabled ? (
            <CannotActNote who={kaneDisabled.who} source={kaneDisabled.source} />
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
        <div id={nightStepElementId("detective")} className="scroll-mt-72">
          <AbilityHeader
            label="Detective"
            holder={detective}
            name={name}
            tone={detectiveLine === "cover" || !detective ? "cover" : "act"}
          />
          {detectiveLine === "cover" || !detective ? (
            <Hint className="text-xs text-muted">Out. Say the line so the table does not learn. No action.</Hint>
          ) : (
            <Hint className="text-xs text-muted">Alive. Say the line. Do not record the inquiry.</Hint>
          )}
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
        const extraDisabled = disableForRole(game, item.key, name);
        const holder = living.find((player) => player.roleKey === item.key);
        return (
          <div key={item.key} id={nightStepElementId(item.key)} className="scroll-mt-72">
            <AbilityHeader
              label={item.label}
              holder={holder}
              name={name}
              tone={line === "cover" || !holder ? "cover" : spent ? "spent" : "act"}
            />
            {line === "cover" || spent ? (
              spent && holder ? (
                <p className="text-xs text-muted">Already used.</p>
              ) : (
                <Hint className="text-xs text-muted">Out. Say the line so the table does not learn. No action.</Hint>
              )
            ) : extraDisabled ? (
              <CannotActNote who={extraDisabled.who} source={extraDisabled.source} />
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
      {lineFor("gunner") === "skip" ? null : (
        <div id={nightStepElementId("gunner")} className="scroll-mt-72">
          <AbilityHeader
            label="Gunner — give gun"
            holder={living.find((player) => player.roleKey === "gunner")}
            name={name}
            tone={lineFor("gunner") === "cover" || !living.some((player) => player.roleKey === "gunner") ? "cover" : "act"}
          />
          <GunnerNight
            game={game}
            living={living}
            name={name}
            line={lineFor("gunner")}
            blockedWho={gunnerDisabled?.who ?? null}
            blockedSource={gunnerDisabled?.source}
          />
        </div>
      )}
    </div>
  );
}

function GunnerNight({
  game,
  living,
  name,
  line,
  blockedWho,
  blockedSource,
}: {
  game: Game;
  living: Player[];
  name: (player?: Player) => string;
  line: NightLine;
  blockedWho: string | null;
  blockedSource?: "matador" | "handcuffs";
}) {
  const [bulletPick, setBulletPick] = useState<GunnerBullet | null>(null);
  const gunner = living.find((player) => player.roleKey === "gunner");
  const ammo = gunnerAmmo(game.actions);
  const tonight = tonightAction(game.actions, game.currentDay, "gunner");
  const bulletTonight = tonight ? gunnerBulletType(tonight) : null;
  const targetTonight = tonight?.targetPlayerId ?? null;

  if (line === "cover" || !gunner) {
    return <Hint className="text-xs text-muted">Out. Say the line so the table does not learn. No action.</Hint>;
  }
  if (blockedWho) return <CannotActNote who={blockedWho} source={blockedSource} />;
  if (ammo.fakeLeft === 0 && ammo.realLeft === 0) {
    return <p className="text-xs text-muted">Out of ammunition. Still say the line.</p>;
  }

  const bullet: GunnerBullet =
    bulletPick ?? bulletTonight ?? (ammo.fakeLeft > 0 ? "fake" : "real");
  const targets = bullet === "real" ? living.filter((player) => player.id !== gunner.id) : living;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted">
        Fake ×{ammo.fakeLeft} left · Real ×{ammo.realLeft} left
      </p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={ammo.fakeLeft === 0}
          onClick={() => setBulletPick("fake")}
          className={`min-h-10 rounded-2xl border px-2 text-xs font-semibold disabled:opacity-40 ${
            bullet === "fake" ? "border-gold bg-gold/10 text-gold" : "border-line bg-bg-elev"
          }`}
        >
          Fake round
        </button>
        <button
          type="button"
          disabled={ammo.realLeft === 0}
          onClick={() => setBulletPick("real")}
          className={`min-h-10 rounded-2xl border px-2 text-xs font-semibold disabled:opacity-40 ${
            bullet === "real" ? "border-gold bg-gold/10 text-gold" : "border-line bg-bg-elev"
          }`}
        >
          Real round
        </button>
      </div>
      <PickList
        label="Give gun to — tap the name again to cancel"
        players={targets}
        name={name}
        selectedId={bullet === bulletTonight ? targetTonight : null}
        onPick={(player) => {
          if (targetTonight === player.id && bulletTonight === bullet) {
            void clearTonightAction(game.id, "gunner");
            return;
          }
          void recordStageAction(
            game.id,
            "gunner",
            `Gunner gave a ${bullet} round → ${name(player)}`,
            player.id,
            JSON.stringify({ bulletType: bullet }),
          );
        }}
      />
    </div>
  );
}

function DayShot({
  game,
  living,
  name,
  onJackOut,
}: {
  game: Game;
  living: Player[];
  name: (player?: Player) => string;
  onJackOut: (value: { jackName: string; cursedName: string } | null) => void;
}) {
  const byId = new Map(game.players.map((player) => [player.id, player]));
  const holders = [...gunnerActiveHolders(game.actions).entries()]
    .map(([playerId, gift]) => ({ player: byId.get(playerId), ...gift }))
    .filter((row): row is { player: Player; bulletType: GunnerBullet; day: number } =>
      Boolean(row.player?.alive),
    );

  if (holders.length === 0) {
    return <p className="text-xs text-muted">Nobody is holding a gun today.</p>;
  }

  return (
    <div className="space-y-3">
      {holders.map((row) => (
        <GunHolder
          key={row.player.id}
          holder={row.player}
          game={game}
          living={living}
          name={name}
          onJackOut={onJackOut}
        />
      ))}
    </div>
  );
}

function GunHolder({
  holder,
  game,
  living,
  name,
  onJackOut,
}: {
  holder: Player;
  game: Game;
  living: Player[];
  name: (player?: Player) => string;
  onJackOut: (value: { jackName: string; cursedName: string } | null) => void;
}) {
  const [firing, setFiring] = useState(false);
  return (
    <div className="space-y-2 rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3">
      <p className="text-sm font-semibold">{name(holder)} is holding the gun.</p>
      {firing ? (
        <>
          <PickList
            label="Fire at — tap to shoot"
            players={living.filter((player) => player.id !== holder.id)}
            name={name}
            onPick={(player) => {
              setFiring(false);
              void (async () => {
                const result = await recordGunnerShotAction(game.id, holder.id, player.id);
                if (result && "jackOut" in result && result.jackOut) onJackOut(result.jackOut);
              })();
            }}
          />
          <Button variant="ghost" className="mt-2" onClick={() => setFiring(false)}>
            Cancel
          </Button>
        </>
      ) : (
        <Button variant="ghost" onClick={() => setFiring(true)}>
          Fire
        </Button>
      )}
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
        <p className="text-sm text-gold">Face-off used.</p>
        <Hint className="text-xs text-muted">Cancel only tonight if this swap was a mistake.</Hint>
        <p className="text-sm">{used.messageEn}</p>
        <Button variant="ghost" onClick={() => resetFaceChangeAction(gameId)}>
          Cancel Face-off
        </Button>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      <Hint className="text-xs text-gold">
        Pick exactly one from each list, then swap. Cancel tonight if this was a mistake.
      </Hint>
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
