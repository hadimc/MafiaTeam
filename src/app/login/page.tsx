"use client";

import { useActionState } from "react";
import { useLang } from "@/lib/lang";
import { Button, Panel } from "@/components/ui";
import { loginAction, loginAsAction } from "@/server/actions/auth";

export default function LoginPage() {
  const { t } = useLang();
  const [state, action, pending] = useActionState(loginAction, null);

  return (
    <div className="flex flex-1 flex-col justify-center gap-8 py-6">
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-gold/40 bg-card text-3xl shadow-[0_0_40px_rgba(192,57,43,0.25)]">
          🎩
        </div>
        <h1 className="display text-4xl text-ink">{t("appName")}</h1>
        <p className="mt-2 text-muted">{t("tagline")}</p>
      </div>

      <form action={action} className="space-y-3">
        <Panel className="space-y-3">
          <label className="block text-sm text-muted">{t("emailOrUsername")}</label>
          <input
            name="username"
            defaultValue="hadi"
            className="min-h-12 w-full rounded-2xl border border-line bg-bg px-4 text-ink outline-none focus:border-gold/50"
          />
          <label className="block text-sm text-muted">{t("password")}</label>
          <input
            name="password"
            type="password"
            defaultValue="mafia123"
            className="min-h-12 w-full rounded-2xl border border-line bg-bg px-4 text-ink outline-none focus:border-gold/50"
          />
          {state?.error === "disabled" ? (
            <p className="text-sm text-red-2">{t("accountDisabled")}</p>
          ) : state?.error ? (
            <p className="text-sm text-red-2">{t("invalidLogin")}</p>
          ) : null}
          <Button type="submit" disabled={pending}>
            {t("login")}
          </Button>
        </Panel>
      </form>

      <div>
        <p className="mb-3 text-center text-xs uppercase tracking-[0.2em] text-muted">
          {t("previewAs")}
        </p>
        <div className="grid grid-cols-3 gap-2">
          <form action={loginAsAction.bind(null, "ali")}>
            <Button type="submit" variant="ghost" className="min-h-16 text-sm">
              {t("asPlayer")}
            </Button>
          </form>
          <form action={loginAsAction.bind(null, "hadi")}>
            <Button type="submit" variant="ghost" className="min-h-16 text-sm">
              {t("asNarrator")}
            </Button>
          </form>
          <form action={loginAsAction.bind(null, "hadi")}>
            <Button type="submit" variant="ghost" className="min-h-16 text-sm">
              {t("asAdmin")}
            </Button>
          </form>
        </div>
        <p className="mt-3 text-center text-[11px] text-muted">hadi / hadi@mafiateam.local · mafia123</p>
      </div>
    </div>
  );
}
