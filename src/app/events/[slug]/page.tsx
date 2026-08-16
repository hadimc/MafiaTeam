import { requireUser } from "@/lib/auth";
import { getEventBySlug, listScenarios } from "@/lib/queries";
import { notFound } from "next/navigation";
import { EventView } from "@/components/screens/EventView";

export default async function EventPage({ params }: { params: Promise<{ slug: string }> }) {
  const user = await requireUser();
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();
  const scenarios = await listScenarios();
  return (
    <EventView
      user={user}
      event={JSON.parse(JSON.stringify(event))}
      scenarios={JSON.parse(JSON.stringify(scenarios))}
    />
  );
}
