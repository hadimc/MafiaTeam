import { requireAdmin } from "@/lib/auth";
import { listScenarios } from "@/lib/queries";
import { AdminScenarios } from "@/components/screens/AdminScenarios";

export default async function Page() {
  await requireAdmin();
  const scenarios = await listScenarios();
  return <AdminScenarios scenarios={JSON.parse(JSON.stringify(scenarios))} />;
}
