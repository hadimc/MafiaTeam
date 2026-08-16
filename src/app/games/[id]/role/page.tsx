import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getGameForNarrator, getMyGamePlayer } from "@/lib/queries";
import { RoleReveal } from "@/components/screens/RoleReveal";

export const dynamic = "force-dynamic";

export default async function RolePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const mine = await getMyGamePlayer(id, user.id);
  if (mine) {
    return (
      <RoleReveal
        gameId={id}
        roleKey={mine.roleKey}
        roleName={mine.roleName}
        roleNameEn={mine.roleNameEn}
        faction={mine.faction as "citizen" | "mafia" | "independent"}
        description={mine.roleDescription}
        descriptionEn={mine.roleDescriptionEn}
        backHref={`/events/${mine.game.event.slug}`}
      />
    );
  }
  const asNarrator = await getGameForNarrator(id, user);
  if (asNarrator) redirect(`/games/${id}/narrator`);
  notFound();
}
