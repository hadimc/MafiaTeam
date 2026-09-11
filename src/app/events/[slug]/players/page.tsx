import { requireUser } from "@/lib/auth";
import { getEventBySlug, listEnabledMembers } from "@/lib/queries";
import { notFound } from "next/navigation";
import { EventRosterPage } from "@/components/screens/EventRosterPage";

export const dynamic = "force-dynamic";

export default async function EventPlayersPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser(`/events/${slug}/players`);
  const event = await getEventBySlug(slug);
  if (!event) notFound();
  const members = user.isAdmin ? await listEnabledMembers() : [];
  return (
    <EventRosterPage
      user={user}
      event={JSON.parse(JSON.stringify(event))}
      members={JSON.parse(JSON.stringify(members))}
    />
  );
}
