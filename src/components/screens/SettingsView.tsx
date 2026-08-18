"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/lang";
import { Button, Panel, PasswordField, fieldClass } from "@/components/ui";
import { logoutAction } from "@/server/actions/auth";
import { updateMyEmailAction, updateMyPasswordAction, updateMyProfileAction } from "@/server/actions/users";

type Profile = {
  username: string;
  email: string;
  displayName: string;
  displayNameEn: string;
};

export function SettingsView({ profile }: { profile: Profile }) {
  const { t } = useLang();
  const router = useRouter();
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSaved, setNameSaved] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSaved, setEmailSaved] = useState(false);
  const [emailLock, setEmailLock] = useState(0);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [passwordTick, setPasswordTick] = useState(0);

  return (
    <div className="flex flex-1 flex-col gap-4">
      <Button href="/dashboard" variant="ghost" className="w-auto self-start min-h-10 px-3 text-sm">
        {t("back")}
      </Button>
      <header>
        <p className="text-[11px] uppercase tracking-[0.22em] text-gold">@{profile.username}</p>
        <h1 className="display mt-1 text-3xl font-semibold">{t("profile")}</h1>
      </header>

      <form
        action={async (formData) => {
          const result = await updateMyProfileAction(formData);
          setNameSaved(!result?.error);
          setNameError(result?.error ? t("checkFields") : null);
          if (!result?.error) router.refresh();
        }}
      >
        <Panel className="space-y-3">
          <label className="text-sm text-muted">{t("name")}</label>
          <input
            name="displayName"
            defaultValue={profile.displayNameEn || profile.displayName}
            required
            className={fieldClass}
          />
          {nameError ? <p className="text-sm text-mafia">{nameError}</p> : null}
          {nameSaved ? <p className="text-sm text-gold">{t("saved")}</p> : null}
          <Button type="submit">{t("save")}</Button>
        </Panel>
      </form>

      <form
        action={async (formData) => {
          const result = await updateMyEmailAction(formData);
          if (result?.error === "exists") setEmailError(t("userExists"));
          else if (result?.error === "password") setEmailError(t("wrongPassword"));
          else if (result?.error) setEmailError(t("checkFields"));
          else setEmailError(null);
          setEmailSaved(!result?.error);
          if (!result?.error) {
            setEmailLock((tick) => tick + 1);
            router.refresh();
          }
        }}
      >
        <Panel className="space-y-3">
          <h2 className="display text-lg font-semibold">{t("changeEmail")}</h2>
          <label className="text-sm text-muted">{t("email")}</label>
          <input name="email" type="email" defaultValue={profile.email} required className={fieldClass} />
          <label className="text-sm text-muted">{t("currentPassword")}</label>
          <PasswordField
            key={emailLock}
            name="currentPassword"
            required
            autoComplete="current-password"
          />
          {emailError ? <p className="text-sm text-mafia">{emailError}</p> : null}
          {emailSaved ? <p className="text-sm text-gold">{t("saved")}</p> : null}
          <Button type="submit">{t("save")}</Button>
        </Panel>
      </form>

      <form
        key={`password-${passwordTick}`}
        action={async (formData) => {
          const result = await updateMyPasswordAction(formData);
          if (!result?.error) {
            setPasswordError(null);
            setPasswordSaved(true);
            setPasswordTick((tick) => tick + 1);
            return;
          }
          setPasswordSaved(false);
          setPasswordError(
            result.error === "short"
              ? t("passwordTooShort")
              : result.error === "mismatch"
                ? t("passwordMismatch")
                : result.error === "password"
                  ? t("wrongPassword")
                  : t("checkFields"),
          );
        }}
      >
        <Panel className="space-y-3">
          <h2 className="display text-lg font-semibold">{t("changePassword")}</h2>
          <label className="text-sm text-muted">{t("currentPassword")}</label>
          <PasswordField name="currentPassword" required autoComplete="current-password" />
          <label className="text-sm text-muted">{t("newPassword")}</label>
          <PasswordField name="password" minLength={8} required autoComplete="new-password" />
          <label className="text-sm text-muted">{t("confirmPassword")}</label>
          <PasswordField name="confirm" minLength={8} required autoComplete="new-password" />
          {passwordError ? <p className="text-sm text-mafia">{passwordError}</p> : null}
          {passwordSaved ? <p className="text-sm text-gold">{t("saved")}</p> : null}
          <Button type="submit">{t("save")}</Button>
        </Panel>
      </form>

      <form action={logoutAction}>
        <Button type="submit" variant="ghost">
          {t("logout")}
        </Button>
      </form>
    </div>
  );
}
