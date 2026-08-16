import { requireUser } from "@/lib/auth";
import { listEvents, listFinishedGames } from "@/lib/queries";
import { computeStats } from "@/lib/stats";
import { DashboardView } from "@/components/screens/DashboardView";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const [events, finished] = await Promise.all([listEvents(), listFinishedGames()]);
  const stats = computeStats(finished, user.id);
  return (
    <DashboardView
      user={user}
      events={JSON.parse(JSON.stringify(events))}
      stats={JSON.parse(JSON.stringify(stats))}
    />
  );
}
