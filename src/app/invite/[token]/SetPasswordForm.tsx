"use client";

import { useState } from "react";
import { useLang } from "@/lib/lang";
import { Button, Panel, fieldClass } from "@/components/ui";
import { setPasswordWithTokenAction } from "@/server/actions/users";

export function SetPasswordForm({
  kind,
  token,
}: {
  kind: "invite" | "reset";
  token: string;
}) {
  const { t } = useLang();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <div className="flex flex-1 flex-col justify-center gap-4">
        <Panel className="space-y-4 text-center">
          <p>{t("passwordSaved")}</p>
          <Button href="/login">{t("login")}</Button>
        </Panel>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col justify-center gap-4">
      <h1 className="display text-center text-3xl font-semibold">{t("setPassword")}</h1>
      <form
        action={async (formData) => {
          const result = await setPasswordWithTokenAction(kind, token, formData);
          if (result?.ok) setDone(true);
          else if (result?.error === "short") setError(t("passwordTooShort"));
          else if (result?.error === "mismatch") setError(t("passwordMismatch"));
          else if (result?.error === "disabled") setError(t("accountDisabled"));
          else setError(t("inviteExpired"));
        }}
      >
        <Panel className="space-y-3">
          <label className="text-sm text-muted">{t("newPassword")}</label>
          <input name="password" type="password" minLength={8} required className={fieldClass} />
          <label className="text-sm text-muted">{t("confirmPassword")}</label>
          <input name="confirm" type="password" minLength={8} required className={fieldClass} />
          {error ? <p className="text-sm text-red-2">{error}</p> : null}
          <Button type="submit">{t("save")}</Button>
        </Panel>
      </form>
    </div>
  );
}
