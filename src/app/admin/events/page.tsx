import { requireAdmin } from "@/lib/auth";
import { listEvents } from "@/lib/queries";
import { AdminEvents } from "@/components/screens/AdminEvents";

export default async function Page() {
  await requireAdmin();
  const events = await listEvents();
  return <AdminEvents events={JSON.parse(JSON.stringify(events))} />;
}
