"use client";

import { DEALABLE_ROLES, maxQuantity } from "@/lib/catalog";

export function RoleSteppers({
  qty,
  onChange,
}: {
  qty: Record<string, number>;
  onChange: (key: string, next: number) => void;
}) {
  return (
    <div className="space-y-2">
      {DEALABLE_ROLES.map((role) => (
        <div key={role.key} className="flex items-center justify-between gap-3 rounded-2xl bg-bg-elev px-4 py-3.5">
          <div className="min-w-0">
            <p className="truncate font-medium">{role.nameEn}</p>
            <p className="truncate text-[11px] text-muted">{role.summaryEn}</p>
          </div>
          <Stepper value={qty[role.key] ?? 0} onChange={(n) => onChange(role.key, n)} max={maxQuantity(role.key)} />
          <input type="hidden" name={`qty_${role.key}`} value={qty[role.key] ?? 0} />
        </div>
      ))}
    </div>
  );
}

function Stepper({
  value,
  onChange,
  max,
}: {
  value: number;
  onChange: (n: number) => void;
  max: number;
}) {
  const btn =
    "flex h-9 w-9 items-center justify-center rounded-full text-lg text-muted disabled:opacity-25";
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button type="button" className={btn} disabled={value <= 0} onClick={() => onChange(value - 1)} aria-label="Decrease">
        −
      </button>
      <span className="min-w-7 text-center text-lg font-semibold text-gold">{value}</span>
      <button type="button" className={btn} disabled={value >= max} onClick={() => onChange(value + 1)} aria-label="Increase">
        +
      </button>
    </div>
  );
}
