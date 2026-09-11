"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useLang } from "@/lib/lang";
import { BrandMark, Button, Panel, fieldClass } from "@/components/ui";
import { requestPasswordResetAction } from "@/server/actions/auth";

export default function ForgotPasswordPage() {
  const { t } = useLang();
  const [state, action, pending] = useActionState(requestPasswordResetAction, null);

  return (
    <div className="flex flex-1 flex-col justify-center gap-8 py-6">
      <div className="text-center">
        <BrandMark className="mx-auto mb-5 h-16 w-16" />
        <h1 className="display mt-2 text-4xl font-semibold text-ink">{t("forgotPasswordTitle")}</h1>
        <p className="mt-2 text-sm text-muted">{t("forgotPasswordHint")}</p>
      </div>

      {state?.sent ? (
        <Panel className="space-y-3 text-center">
          <p className="text-sm text-ink">{t("forgotPasswordSent")}</p>
          <p className="text-sm text-muted">{t("forgotPasswordExpiry")}</p>
          <Button href="/login" variant="ghost" className="mt-2">
            {t("backToLogin")}
          </Button>
        </Panel>
      ) : (
        <form action={action}>
          <Panel className="space-y-3">
            <label className="block text-xs uppercase tracking-[0.16em] text-muted">
              {t("emailOrUsername")}
            </label>
            <input name="username" autoComplete="username" className={fieldClass} />
            {state?.error === "rate" ? (
              <p className="text-sm text-mafia">{t("resetTooSoon")}</p>
            ) : state?.error ? (
              <p className="text-sm text-mafia">{t("checkFields")}</p>
            ) : null}
            <Button type="submit" disabled={pending} className="mt-2">
              {t("sendResetEmail")}
            </Button>
            <p className="pt-1 text-center text-sm">
              <Link href="/login" className="text-gold">
                {t("backToLogin")}
              </Link>
            </p>
          </Panel>
        </form>
      )}
    </div>
  );
}
