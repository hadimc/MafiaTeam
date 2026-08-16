"use client";

import Link from "next/link";
import { useLang } from "@/lib/lang";
import { logoutAction } from "@/server/actions/auth";
import type { SessionUser } from "@/lib/auth";

export function PhoneShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: SessionUser | null;
}) {
  const { t, lang, toggle } = useLang();

  return (
    <div className="min-h-dvh">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col border-x border-line bg-bg/80 shadow-[0_0_80px_rgba(0,0,0,0.45)]">
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-bg/90 px-4 py-3 backdrop-blur">
          <Link href="/dashboard" className="display text-sm tracking-[0.18em] text-gold">
            MAFIATEAM
          </Link>
          <div className="flex items-center gap-2">
            {user ? (
              <form action={logoutAction}>
                <button type="submit" className="text-[10px] text-muted">
                  {lang === "en" ? user.displayNameEn || user.displayName : user.displayName} · {t("logout")}
                </button>
              </form>
            ) : (
              <p className="max-w-[9rem] truncate text-[10px] text-muted">{t("demoBanner")}</p>
            )}
            <button
              type="button"
              onClick={toggle}
              className="rounded-full border border-line px-3 py-1 text-xs text-ink"
            >
              {lang === "fa" ? "EN" : "فا"}
            </button>
          </div>
        </div>
        <main className="flex flex-1 flex-col px-4 py-4">{children}</main>
      </div>
    </div>
  );
}
