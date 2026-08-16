"use client";

import Link from "next/link";
import { useLang } from "@/lib/lang";

type Props = {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
  variant?: "primary" | "ghost" | "danger";
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
};

const styles = {
  primary:
    "bg-red text-white shadow-[0_10px_30px_rgba(192,57,43,0.35)] active:scale-[0.98]",
  ghost: "border border-line bg-card text-ink active:scale-[0.98]",
  danger: "bg-[#5a1510] text-[#ffd4cf] border border-red/40",
};

export function Button({
  href,
  onClick,
  children,
  variant = "primary",
  className = "",
  type = "button",
  disabled = false,
}: Props) {
  const cls = `flex min-h-12 w-full items-center justify-center rounded-2xl px-4 text-base font-semibold disabled:opacity-50 ${styles[variant]} ${className}`;
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={cls}>
      {children}
    </button>
  );
}

export const fieldClass =
  "min-h-12 w-full rounded-2xl border border-line bg-bg px-4 text-ink outline-none focus:border-gold/50";

export function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-3xl border border-line bg-card p-4 ${className}`}>
      {children}
    </div>
  );
}

export function FactionPill({ faction }: { faction: "citizen" | "mafia" | "independent" }) {
  const { lang } = useLang();
  const map = {
    citizen: { cls: "text-citizen border-citizen/30", fa: "شهروند", en: "Citizen" },
    mafia: { cls: "text-mafia border-mafia/30", fa: "مافیا", en: "Mafia" },
    independent: { cls: "text-indie border-indie/30", fa: "مستقل", en: "Independent" },
  };
  const item = map[faction];
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[11px] ${item.cls}`}>
      {item[lang]}
    </span>
  );
}
