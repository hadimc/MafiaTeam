import { requireUser } from "@/lib/auth";
import { getFinishedEventRecap } from "@/lib/queries";
import { notFound } from "next/navigation";
import { EventResults } from "@/components/screens/EventResults";

export const dynamic = "force-dynamic";

export default async function EventResultsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireUser(`/events/${slug}/results`);
  const event = await getFinishedEventRecap(slug);
  const game = event?.games[0];
  if (!event || event.status !== "finished" || !game?.winningFaction) notFound();

  return (
    <EventResults
      event={JSON.parse(
        JSON.stringify({
          slug: event.slug,
          title: event.title,
          titleEn: event.titleEn,
          scenario: event.scenario,
        }),
      )}
      game={JSON.parse(
        JSON.stringify({
          currentDay: game.currentDay,
          winningFaction: game.winningFaction,
          startedAt: game.startedAt,
          finishedAt: game.finishedAt,
          players: game.players.map((player) => ({
            id: player.id,
            userId: player.userId,
            seatNumber: player.seatNumber,
            roleKey: player.roleKey,
            roleName: player.roleName,
            roleNameEn: player.roleNameEn,
            faction: player.faction,
            alive: player.alive,
            eliminationReason: player.eliminationReason,
            user: {
              displayName: player.user.displayName,
              displayNameEn: player.user.displayNameEn,
            },
          })),
          actions: game.actions.map((action) => ({
            actionType: action.actionType,
            dayNumber: action.dayNumber,
            phase: action.phase,
            targetPlayerId: action.targetPlayerId,
            messageEn: action.messageEn,
            message: action.message,
          })),
        }),
      )}
    />
  );
}
