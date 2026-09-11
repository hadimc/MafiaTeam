"use client";

import { useState } from "react";
import { useLang } from "@/lib/lang";
import { Button } from "@/components/ui";

export function CopyLink({ url, label }: { url: string; label?: string }) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label ?? t("linkReady")}</p>
      <p className="break-all rounded-2xl bg-bg-elev px-3 py-2 text-xs text-muted">{url}</p>
      <Button
        variant="ghost"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
        }}
      >
        {copied ? t("copied") : t("copyLink")}
      </Button>
    </div>
  );
}

export function ShareJoinLink({
  slug,
  path,
  label,
  hint,
}: {
  slug: string;
  path?: string;
  label?: string;
  hint?: string;
}) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);
  const sharePath = path ?? `/events/${slug}`;

  async function copy() {
    await navigator.clipboard.writeText(`${window.location.origin}${sharePath}`);
    setCopied(true);
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted">{hint ?? t("shareLinkHint")}</p>
      <Button variant="ghost" onClick={() => void copy()}>
        {copied ? t("copied") : (label ?? t("shareLink"))}
      </Button>
    </div>
  );
}
