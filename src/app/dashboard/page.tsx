import { requireUser } from "@/lib/auth";
import { listEvents } from "@/lib/queries";
import { DashboardView } from "@/components/screens/DashboardView";

export default async function DashboardPage() {
  const user = await requireUser();
  const events = await listEvents();
  return <DashboardView user={user} events={JSON.parse(JSON.stringify(events))} />;
}
