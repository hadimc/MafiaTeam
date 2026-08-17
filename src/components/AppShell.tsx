"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang, enName } from "@/lib/lang";
import { logoutAction } from "@/server/actions/auth";
import { BrandMark } from "@/components/ui";
import type { SessionUser } from "@/lib/auth";

export function AppShell({
  children,
  user,
}: {
  children: React.ReactNode;
  user: SessionUser | null;
}) {
  const { t } = useLang();
  const path = usePathname();
  const inAdmin = path.startsWith("/admin");
  const inGame = path.startsWith("/games/");

  return (
    <div className="min-h-dvh">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col">
        <header
          className={`sticky top-0 z-20 space-y-3 px-5 py-4 backdrop-blur-md ${
            inGame ? "hidden" : inAdmin ? "bg-[#120e0c]/92 shadow-[inset_0_-1px_0_rgba(232,197,71,0.22)]" : "bg-bg/88"
          }`}
        >
          <div className="flex items-center justify-between">
            <Link href={inAdmin ? "/admin" : "/dashboard"} className="flex items-center gap-2.5">
              <BrandMark />
              <span className="display text-[15px] font-semibold text-ink">MafiaTeam</span>
            </Link>
            {user ? (
              <form action={logoutAction}>
                <button type="submit" className="text-xs text-muted">
                  {enName(user)} · {t("logout")}
                </button>
              </form>
            ) : (
              <span className="text-xs text-muted">Sign in</span>
            )}
          </div>
          {user?.isAdmin ? (
            <nav aria-label="Member or Admin" className="flex">
              <Link
                href="/dashboard"
                aria-current={!inAdmin ? "page" : undefined}
                className={`display flex-1 border-b-2 pb-2.5 text-center text-[15px] font-semibold tracking-[0.16em] ${
                  !inAdmin ? "border-gold text-gold" : "border-transparent text-muted/55"
                }`}
              >
                {t("member")}
              </Link>
              <Link
                href="/admin"
                aria-current={inAdmin ? "page" : undefined}
                className={`display flex-1 border-b-2 pb-2.5 text-center text-[15px] font-semibold tracking-[0.16em] ${
                  inAdmin ? "border-gold text-gold" : "border-transparent text-muted/55"
                }`}
              >
                {t("admin")}
              </Link>
            </nav>
          ) : null}
        </header>
        <main className={`flex flex-1 flex-col px-5 pb-8 ${inGame ? "pt-0" : ""}`}>{children}</main>
      </div>
    </div>
  );
}
