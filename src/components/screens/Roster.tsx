"use client";

import { useState } from "react";
import Link from "next/link";
import { useLang, enName } from "@/lib/lang";
import { Button, Panel, SeatAvatar, fieldClass } from "@/components/ui";
import { addPlayerToEventAction } from "@/server/actions/events";

type Person = { displayName: string; displayNameEn: string };

export type ClubMember = {
  id: string;
  username: string;
  displayName: string;
  displayNameEn: string;
};

export function Roster({
  title,
  people,
  me,
  name,
  seat,
  canSwitch,
  onSwitch,
  onRemove,
}: {
  title: string;
  people: { userId: string; user: Person }[];
  me: string;
  name: (person: Person) => string;
  seat: "narrator" | "player";
  canSwitch: boolean;
  onSwitch: () => void;
  onRemove?: (userId: string) => void;
}) {
  const { t } = useLang();
  return (
    <Panel>
      <h2 className="mb-3 text-sm text-muted">{title}</h2>
      {people.length === 0 ? <p className="text-sm text-muted">—</p> : null}
      <ol className="space-y-2">
        {people.map((reg, i) => (
          <li key={reg.userId} className="flex items-center justify-between gap-3 rounded-2xl bg-bg-elev px-3 py-2.5">
            <span className="flex min-w-0 items-center gap-3">
              <SeatAvatar name={name(reg.user)} seat={i + 1} />
              <span className="truncate">{name(reg.user)}</span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
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
              {onRemove ? (
                <button
                  type="button"
                  className="rounded-full border border-red/30 bg-red/15 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-mafia"
                  onClick={() => onRemove(reg.userId)}
                >
                  {t("removeFromEvent")}
                </button>
              ) : null}
            </span>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

export function AddPlayerForm({
  eventId,
  members,
  registeredIds,
}: {
  eventId: string;
  members: ClubMember[];
  registeredIds: string[];
}) {
  const { t } = useLang();
  const [userId, setUserId] = useState("");
  const taken = new Set(registeredIds);
  const available = members.filter((member) => !taken.has(member.id));
  const selected = available.some((member) => member.id === userId) ? userId : "";

  async function add() {
    if (!selected) return;
    await addPlayerToEventAction(eventId, selected);
    setUserId("");
  }

  return (
    <Panel className="space-y-3">
      <h2 className="text-sm text-muted">{t("addPlayer")}</h2>
      {available.length === 0 ? (
        <p className="text-sm text-muted">{t("everyoneHere")}</p>
      ) : (
        <>
          <select
            className={fieldClass}
            value={selected}
            onChange={(event) => setUserId(event.target.value)}
          >
            <option value="">{t("pickPlayer")}</option>
            {available.map((member) => (
              <option key={member.id} value={member.id}>
                {enName(member)}
              </option>
            ))}
          </select>
          <Button onClick={() => void add()} disabled={!selected}>
            {t("addPlayer")}
          </Button>
        </>
      )}
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
