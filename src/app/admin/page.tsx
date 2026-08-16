import { requireAdmin } from "@/lib/auth";
import { listEvents, listScenarios, listUsers } from "@/lib/queries";
import { AdminHome } from "@/components/screens/AdminHome";

export default async function Page() {
  const user = await requireAdmin();
  const [users, events, scenarios] = await Promise.all([listUsers(), listEvents(), listScenarios()]);
  return (
    <AdminHome
      user={user}
      users={users.map((u) => ({
        id: u.id,
        username: u.username,
        displayName: u.displayName,
        isAdmin: u.isAdmin,
      }))}
      events={JSON.parse(JSON.stringify(events))}
      scenarios={JSON.parse(JSON.stringify(scenarios))}
    />
  );
}
