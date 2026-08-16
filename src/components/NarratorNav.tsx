"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useLang } from "@/lib/lang";

const items = [
  { href: (id: string) => `/games/${id}/narrator`, key: "players" as const, icon: PlayersIcon },
  { href: (id: string) => `/games/${id}/narrator/day`, key: "day" as const, icon: DayIcon },
  { href: (id: string) => `/games/${id}/narrator/night`, key: "night" as const, icon: NightIcon },
  { href: (id: string) => `/games/${id}/narrator/history`, key: "history" as const, icon: HistoryIcon },
];

export function NarratorNav({ current }: { current: "players" | "day" | "night" | "history" }) {
  const { t } = useLang();
  const params = useParams<{ id: string }>();
  const id = params.id;

  return (
    <nav className="sticky bottom-0 z-10 mt-5 -mx-5 border-t border-line bg-bg/90 px-3 py-2 backdrop-blur-md">
      <div className="grid grid-cols-4 gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = current === item.key;
          return (
            <Link
              key={item.key}
              href={item.href(id)}
              className={`flex flex-col items-center gap-1 rounded-2xl px-1 py-2.5 text-[11px] ${
                active ? "bg-gold/15 text-gold" : "text-muted"
              }`}
            >
              <Icon />
              {t(item.key)}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function PlayersIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="9" cy="8" r="3" />
      <circle cx="16" cy="9" r="2.4" />
      <path d="M4 19c.6-3 2.6-4.5 5-4.5s4.4 1.5 5 4.5" />
      <path d="M14.5 14.8c1.8.2 3.5 1.4 4 4.2" />
    </svg>
  );
}

function DayIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
    </svg>
  );
}

function NightIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M16 4.5A7.5 7.5 0 1 1 7.2 18.2 6.2 6.2 0 0 0 16 4.5Z" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M4 5h16M4 12h10M4 19h16" />
    </svg>
  );
}
