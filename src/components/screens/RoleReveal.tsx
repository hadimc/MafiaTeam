"use client";

import { useState } from "react";
import { useLang } from "@/lib/lang";
import { Button, FactionPill } from "@/components/ui";
import { revealMyRoleAction } from "@/server/actions/games";

export function RoleReveal({
  gameId,
  roleName,
  roleNameEn,
  faction,
  description,
  descriptionEn,
}: {
  gameId: string;
  roleName: string;
  roleNameEn: string;
  faction: "citizen" | "mafia" | "independent";
  description: string;
  descriptionEn: string;
}) {
  const { t, lang } = useLang();
  const [flipped, setFlipped] = useState(false);

  async function reveal() {
    setFlipped(true);
    await revealMyRoleAction(gameId);
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-6 py-4">
      <Button href="/dashboard" variant="ghost" className="w-auto self-start min-h-10 px-3 text-sm">
        {t("back")}
      </Button>

      <div className="w-full" style={{ perspective: "1200px" }}>
        <button
          type="button"
          onClick={reveal}
          className={`card-3d relative mx-auto block h-[420px] w-full max-w-[280px] ${flipped ? "flipped" : ""}`}
        >
          <div className="card-face absolute inset-0 flex flex-col items-center justify-center rounded-[28px] border border-gold/40 bg-linear-to-b from-[#2a2218] to-[#141117] shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
            <div className="mb-4 text-5xl">🂠</div>
            <p className="display px-6 text-center text-xl text-gold">{t("tapToReveal")}</p>
          </div>
          <div className="card-face card-back absolute inset-0 flex flex-col items-center justify-between rounded-[28px] border border-citizen/40 bg-linear-to-b from-[#1a2a22] to-[#121416] p-6 text-center shadow-[0_20px_60px_rgba(0,0,0,0.5)]">
            <FactionPill faction={faction} />
            <div>
              <p className="display text-4xl text-ink">{lang === "en" ? roleNameEn : roleName}</p>
              <p className="mt-2 text-muted">{t("faction")}</p>
            </div>
            <p className="text-sm leading-7 text-ink/90">{lang === "en" ? descriptionEn : description}</p>
          </div>
        </button>
      </div>

      {flipped ? (
        <Button onClick={() => setFlipped(false)} variant="ghost">
          {t("hideRole")}
        </Button>
      ) : null}
    </div>
  );
}
