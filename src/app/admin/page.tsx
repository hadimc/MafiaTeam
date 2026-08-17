import { requireAdmin } from "@/lib/auth";
import { listEvents, listRules, listScenarios, listUsers } from "@/lib/queries";
import { AdminHome } from "@/components/screens/AdminHome";

export default async function Page() {
  await requireAdmin();
  const [users, events, scenarios, rules] = await Promise.all([
    listUsers(),
    listEvents(),
    listScenarios(),
    listRules(),
  ]);
  return (
    <AdminHome
      users={users.length}
      events={events.length}
      scenarios={scenarios.length}
      rules={rules.length}
    />
  );
}
