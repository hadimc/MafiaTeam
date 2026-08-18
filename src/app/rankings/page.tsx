import { requireUser } from "@/lib/auth";
import { listEnabledMembers, listFinishedGames } from "@/lib/queries";
import { computeStats } from "@/lib/stats";
import { RankingsView } from "@/components/screens/DashboardView";

export const dynamic = "force-dynamic";

export default async function RankingsPage() {
  const user = await requireUser();
  const [finished, members] = await Promise.all([listFinishedGames(), listEnabledMembers()]);
  const stats = computeStats(finished, user.id, members);
  return <RankingsView userId={user.id} table={JSON.parse(JSON.stringify(stats.table))} />;
}
