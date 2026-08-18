"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useLang } from "@/lib/lang";
import { Button, Panel, fieldClass } from "@/components/ui";
import { CopyLink } from "@/components/CopyLink";
import { inviteUserAction } from "@/server/actions/users";

export default function InviteUserPage() {
  const { t } = useLang();
  const router = useRouter();
  const [url, setUrl] = useState<string | null>(null);
  const [delivered, setDelivered] = useState(false);
  const [skipped, setSkipped] = useState<"placeholder" | "unconfigured" | "error" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(formData: FormData) {
    setError(null);
    const result = await inviteUserAction(formData);
    if (result.error === "exists") setError(t("userExists"));
    else if (result.error) setError(t("invalidLogin"));
    if (result.url) {
      setUrl(result.url);
      setDelivered(Boolean(result.delivered));
      setSkipped(result.skipped ?? null);
      router.refresh();
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <Button href="/admin/users" variant="ghost" className="w-auto self-start min-h-10 px-3 text-sm">
        {t("back")}
      </Button>
      <h1 className="display text-2xl font-semibold">{t("inviteUser")}</h1>
      <form action={submit}>
        <Panel className="space-y-3">
          <label className="text-sm text-muted">{t("name")}</label>
          <input name="displayName" required className={fieldClass} />
          <label className="text-sm text-muted">{t("email")}</label>
          <input name="email" type="email" required className={fieldClass} />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="isAdmin" />
            {t("makeAdmin")}
          </label>
          {error ? <p className="text-sm text-red-2">{error}</p> : null}
          <Button type="submit">{t("sendInvite")}</Button>
        </Panel>
      </form>
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
    </div>
  );
}
