"use client";

import { useLang, enName } from "@/lib/lang";
import { Button } from "@/components/ui";
import { AddPlayerForm, Roster, type ClubMember } from "@/components/screens/Roster";
import { MAX_NARRATORS, splitRoster } from "@/lib/roster";
import { isRosterOpen } from "@/lib/stats";
import { removePlayerFromEventAction } from "@/server/actions/events";
import type { SessionUser } from "@/lib/auth";

type Person = { displayName: string; displayNameEn: string };

export function EventRosterPage({
  user,
  event,
  members = [],
}: {
  user: SessionUser;
  event: {
    id: string;
    slug: string;
    title: string;
    titleEn: string;
    status: string;
    narrators: { userId: string; user: { id: string } & Person }[];
    registrations: { userId: string; user: Person }[];
  };
  members?: ClubMember[];
}) {
  const { t } = useLang();
  const { narrators, players } = splitRoster(event.registrations, event);
  const name = (person: Person) => enName(person);
  const canEdit = user.isAdmin && isRosterOpen(event.status);
  const onRemove = canEdit
    ? (userId: string) => void removePlayerFromEventAction(event.id, userId)
    : undefined;
  return (
    <div className="flex flex-1 flex-col gap-4">
      <Button href={`/events/${event.slug}`} variant="ghost" className="w-auto self-start min-h-10 px-3 text-sm">
        {t("back")}
      </Button>
      <header>
        <p className="text-[11px] uppercase tracking-[0.22em] text-gold">{t("playerList")}</p>
        <h1 className="display mt-1 text-3xl font-semibold leading-tight">{event.titleEn || event.title}</h1>
      </header>
      <Roster
        title={`${t("narrators")} · ${narrators.length}/${MAX_NARRATORS}`}
        people={narrators}
        me={user.id}
        name={name}
        seat="narrator"
        canSwitch={false}
        onSwitch={() => undefined}
        onRemove={onRemove}
      />
      <Roster
        title={`${t("players")} · ${players.length}`}
        people={players}
        me={user.id}
        name={name}
        seat="player"
        canSwitch={false}
        onSwitch={() => undefined}
        onRemove={onRemove}
      />
      {canEdit ? (
        <AddPlayerForm
          eventId={event.id}
          members={members}
          registeredIds={event.registrations.map((row) => row.userId)}
        />
      ) : null}
    </div>
  );
}
