"use client";

import { useLang } from "@/lib/lang";
import { Button, Panel } from "@/components/ui";
import type { SessionUser } from "@/lib/auth";

export function AdminHome({
  user,
  users,
  events,
  scenarios,
}: {
  user: SessionUser;
  users: { id: string; username: string; displayName: string; isAdmin: boolean }[];
  events: { id: string; slug: string; title: string; titleEn: string; status: string }[];
  scenarios: { id: string; name: string; nameEn: string; supportedPlayerCount: number }[];
}) {
  const { t, lang } = useLang();
  return (
    <div className="flex flex-1 flex-col gap-4">
      <header>
        <p className="text-xs text-gold">{t("admin")}</p>
        <h1 className="display text-3xl">{t("appName")}</h1>
      </header>
      <div className="grid grid-cols-2 gap-2">
        <Button href="/admin/users" variant="ghost">{t("users")}</Button>
        <Button href="/admin/events" variant="ghost">{t("events")}</Button>
        <Button href="/admin/scenarios" variant="ghost">{t("scenarios")}</Button>
        <Button href="/dashboard" variant="ghost">{t("dashboard")}</Button>
      </div>
      <Panel>
        <h2 className="mb-2 font-semibold">{t("events")}</h2>
        {events.map((event) => (
          <p key={event.id} className="text-sm">
            {lang === "en" ? event.titleEn : event.title} · {event.status}
          </p>
        ))}
      </Panel>
      <Panel>
        <h2 className="mb-2 font-semibold">{t("users")} · {users.length}</h2>
        <div className="flex flex-wrap gap-2">
          {users.map((u) => (
            <span key={u.id} className="rounded-full border border-line px-3 py-1 text-sm">
              {u.displayName}
              {u.isAdmin || u.id === user.id ? " ★" : ""}
            </span>
          ))}
        </div>
      </Panel>
      <Panel>
        <h2 className="mb-2 font-semibold">{t("scenarios")}</h2>
        {scenarios.map((s) => (
          <p key={s.id} className="text-sm">
            {lang === "en" ? s.nameEn : s.name} ({s.supportedPlayerCount})
          </p>
        ))}
      </Panel>
    </div>
  );
}
