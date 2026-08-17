"use client";

import { useLang } from "@/lib/lang";
import { Button, Panel, fieldClass } from "@/components/ui";
import { createRuleAction, deleteRuleAction, updateRuleAction } from "@/server/actions/rules";

type Rule = { id: string; titleEn: string; bodyEn: string };

export function AdminRules({ rules }: { rules: Rule[] }) {
  const { t } = useLang();
  return (
    <div className="flex flex-1 flex-col gap-4">
      {rules.map((rule) => (
        <form key={rule.id} action={updateRuleAction.bind(null, rule.id)}>
          <Panel className="space-y-3">
            <input name="title" defaultValue={rule.titleEn} className={fieldClass} />
            <textarea name="body" defaultValue={rule.bodyEn} rows={5} className={`${fieldClass} h-auto py-3`} />
            <div className="grid grid-cols-2 gap-2">
              <Button type="submit">{t("save")}</Button>
              <Button
                variant="danger"
                onClick={() => deleteRuleAction(rule.id)}
              >
                {t("deleteRule")}
              </Button>
            </div>
          </Panel>
        </form>
      ))}
      <form action={createRuleAction}>
        <Panel className="space-y-3">
          <h2 className="font-semibold">{t("newRule")}</h2>
          <input name="title" placeholder={t("ruleTitle")} className={fieldClass} />
          <textarea name="body" placeholder={t("ruleBody")} rows={4} className={`${fieldClass} h-auto py-3`} />
          <Button type="submit">{t("confirm")}</Button>
        </Panel>
      </form>
    </div>
  );
}
