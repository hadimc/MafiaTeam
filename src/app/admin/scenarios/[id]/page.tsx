import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getScenario } from "@/lib/queries";
import { ScenarioEditor } from "@/components/screens/ScenarioEditor";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const scenario = await getScenario(id);
  if (!scenario) notFound();
  return (
    <ScenarioEditor
      scenario={{
        id: scenario.id,
        nameEn: scenario.nameEn,
        descriptionEn: scenario.descriptionEn,
        narratorCount: scenario.narratorCount,
        eventCount: scenario._count.events,
        roles: scenario.roles.map((role) => ({ key: role.key, quantity: role.quantity })),
      }}
    />
  );
}
