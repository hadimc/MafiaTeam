"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/lang";
import { Button, Panel, PasswordField, fieldClass } from "@/components/ui";
import { CopyLink } from "@/components/CopyLink";
import {
  deleteUserAction,
  resendInviteAction,
  sendResetLinkAction,
  setUserEnabledAction,
  updateUserAction,
} from "@/server/actions/users";

type User = {
  id: string;
  username: string;
  email: string;
  displayName: string;
  displayNameEn: string;
  isAdmin: boolean;
  enabled: boolean;
  hasPassword: boolean;
};

export function UserEditor({ user }: { user: User }) {
  const { t } = useLang();
  const router = useRouter();
  const [url, setUrl] = useState<string | null>(null);
  const [delivered, setDelivered] = useState(false);
  const [skipped, setSkipped] = useState<"placeholder" | "unconfigured" | "error" | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function explain(code?: string) {
    if (code === "exists") return t("userExists");
    if (code === "in_use") return t("userInUse");
    if (code === "last_admin") return t("lastAdmin");
    if (code === "self") return t("lastAdmin");
    if (code) return code;
    return null;
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <Button href="/admin/users" variant="ghost" className="w-auto self-start min-h-10 px-3 text-sm">
        {t("back")}
      </Button>
      <h1 className="display text-2xl font-semibold">{user.displayNameEn || user.displayName}</h1>
      <p className="text-sm text-muted">@{user.username}</p>

      <form
        action={async (formData) => {
          const result = await updateUserAction(user.id, formData);
          setError(explain(result?.error));
          if (!result?.error) router.refresh();
        }}
      >
        <Panel className="space-y-3">
          <label className="text-sm text-muted">{t("name")}</label>
          <input name="displayName" defaultValue={user.displayNameEn || user.displayName} required className={fieldClass} />
          <label className="text-sm text-muted">{t("email")}</label>
          <input name="email" type="email" defaultValue={user.email} required className={fieldClass} />
          <label className="text-sm text-muted">{t("newPassword")}</label>
          <PasswordField name="password" minLength={8} placeholder="••••••••" autoComplete="new-password" />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isAdmin" defaultChecked={user.isAdmin} />
            {t("makeAdmin")}
          </label>
          {error ? <p className="text-sm text-red-2">{error}</p> : null}
          <Button type="submit">{t("save")}</Button>
        </Panel>
      </form>

      <div className="grid grid-cols-2 gap-2">
        <Button
          variant={user.enabled ? "ghost" : "primary"}
          onClick={async () => {
            const result = await setUserEnabledAction(user.id, !user.enabled);
            setError(explain(result?.error));
            if (!result?.error) router.refresh();
          }}
        >
          {user.enabled ? t("disabled") : t("enabled")}
        </Button>
        <Button
          variant="ghost"
          disabled={sending}
          onClick={async () => {
            setSending(true);
            setError(null);
            const result = user.hasPassword
              ? await sendResetLinkAction(user.id)
              : await resendInviteAction(user.id);
            setSending(false);
            if (result.url) {
              setUrl(result.url);
              setDelivered(Boolean(result.delivered));
              setSkipped(result.skipped ?? null);
            }
            setError(explain(result.error));
          }}
        >
          {sending ? t("sending") : user.hasPassword ? t("sendReset") : t("resendInvite")}
        </Button>
      </div>

      {url ? (
        <div className="space-y-2">
          {delivered ? (
            <p className="text-sm text-gold">{t("emailSent")}</p>
          ) : skipped === "placeholder" ? (
            <p className="text-sm text-muted">{t("placeholderEmail")}</p>
          ) : (
            <p className="text-sm text-muted">{t("emailNotSent")}</p>
          )}
          <CopyLink url={url} />
        </div>
      ) : null}

      <Button
        variant="danger"
        onClick={async () => {
          const result = await deleteUserAction(user.id);
          if (result?.error) setError(explain(result.error));
          else router.push("/admin/users");
        }}
      >
        {t("deleteUser")}
      </Button>
    </div>
  );
}
