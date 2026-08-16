import { requireAdmin } from "@/lib/auth";
import { ScenarioEditor } from "@/components/screens/ScenarioEditor";

export default async function Page() {
  await requireAdmin();
  return <ScenarioEditor />;
}
