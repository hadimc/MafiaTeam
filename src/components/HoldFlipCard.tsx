"use client";

import { useRef, useState } from "react";

const HOLD_MS = 800;

export function HoldFlipCard({
  face,
  faceClassName = "bg-linear-to-b from-[#1a120c] to-[#0b0806] text-white",
  hint = "Hold to peek",
  onFlipped,
  className = "h-[min(72dvh,520px)] w-full max-w-[300px]",
}: {
  face: React.ReactNode;
  faceClassName?: string;
  hint?: string;
  onFlipped?: () => void;
  className?: string;
}) {
  const [progress, setProgress] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const frame = useRef(0);
  const didFlip = useRef(false);

  function stopHold() {
    if (frame.current) cancelAnimationFrame(frame.current);
    frame.current = 0;
    setProgress(0);
    setFlipped(false);
  }

  function startHold() {
    stopHold();
    const started = performance.now();
    const tick = (now: number) => {
      const next = Math.min(1, (now - started) / HOLD_MS);
      setProgress(next);
      if (next >= 1) {
        setFlipped(true);
        if (!didFlip.current) {
          didFlip.current = true;
          onFlipped?.();
        }
        return;
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }

  return (
    <div className="w-full" style={{ perspective: "1400px" }}>
      <button
        type="button"
        onPointerDown={(event) => {
          event.preventDefault();
          startHold();
        }}
        onPointerUp={stopHold}
        onPointerLeave={stopHold}
        onPointerCancel={stopHold}
        onContextMenu={(event) => event.preventDefault()}
        className={`card-3d relative mx-auto block touch-none select-none ${className} ${flipped ? "flipped" : ""}`}
        style={{ WebkitTouchCallout: "none" }}
        aria-label={hint}
      >
        <div className="card-face playing-card card-pattern absolute inset-0 flex flex-col items-center justify-center rounded-[22px] text-gold">
          <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-gold/40 bg-black/30 display text-2xl">
            M
          </div>
          <p className="display px-8 text-center text-lg tracking-[0.18em]">MAFIA</p>
          <p className="mt-3 px-8 text-center text-[11px] uppercase tracking-[0.18em] text-gold/70">{hint}</p>
          <span className="mt-8 h-1 w-32 overflow-hidden rounded-full bg-gold/15">
            <span className="block h-full bg-gold transition-[width] duration-75" style={{ width: `${Math.round(progress * 100)}%` }} />
          </span>
        </div>
        <div className={`card-face card-back playing-card absolute inset-0 overflow-hidden rounded-[22px] ${faceClassName}`}>
          {face}
        </div>
      </button>
    </div>
  );
}

export function CardShowShell({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg px-5 py-6">
      <button
        type="button"
        onClick={onClose}
        className="flex min-h-10 w-auto self-start items-center rounded-2xl border border-line bg-card/80 px-3 text-sm"
      >
        Close
      </button>
      <p className="mt-4 text-center text-[11px] uppercase tracking-[0.28em] text-gold">{title}</p>
      <div className="flex flex-1 flex-col items-center justify-center gap-5">{children}</div>
    </div>
  );
}

export function LotteryShow({
  onClose,
  onReveal,
}: {
  onClose: () => void;
  onReveal: (color: "blue" | "green") => void;
}) {
  const [order] = useState<"blue" | "green">(() => (Math.random() < 0.5 ? "blue" : "green"));
  const [locked, setLocked] = useState<"blue" | "green" | null>(null);
  const color = locked ?? order;
  const face =
    color === "green"
      ? {
          className: "bg-linear-to-b from-[#1c5c38] to-[#07140e] text-white",
          en: "Green",
          fa: "سبز",
        }
      : {
          className: "bg-linear-to-b from-[#1a4a8a] to-[#071018] text-white",
          en: "Blue",
          fa: "آبی",
        };

  return (
    <CardShowShell title="Exit lottery" onClose={onClose}>
      <HoldFlipCard
        hint="Hold to peek"
        faceClassName={face.className}
        onFlipped={() => {
          setLocked(color);
          onReveal(color);
        }}
        face={
          <div className="flex h-full flex-col items-center justify-center px-6 text-center">
            <p className="display text-5xl font-semibold tracking-[0.12em]">{face.en}</p>
            <p dir="rtl" lang="fa" className="farsi mt-3 text-3xl">
              {face.fa}
            </p>
          </div>
        }
      />
      <p className="max-w-[280px] text-center text-xs text-muted">Hold the card. Release to hide it again.</p>
    </CardShowShell>
  );
}

export function ExitCardShow({
  card,
  onClose,
  onDrawn,
}: {
  card: { id: string; name: string; nameEn: string; description: string; descriptionEn: string };
  onClose: () => void;
  onDrawn: () => void;
}) {
  return (
    <CardShowShell title="Exit card" onClose={onClose}>
      <HoldFlipCard
        hint="Hold to peek"
        faceClassName="bg-linear-to-b from-[#2a1848] to-[#0c0818] text-white"
        onFlipped={onDrawn}
        face={
          <div className="flex h-full flex-col items-center justify-between px-5 py-8 text-center">
            <p className="text-[11px] uppercase tracking-[0.22em] text-gold">Exit card</p>
            <div>
              <p className="display text-3xl font-semibold leading-tight">{card.nameEn}</p>
              <p dir="rtl" lang="fa" className="farsi mt-2 text-2xl leading-tight">
                {card.name}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm leading-5 text-white/90">{card.descriptionEn}</p>
              <p dir="rtl" lang="fa" className="farsi text-sm leading-6 text-white/80">
                {card.description}
              </p>
            </div>
          </div>
        }
      />
      <p className="max-w-[280px] text-center text-xs text-muted">Hold to peek. This card leaves the deck once revealed.</p>
    </CardShowShell>
  );
}
