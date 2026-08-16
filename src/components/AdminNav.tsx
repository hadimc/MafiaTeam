"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLang } from "@/lib/lang";

const items = [
  { href: "/admin/users", key: "users" as const },
  { href: "/admin/scenarios", key: "scenarios" as const },
  { href: "/admin/rules", key: "rules" as const },
];

export function AdminNav() {
  const { t } = useLang();
  const path = usePathname();

  return (
    <nav className="mb-5 grid grid-cols-3 gap-1 rounded-2xl border border-line bg-card/70 p-1">
      {items.map((item) => {
        const active = path === "/admin" ? false : path.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-xl px-1 py-2.5 text-center text-[11px] tracking-wide ${
              active ? "bg-gold text-black font-semibold" : "text-muted"
            }`}
          >
            {t(item.key)}
          </Link>
        );
      })}
    </nav>
  );
}
