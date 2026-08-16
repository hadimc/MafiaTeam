import { requireAdmin } from "@/lib/auth";
import { listRules, listScenarios, listUsers } from "@/lib/queries";
import { AdminHome } from "@/components/screens/AdminHome";

export default async function Page() {
  await requireAdmin();
  const [users, scenarios, rules] = await Promise.all([listUsers(), listScenarios(), listRules()]);
  return <AdminHome users={users.length} scenarios={scenarios.length} rules={rules.length} />;
}
