import { requireUser } from "@/lib/auth";
import { listEvents } from "@/lib/queries";
import { PastEventsView } from "@/components/screens/DashboardView";

export const dynamic = "force-dynamic";

export default async function PastEventsPage() {
  await requireUser();
  const events = await listEvents();
  return <PastEventsView events={JSON.parse(JSON.stringify(events))} />;
}
