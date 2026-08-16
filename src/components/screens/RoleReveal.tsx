"use client";

import { useRef, useState } from "react";
import { useLang } from "@/lib/lang";
import { Button, FactionPill } from "@/components/ui";
import { CATALOG_BY_KEY, roleImage } from "@/lib/catalog";
import { revealMyRoleAction } from "@/server/actions/games";

const HOLD_MS = 800;

const faces = {
  citizen: "from-[#163528] to-[#07140e]",
  mafia: "from-[#4a1018] to-[#14060a]",
  independent: "from-[#2a1848] to-[#0c0818]",
} as const;

export function RoleReveal({
  gameId,
  roleKey,
  roleName,
  roleNameEn,
  faction,
  descriptionEn,
  backHref = "/dashboard",
  onClose,
}: {
  gameId: string;
  roleKey: string;
  roleName: string;
  roleNameEn: string;
  faction: "citizen" | "mafia" | "independent";
  description: string;
  descriptionEn: string;
  backHref?: string;
  onClose?: () => void;
}) {
  const { t } = useLang();
  const [progress, setProgress] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const frame = useRef<number>(0);
  const summary = CATALOG_BY_KEY[roleKey]?.summaryEn || descriptionEn;

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
        void revealMyRoleAction(gameId);
        return;
      }
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg px-5 py-6">
      {onClose ? (
        <Button onClick={onClose} variant="ghost" className="w-auto self-start min-h-10 px-3 text-sm">
          {t("back")}
        </Button>
      ) : (
        <Button href={backHref} variant="ghost" className="w-auto self-start min-h-10 px-3 text-sm">
          {t("back")}
        </Button>
      )}

      <div className="flex flex-1 flex-col items-center justify-center gap-5">
        <p className="text-[11px] uppercase tracking-[0.28em] text-gold">{t("roleReady")}</p>

        <div className="w-full" style={{ perspective: "1400px" }}>
          <button
            type="button"
            onPointerDown={(e) => {
              e.preventDefault();
              startHold();
            }}
            onPointerUp={stopHold}
            onPointerLeave={stopHold}
            onPointerCancel={stopHold}
            onContextMenu={(e) => e.preventDefault()}
            className={`card-3d relative mx-auto block h-[min(72dvh,520px)] w-full max-w-[300px] touch-none select-none ${
              flipped ? "flipped" : ""
            }`}
            style={{ WebkitTouchCallout: "none" }}
            aria-label={t("holdToReveal")}
          >
            <div className="card-face playing-card card-pattern absolute inset-0 flex flex-col items-center justify-center rounded-[22px] text-gold">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-gold/40 bg-black/30 display text-2xl">
                M
              </div>
              <p className="display px-8 text-center text-lg tracking-[0.18em]">MAFIA</p>
              <p className="mt-3 px-8 text-center text-[11px] uppercase tracking-[0.18em] text-gold/70">
                {t("holdToReveal")}
              </p>
              <span className="mt-8 h-1 w-32 overflow-hidden rounded-full bg-gold/15">
                <span
                  className="block h-full bg-gold transition-[width] duration-75"
                  style={{ width: `${Math.round(progress * 100)}%` }}
                />
              </span>
            </div>
            <div
              className={`card-face card-back playing-card absolute inset-0 overflow-hidden rounded-[22px] bg-linear-to-b ${faces[faction]} text-white`}
            >
              <img
                src={roleImage(roleKey)}
                alt=""
                draggable={false}
                className="h-[46%] w-full object-cover object-top"
              />
              <div className="flex flex-1 flex-col items-center justify-between px-5 py-4 text-center">
                <FactionPill faction={faction} />
                <div>
                  <p dir="rtl" lang="fa" className="farsi text-3xl font-semibold leading-tight">
                    {roleName}
                  </p>
                  <p className="display mt-1 text-sm tracking-wide text-gold">{roleNameEn}</p>
                </div>
                <p className="text-xs leading-5 text-white/85">{summary}</p>
              </div>
            </div>
          </button>
        </div>

        <p className="max-w-[280px] text-center text-xs text-muted">{t("roleReadyHint")}</p>
      </div>
    </div>
  );
}
