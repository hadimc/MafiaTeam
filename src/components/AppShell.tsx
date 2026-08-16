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

  return (
    <div className="min-h-dvh">
      <div className="mx-auto flex min-h-dvh max-w-md flex-col">
        <header className="sticky top-0 z-20 space-y-3 px-5 py-4">
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
            <div className="grid grid-cols-2 gap-1 rounded-2xl border border-line bg-card/80 p-1">
              <Link
                href="/dashboard"
                className={`rounded-xl py-2 text-center text-xs font-semibold tracking-wide ${
                  !inAdmin ? "bg-gold text-black" : "text-muted"
                }`}
              >
                {t("member")}
              </Link>
              <Link
                href="/admin"
                className={`rounded-xl py-2 text-center text-xs font-semibold tracking-wide ${
                  inAdmin ? "bg-gold text-black" : "text-muted"
                }`}
              >
                {t("admin")}
              </Link>
            </div>
          ) : null}
        </header>
        <main className="flex flex-1 flex-col px-5 pb-8">{children}</main>
      </div>
    </div>
  );
}
