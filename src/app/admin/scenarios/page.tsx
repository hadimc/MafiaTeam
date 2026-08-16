import { requireAdmin } from "@/lib/auth";
import { listAllScenarios } from "@/lib/queries";
import { AdminScenarios } from "@/components/screens/AdminScenarios";

export default async function Page() {
  await requireAdmin();
  const scenarios = await listAllScenarios();
  return (
    <AdminScenarios
      scenarios={scenarios.map((scenario) => ({
        id: scenario.id,
        name: scenario.name,
        nameEn: scenario.nameEn,
        attendeeCount: scenario.attendeeCount,
        narratorCount: scenario.narratorCount,
        supportedPlayerCount: scenario.supportedPlayerCount,
        eventCount: scenario._count.events,
        roles: scenario.roles.map((role) => ({
          name: role.name,
          nameEn: role.nameEn,
          quantity: role.quantity,
        })),
      }))}
    />
  );
}
