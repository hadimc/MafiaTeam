"use client";

import { useState } from "react";
import { useLang } from "@/lib/lang";
import { Button } from "@/components/ui";

export function CopyLink({ url }: { url: string }) {
  const { t } = useLang();
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-2">
      <p className="text-sm text-gold">{t("linkReady")}</p>
      <p className="break-all rounded-2xl bg-bg px-3 py-2 text-xs text-muted">{url}</p>
      <Button
        variant="ghost"
        onClick={async () => {
          await navigator.clipboard.writeText(url);
          setCopied(true);
        }}
      >
        {copied ? "✓" : t("copyLink")}
      </Button>
    </div>
  );
}
