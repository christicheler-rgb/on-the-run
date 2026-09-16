import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  SECTOR_BLURB,
  SECTOR_LABEL,
  formatBp,
  formatYield,
  toBp,
  yieldDelta,
  type Sector,
  type YieldCurveSnapshot,
} from "@/lib/treasury/model";
import { cn } from "@/lib/utils";

const FILTERS: { id: "all" | Sector; label: string }[] = [
  { id: "all", label: "All" },
  { id: "bill", label: "Bills" },
  { id: "note", label: "Notes" },
  { id: "bond", label: "Bonds" },
];

function ChangeCell({ current, prior }: { current: number | null; prior: number | null }) {
  const bp = toBp(yieldDelta(current, prior));
  if (bp == null) return <span className="text-faint">—</span>;
  const up = bp > 0;
  const flat = bp === 0;
  return (
    <span className={cn("tabular-nums", flat ? "text-muted" : up ? "text-rise" : "text-fall")}>{formatBp(bp)}</span>
  );
}

export function YieldTable({ data }: { data: YieldCurveSnapshot }) {
  const [filter, setFilter] = useState<"all" | Sector>("all");
  const rows = useMemo(
    () => (filter === "all" ? data.tenors : data.tenors.filter((t) => t.sector === filter)),
    [data.tenors, filter],
  );

  const now = format(parseISO(data.currentDate), "d MMM");
  const d5 = format(parseISO(data.fiveDayDate), "d MMM");
  const m3 = format(parseISO(data.threeMonthDate), "d MMM");
  const y1 = format(parseISO(data.oneYearDate), "d MMM yyyy");

  return (
    <section className="rounded-xl bg-surface p-4 shadow-border sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-medium tracking-tight">The book</h2>
          <p className="mt-1 text-sm text-muted">
            {filter === "all" ? "Every major on-the-run tenor." : SECTOR_BLURB[filter]}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Instrument type">
          {FILTERS.map((item) => {
            const active = filter === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(item.id)}
                className={cn(
                  "min-h-11 rounded-md px-3.5 text-sm font-medium transition-colors duration-150 ease-out",
                  active ? "bg-elevated text-fg shadow-border" : "text-muted hover:text-fg",
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <table className="w-full min-w-5xl border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th className="sticky left-0 bg-surface pb-2 pr-4 font-medium">Tenor</th>
              <th className="pb-2 pr-4 font-medium">Type</th>
              <th className="pb-2 pr-4 text-right font-medium">Now · {now}</th>
              <th className="pb-2 pr-4 text-right font-medium">5 days · {d5}</th>
              <th className="pb-2 pr-4 text-right font-medium">3 months · {m3}</th>
              <th className="pb-2 pr-4 text-right font-medium">1 year · {y1}</th>
              <th className="pb-2 pr-4 text-right font-medium">Δ 5 days</th>
              <th className="pb-2 pr-4 text-right font-medium">Δ 3 months</th>
              <th className="pb-2 text-right font-medium">Δ 1 year</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-border">
                <th scope="row" className="sticky left-0 bg-surface py-2.5 pr-4 text-left font-medium text-fg">
                  <span className="tabular-nums">{row.label}</span>
                  <span className="ml-2 hidden font-normal text-faint sm:inline">{row.name}</span>
                </th>
                <td className="py-2.5 pr-4">
                  <span className="rounded-full px-2 py-0.5 text-xs text-muted shadow-border">
                    {SECTOR_LABEL[row.sector]}
                  </span>
                </td>
                <td className="py-2.5 pr-4 text-right font-medium tabular-nums text-now">{formatYield(row.now)}</td>
                <td className="py-2.5 pr-4 text-right tabular-nums text-ago5">{formatYield(row.d5)}</td>
                <td className="py-2.5 pr-4 text-right tabular-nums text-ago3">{formatYield(row.m3)}</td>
                <td className="py-2.5 pr-4 text-right tabular-nums text-ago1">{formatYield(row.y1)}</td>
                <td className="py-2.5 pr-4 text-right">
                  <ChangeCell current={row.now} prior={row.d5} />
                </td>
                <td className="py-2.5 pr-4 text-right">
                  <ChangeCell current={row.now} prior={row.m3} />
                </td>
                <td className="py-2.5 text-right">
                  <ChangeCell current={row.now} prior={row.y1} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
