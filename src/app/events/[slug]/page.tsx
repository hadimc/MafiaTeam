import { requireUser } from "@/lib/auth";
import { getEventBySlug, listEnabledMembers, listScenariosForEvent } from "@/lib/queries";
import { notFound } from "next/navigation";
import { EventView } from "@/components/screens/EventView";

export const dynamic = "force-dynamic";

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser(`/events/${slug}`);
  const event = await getEventBySlug(slug);
  if (!event) notFound();
  const [scenarios, members] = await Promise.all([
    listScenariosForEvent(event.scenarioId),
    user.isAdmin ? listEnabledMembers() : Promise.resolve([]),
  ]);
  return (
    <EventView
      user={user}
      event={JSON.parse(JSON.stringify(event))}
      scenarios={JSON.parse(JSON.stringify(scenarios))}
      members={JSON.parse(JSON.stringify(members))}
    />
  );
}
