"use client";

import Link from "next/link";
import { useLang, enName } from "@/lib/lang";
import { Panel, SeatAvatar } from "@/components/ui";

type Person = { displayName: string; displayNameEn: string };

export function Roster({
  title,
  people,
  me,
  name,
  seat,
  canSwitch,
  onSwitch,
}: {
  title: string;
  people: { userId: string; user: Person }[];
  me: string;
  name: (person: Person) => string;
  seat: "narrator" | "player";
  canSwitch: boolean;
  onSwitch: () => void;
}) {
  const { t } = useLang();
  return (
    <Panel>
      <h2 className="mb-3 text-sm text-muted">{title}</h2>
      {people.length === 0 ? <p className="text-sm text-muted">—</p> : null}
      <ol className="space-y-2">
        {people.map((reg, i) => (
          <li key={reg.userId} className="flex items-center justify-between gap-3 rounded-2xl bg-bg-elev px-3 py-2.5">
            <span className="flex items-center gap-3">
              <SeatAvatar name={name(reg.user)} seat={i + 1} />
              <span>{name(reg.user)}</span>
            </span>
            {reg.userId === me && canSwitch ? (
              <button
                type="button"
                className="rounded-full bg-gold px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-black"
                onClick={onSwitch}
              >
                {seat === "narrator" ? t("bePlayer") : t("beNarrator")}
              </button>
            ) : (
              <span className="text-[11px] uppercase tracking-wide text-muted">
                {seat === "narrator" ? t("narrator") : t("asPlayer")}
              </span>
            )}
          </li>
        ))}
      </ol>
    </Panel>
  );
}

export function RosterPeek({
  href,
  narrators,
  players,
}: {
  href: string;
  narrators: { userId: string; user: Person }[];
  players: { userId: string; user: Person }[];
}) {
  const { t } = useLang();
  const faces = [...narrators, ...players].slice(0, 5);
  const extra = narrators.length + players.length - faces.length;
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-card/80 px-4 py-3 active:scale-[0.98]"
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex">
          {faces.map((row, i) => (
            <span key={row.userId} className={i === 0 ? "" : "-ml-2.5"}>
              <SeatAvatar name={enName(row.user)} />
            </span>
          ))}
        </span>
        <span className="min-w-0 text-start">
          <span className="block truncate text-sm font-semibold">
            {players.length} {t("players").toLowerCase()}
          </span>
          <span className="block truncate text-[11px] text-muted">
            {narrators.length} {t("narrators").toLowerCase()}
            {extra > 0 ? ` · +${extra}` : ""}
          </span>
        </span>
      </span>
      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-gold">{t("seeAll")}</span>
    </Link>
  );
}
