"use client";

import { useLang } from "@/lib/lang";
import { Button } from "@/components/ui";

export function AdminHome({
  users,
  events,
  scenarios,
  rules,
}: {
  users: number;
  events: number;
  scenarios: number;
  rules: number;
}) {
  const { t } = useLang();
  return (
    <div className="flex flex-1 flex-col gap-5">
      <header>
        <p className="text-[11px] uppercase tracking-[0.22em] text-gold">{t("admin")}</p>
        <h1 className="display mt-1 text-3xl font-semibold">Club setup</h1>
        <p className="mt-2 text-sm text-muted">
          Users, games, scenarios, and house rules. Members join from the dashboard or a join link.
        </p>
      </header>
      <Button href="/admin/users" variant="ghost" className="min-h-20 flex-col gap-1">
        <span className="display text-xl">{t("users")}</span>
        <span className="text-xs font-normal text-muted">{users} accounts</span>
      </Button>
      <Button href="/admin/events" variant="ghost" className="min-h-20 flex-col gap-1">
        <span className="display text-xl">{t("events")}</span>
        <span className="text-xs font-normal text-muted">{events} games</span>
      </Button>
      <Button href="/admin/scenarios" variant="ghost" className="min-h-20 flex-col gap-1">
        <span className="display text-xl">{t("scenarios")}</span>
        <span className="text-xs font-normal text-muted">{scenarios} decks</span>
      </Button>
      <Button href="/admin/rules" variant="ghost" className="min-h-20 flex-col gap-1">
        <span className="display text-xl">{t("rules")}</span>
        <span className="text-xs font-normal text-muted">{rules} house rules</span>
      </Button>
    </div>
  );
}
