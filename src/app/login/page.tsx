"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { useLang } from "@/lib/lang";
import { BrandMark, Button, Panel, PasswordField, fieldClass } from "@/components/ui";
import { loginAction } from "@/server/actions/auth";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const { t } = useLang();
  const [state, action, pending] = useActionState(loginAction, null);
  const next = useSearchParams().get("next") ?? "";

  return (
    <div className="flex flex-1 flex-col justify-center gap-8 py-6">
      <div className="text-center">
        <BrandMark className="mx-auto mb-5 h-16 w-16" />
        <p className="text-[11px] uppercase tracking-[0.28em] text-gold">Tonight’s table</p>
        <h1 className="display mt-2 text-4xl font-semibold text-ink">{t("appName")}</h1>
        <p className="mt-2 text-sm text-muted">{t("tagline")}</p>
      </div>

      <form action={action}>
        <Panel className="space-y-3">
          {next ? <input type="hidden" name="next" value={next} /> : null}
          <label className="block text-xs uppercase tracking-[0.16em] text-muted">{t("emailOrUsername")}</label>
          <input name="username" autoComplete="username" className={fieldClass} />
          <label className="block text-xs uppercase tracking-[0.16em] text-muted">{t("password")}</label>
          <PasswordField name="password" autoComplete="current-password" />
          {state?.error === "disabled" ? (
            <p className="text-sm text-mafia">{t("accountDisabled")}</p>
          ) : state?.error ? (
            <p className="text-sm text-mafia">{t("invalidLogin")}</p>
          ) : null}
          <Button type="submit" disabled={pending} className="mt-2">
            {t("login")}
          </Button>
        </Panel>
      </form>
    </div>
  );
}
