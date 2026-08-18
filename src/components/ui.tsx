"use client";

import { useState } from "react";
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
    "bg-linear-to-b from-gold to-gold-2 text-black shadow-[0_8px_24px_rgba(232,197,71,0.18)] active:scale-[0.98]",
  ghost: "border border-line bg-card/80 text-ink active:scale-[0.98]",
  danger: "border border-red/30 bg-red/15 text-mafia",
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
  const cls = `flex min-h-12 w-full items-center justify-center rounded-2xl px-4 text-sm font-semibold tracking-wide disabled:opacity-50 ${styles[variant]} ${className}`;
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
  "min-h-12 w-full rounded-2xl border border-line bg-bg-elev px-4 text-ink outline-none placeholder:text-muted/60 focus:border-gold/50";

export function PasswordField({
  name,
  autoComplete,
  required,
  minLength,
  placeholder,
  className = "",
}: {
  name: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  placeholder?: string;
  className?: string;
}) {
  const { t } = useLang();
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        name={name}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        className={`${fieldClass} pe-12 ${className}`}
      />
      <button
        type="button"
        onClick={() => setShow((open) => !open)}
        className="absolute inset-y-0 end-0 flex w-12 items-center justify-center text-muted"
        aria-label={show ? t("hidePassword") : t("showPassword")}
      >
        {show ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M2.5 12s3.7-7 9.5-7 9.5 7 9.5 7-3.7 7-9.5 7-9.5-7-9.5-7Z" />
      <circle cx="12" cy="12" r="2.6" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M3 3l18 18" />
      <path d="M10.1 10.2A2.6 2.6 0 0 0 12 14.6c.5 0 1-.1 1.4-.4" />
      <path d="M6.1 6.5C4 8.1 2.5 12 2.5 12s3.7 7 9.5 7c2 0 3.8-.6 5.3-1.5" />
      <path d="M12 5c4.2 0 7.4 3.2 8.8 5.2-.5.7-1.1 1.5-1.9 2.3" />
    </svg>
  );
}

export function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-3xl border border-line bg-card/90 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.28)] ${className}`}>
      {children}
    </div>
  );
}

export function FactionPill({
  faction,
  farsi = false,
}: {
  faction: "citizen" | "mafia" | "independent";
  farsi?: boolean;
}) {
  const map = {
    citizen: { cls: "text-citizen border-citizen/30 bg-citizen/10", fa: "شهروند", en: "Citizen" },
    mafia: { cls: "text-mafia border-mafia/30 bg-red/15", fa: "مافیا", en: "Mafia" },
    independent: { cls: "text-indie border-indie/30 bg-indie/10", fa: "مستقل", en: "Independent" },
  };
  const item = map[faction];
  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide ${item.cls}`}>
      {farsi ? item.fa : item.en}
    </span>
  );
}

export function StatusPill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border border-line bg-bg-elev px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-gold">
      {children}
    </span>
  );
}

export function SeatAvatar({
  name,
  seat,
  faction,
  alive = true,
}: {
  name: string;
  seat?: number;
  faction?: "citizen" | "mafia" | "independent";
  alive?: boolean;
}) {
  const hue = [...name].reduce((h, c) => (h * 33 + c.charCodeAt(0)) % 360, 12);
  const ring =
    faction === "mafia"
      ? "ring-mafia"
      : faction === "citizen"
        ? "ring-citizen"
        : faction === "independent"
          ? "ring-indie"
          : "ring-gold/35";
  return (
    <div className={`relative shrink-0 ${alive ? "" : "opacity-35 grayscale"}`}>
      <div
        className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold text-white ring-2 ${ring}`}
        style={{ background: `hsl(${hue} 28% 26%)` }}
      >
        {name.slice(0, 1).toUpperCase()}
      </div>
      {seat != null ? (
        <span className="absolute -bottom-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold px-0.5 text-[9px] font-bold text-black">
          {seat}
        </span>
      ) : null}
    </div>
  );
}

export function BrandMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-2xl bg-linear-to-b from-[#3a1218] to-[#1a080b] text-gold ring-1 ring-gold/40 ${className}`}
    >
      <svg viewBox="0 0 32 32" className="h-[58%] w-[58%]" fill="currentColor" aria-hidden>
        <path d="M4 12.5 16 6l12 6.5v2.2L16 8.8 4 14.7v-2.2Z" />
        <path d="M7 14.2h3.2l2.4 7.4 3.4-9.2 3.4 9.2 2.4-7.4H25L20.2 27h-3.3L16 22.2 15.1 27h-3.3L7 14.2Z" />
      </svg>
    </span>
  );
}
