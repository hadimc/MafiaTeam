"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useLang } from "@/lib/lang";

const items = [
  { href: (id: string) => `/games/${id}/narrator`, key: "players" as const },
  { href: (id: string) => `/games/${id}/narrator/day`, key: "day" as const },
  { href: (id: string) => `/games/${id}/narrator/night`, key: "night" as const },
  { href: (id: string) => `/games/${id}/narrator/history`, key: "history" as const },
];

export function NarratorNav({ current }: { current: "players" | "day" | "night" | "history" }) {
  const { t } = useLang();
  const params = useParams<{ id: string }>();
  const id = params.id;

  return (
    <nav className="sticky bottom-0 mt-4 grid grid-cols-4 gap-1 border-t border-line bg-bg/95 py-2">
      {items.map((item) => (
        <Link
          key={item.key}
          href={item.href(id)}
          className={`rounded-xl px-1 py-3 text-center text-xs ${
            current === item.key ? "bg-red text-white" : "text-muted"
          }`}
        >
          {t(item.key)}
        </Link>
      ))}
    </nav>
  );
}
