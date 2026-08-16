import { requireUser } from "@/lib/auth";
import { listRules } from "@/lib/queries";
import { Panel } from "@/components/ui";

export default async function Page() {
  await requireUser();
  const rules = await listRules();
  return (
    <div className="flex flex-1 flex-col gap-4">
      <header>
        <p className="text-[11px] uppercase tracking-[0.22em] text-gold">How we play</p>
        <h1 className="display mt-1 text-3xl font-semibold">House rules</h1>
      </header>
      {rules.map((rule) => (
        <Panel key={rule.id} className="space-y-2">
          <h2 className="display text-lg font-semibold">{rule.titleEn}</h2>
          <p className="whitespace-pre-wrap text-sm leading-6 text-muted">{rule.bodyEn}</p>
        </Panel>
      ))}
    </div>
  );
}
