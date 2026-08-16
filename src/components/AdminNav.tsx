"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/lang";

const items = [
  { href: "/admin", key: "admin" as const, exact: true },
  { href: "/admin/users", key: "users" as const, exact: false },
  { href: "/admin/events", key: "events" as const, exact: false },
  { href: "/admin/scenarios", key: "scenarios" as const, exact: false },
];

export function AdminNav() {
  const { t } = useLang();
  const path = usePathname();

  return (
    <nav className="mb-4 grid grid-cols-4 gap-1">
      {items.map((item) => {
        const active = item.exact ? path === item.href : path.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-xl px-1 py-3 text-center text-xs ${active ? "bg-red text-white" : "border border-line text-muted"}`}
          >
            {t(item.key)}
          </Link>
        );
      })}
    </nav>
  );
}
