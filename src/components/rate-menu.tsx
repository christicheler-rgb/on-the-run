import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { format, parseISO } from "date-fns";
import { getRateSensitivity, type SensitivityReport } from "@/lib/equities/get-rate-sensitivity";
import { formatYield, type YieldCurveSnapshot } from "@/lib/treasury/model";
import { cn } from "@/lib/utils";

function formatMove(pct: number): string {
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

export function RateMenu({ curve }: { curve: YieldCurveSnapshot }) {
  const [report, setReport] = useState<SensitivityReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState("10Y");

  useEffect(() => {
    let live = true;
    getRateSensitivity()
      .then((value) => {
        if (live) setReport(value);
      })
      .catch((err: unknown) => {
        if (!live) return;
        setError(err instanceof Error && err.message ? err.message : "Equity sensitivities could not be loaded.");
      });
    return () => {
      live = false;
    };
  }, []);

  return (
    <section className="rounded-xl bg-surface p-4 shadow-border sm:p-5">
      <div className="max-w-3xl">
        <h2 className="font-display text-xl font-medium tracking-tight">Equity drill-down</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Five listed names with the largest one-year price response to each node. A negative figure means the
          share price fell, on average, when that yield rose.
        </p>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-muted">{error}</p>
      ) : !report ? (
        <div className="mt-4 space-y-2" aria-hidden>
          <div className="h-12 rounded-md bg-elevated" />
          <div className="h-12 rounded-md bg-elevated" />
          <div className="h-12 rounded-md bg-elevated" />
          <p className="sr-only">Ranking equities against each tenor</p>
        </div>
      ) : (
        <div className="mt-4 divide-y divide-border">
          {report.nodes.map((node) => {
            const expanded = open === node.key;
            const live = curve.tenors.find((tenor) => tenor.key === node.key);
            const peak = node.picks[0] ? Math.abs(node.picks[0].pctPer100bp) : 1;
            return (
              <div key={node.key}>
                <button
                  type="button"
                  aria-expanded={expanded}
                  onClick={() => setOpen(expanded ? "" : node.key)}
                  className="flex min-h-12 w-full items-center gap-3 py-2 text-left"
                >
                  <span className="w-10 shrink-0 font-medium tabular-nums text-fg">{node.label}</span>
                  <span className="min-w-0 flex-1 truncate text-sm text-muted">{node.name}</span>
                  <span className="shrink-0 tabular-nums text-now">{formatYield(live?.now ?? null)}</span>
                  <ChevronDown
                    className={cn("size-4 shrink-0 text-faint transition-transform duration-200 ease-out", expanded && "rotate-180")}
                  />
                </button>
                {expanded ? (
                  <div className="pb-4">
                    {node.weak ? (
                      <p className="mb-3 text-xs text-faint">
                        Weak link. Daily moves in this node do not line up cleanly with the desk over the last year.
                      </p>
                    ) : null}
                    {node.picks.length === 0 ? (
                      <p className="text-sm text-muted">Not enough overlapping closes to rank this node.</p>
                    ) : (
                      <ol className="space-y-3">
                        {node.picks.map((pick, index) => {
                          const width = Math.max(8, Math.round((Math.abs(pick.pctPer100bp) / peak) * 100));
                          const falls = pick.pctPer100bp < 0;
                          return (
                        <li key={pick.ticker}>
                          <div className="flex items-baseline justify-between gap-3">
                            <p className="min-w-0 truncate">
                              <span className="tabular-nums text-faint">{index + 1}</span>
                              <span className="ml-2 font-medium tracking-wide text-fg">{pick.ticker}</span>
                              <span className="ml-2 text-sm text-muted">{pick.name}</span>
                            </p>
                            <p className="shrink-0 text-sm tabular-nums text-fg">
                              {formatMove(pick.pctPer100bp)}
                              <span className="ml-1 text-faint">per 100 bp</span>
                            </p>
                          </div>
                          <div className="mt-2 h-1 overflow-hidden rounded-full bg-elevated">
                            <div className={cn("h-1 rounded-full", falls ? "bg-ago1" : "bg-ago5")} style={{ width: `${width}%` }} />
                          </div>
                          <p className="mt-1 text-xs text-faint">
                            {pick.sleeve}
                            {falls ? " · price fell when this yield rose" : " · price rose when this yield rose"}
                          </p>
                        </li>
                      );
                        })}
                      </ol>
                    )}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-4 max-w-3xl text-xs leading-relaxed text-faint">
        {report
          ? `Trailing year of daily closes from ${format(parseISO(report.windowStart), "d MMM yyyy")} through ${format(parseISO(report.asOf), "d MMM yyyy")}, ${report.fitted} of ${report.deskSize} desk names. `
          : null}
        Ranked inside a fixed desk of banks, brokers, insurers, homebuilders, REITs, utilities, and long-duration
        growth — not the entire market. The same names repeat across coupon nodes because those yields move together.
        A past co-movement is not a forecast. Not investment advice.
      </p>
    </section>
  );
}
