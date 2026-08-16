import { requireAdmin } from "@/lib/auth";
import { listRules } from "@/lib/queries";
import { AdminRules } from "@/components/screens/AdminRules";

export default async function Page() {
  await requireAdmin();
  const rules = await listRules();
  return <AdminRules rules={rules.map((r) => ({ id: r.id, titleEn: r.titleEn, bodyEn: r.bodyEn }))} />;
}
