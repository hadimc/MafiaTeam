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

export function CopyLinkIcon({
  path,
  label,
}: {
  path: string;
  label?: string;
}) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(`${window.location.origin}${path}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={() => void copy()}
      title={copied ? t("copied") : (label ?? t("copyLink"))}
      aria-label={copied ? t("copied") : (label ?? t("copyLink"))}
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-line bg-card/80 text-gold active:scale-[0.98]"
    >
      {copied ? (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 12l5 5L20 7" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M10 13a5 5 0 0 0 7.07 0l1.41-1.41a5 5 0 0 0-7.07-7.07L10 5.93" />
          <path d="M14 11a5 5 0 0 0-7.07 0L5.5 12.41a5 5 0 0 0 7.07 7.07L14 18.07" />
        </svg>
      )}
    </button>
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
