"use client";

import { useEffect, useState } from "react";

function Clock({
  label,
  seconds,
}: {
  label: string;
  seconds: number;
}) {
  const [left, setLeft] = useState(seconds);
  const [run, setRun] = useState(false);

  useEffect(() => {
    if (!run) return;
    const id = window.setInterval(() => {
      setLeft((value) => {
        if (value <= 1) {
          window.clearInterval(id);
          setRun(false);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [run]);

  const mm = String(Math.floor(left / 60)).padStart(2, "0");
  const ss = String(left % 60).padStart(2, "0");

  return (
    <button
      type="button"
      onClick={() => {
        if (left === 0) {
          setLeft(seconds);
          setRun(true);
          return;
        }
        setRun((value) => !value);
      }}
      onDoubleClick={() => {
        setRun(false);
        setLeft(seconds);
      }}
      className={`min-h-12 flex-1 rounded-2xl border px-3 font-mono text-lg tabular-nums ${
        run ? "border-gold bg-gold/15 text-gold" : left === 0 ? "border-mafia/40 bg-mafia/10 text-mafia" : "border-line bg-card text-ink"
      }`}
    >
      <span className="block text-[10px] font-sans uppercase tracking-[0.16em] text-muted">{label}</span>
      {mm}:{ss}
    </button>
  );
}

export function TimerBar() {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30">
      <div className="pointer-events-auto mx-auto max-w-md border-t border-line bg-bg/95 px-5 py-3 backdrop-blur-md">
        <div className="flex gap-2">
          <Clock label="1 min" seconds={60} />
          <Clock label="30 sec" seconds={30} />
        </div>
        <p className="mt-1 text-center text-[10px] text-muted">Tap to start or pause · double-tap to reset</p>
      </div>
    </div>
  );
}
