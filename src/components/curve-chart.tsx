import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { formatYield, type YieldCurveSnapshot } from "@/lib/treasury/model";

type SeriesKey = "now" | "d5" | "m3" | "y1";

const SERIES: { key: SeriesKey; token: string }[] = [
  { key: "now", token: "bg-now" },
  { key: "d5", token: "bg-ago5" },
  { key: "m3", token: "bg-ago3" },
  { key: "y1", token: "bg-ago1" },
];

const SERIES_TITLE: Record<SeriesKey, string> = {
  now: "Now",
  d5: "5 trading days",
  m3: "3 months",
  y1: "1 year",
};

function seriesLabel(key: SeriesKey, data: YieldCurveSnapshot): { title: string; date: string } {
  if (key === "now") return { title: "Now", date: format(parseISO(data.currentDate), "d MMM yyyy") };
  if (key === "d5") return { title: "5 trading days ago", date: format(parseISO(data.fiveDayDate), "d MMM yyyy") };
  if (key === "m3") return { title: "3 months ago", date: format(parseISO(data.threeMonthDate), "d MMM yyyy") };
  return { title: "1 year ago", date: format(parseISO(data.oneYearDate), "d MMM yyyy") };
}

function CurveTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ dataKey?: string | number; value?: number; color?: string; payload?: { name?: string } }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const name = payload[0]?.payload?.name;
  return (
    <div className="rounded-md bg-elevated px-3 py-2 shadow-border">
      <p className="text-xs text-muted">{name ?? label}</p>
      <ul className="mt-1.5 space-y-1">
        {payload.map((item) => {
          const key = String(item.dataKey ?? "") as SeriesKey;
          return (
            <li key={key} className="flex items-center justify-between gap-6 text-sm">
              <span className="flex items-center gap-2 text-muted">
                <span className="size-1.5 rounded-full" style={{ background: item.color }} />
                {SERIES_TITLE[key] ?? key}
              </span>
              <span className="tabular-nums text-fg">{formatYield(item.value ?? null)}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function CurveChart({ data }: { data: YieldCurveSnapshot }) {
  const [visible, setVisible] = useState<Record<SeriesKey, boolean>>({
    now: true,
    d5: true,
    m3: true,
    y1: true,
  });

  const chartData = useMemo(
    () =>
      data.tenors.map((tenor) => ({
        label: tenor.label,
        name: tenor.name,
        now: tenor.now,
        d5: tenor.d5,
        m3: tenor.m3,
        y1: tenor.y1,
      })),
    [data.tenors],
  );

  const domain = useMemo(() => {
    const values = data.tenors
      .flatMap((t) => [t.now, t.d5, t.m3, t.y1])
      .filter((v): v is number => v != null);
    if (!values.length) return [0, 6] as [number, number];
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = Math.max(0.15, (max - min) * 0.12);
    return [Math.floor((min - pad) * 20) / 20, Math.ceil((max + pad) * 20) / 20] as [number, number];
  }, [data.tenors]);

  return (
    <section className="rounded-xl bg-surface p-4 shadow-border sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-display text-xl font-medium tracking-tight text-fg">Yield curve</h2>
          <p className="mt-1 max-w-xl text-sm text-muted">
            Par constant-maturity yields across bills, notes, and bonds.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {SERIES.map((series) => {
            const meta = seriesLabel(series.key, data);
            const on = visible[series.key];
            return (
              <button
                key={series.key}
                type="button"
                aria-pressed={on}
                onClick={() => setVisible((v) => ({ ...v, [series.key]: !v[series.key] }))}
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-md px-3 text-left transition-opacity duration-150 ease-out",
                  "shadow-border",
                  on ? "opacity-100" : "opacity-40",
                )}
              >
                <span className={cn("size-2 shrink-0 rounded-full", series.token)} />
                <span className="flex flex-col">
                  <span className="text-sm font-medium text-fg">{meta.title}</span>
                  <span className="text-xs tabular-nums text-muted">{meta.date}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 h-64 w-full sm:h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="color-mix(in oklab, var(--color-fg) 8%, transparent)" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              minTickGap={10}
              tick={{ fill: "var(--color-muted)", fontSize: 11, fontFamily: "var(--font-sans)" }}
            />
            <YAxis
              domain={domain}
              width={46}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => v.toFixed(2)}
              tick={{ fill: "var(--color-muted)", fontSize: 11, fontFamily: "var(--font-sans)" }}
            />
            <Tooltip
              content={<CurveTooltip />}
              cursor={{ stroke: "color-mix(in oklab, var(--color-fg) 22%, transparent)", strokeDasharray: "3 3" }}
            />
            {visible.now ? (
              <Line
                type="monotone"
                dataKey="now"
                stroke="var(--color-now)"
                strokeWidth={2.25}
                dot={false}
                activeDot={{ r: 4, fill: "var(--color-now)", stroke: "var(--color-bg)", strokeWidth: 2 }}
                connectNulls
              />
            ) : null}
            {visible.d5 ? (
              <Line
                type="monotone"
                dataKey="d5"
                stroke="var(--color-ago5)"
                strokeWidth={1.85}
                dot={false}
                activeDot={{ r: 3.5, fill: "var(--color-ago5)", stroke: "var(--color-bg)", strokeWidth: 2 }}
                connectNulls
              />
            ) : null}
            {visible.m3 ? (
              <Line
                type="monotone"
                dataKey="m3"
                stroke="var(--color-ago3)"
                strokeWidth={1.75}
                strokeDasharray="6 4"
                dot={false}
                activeDot={{ r: 3.5, fill: "var(--color-ago3)", stroke: "var(--color-bg)", strokeWidth: 2 }}
                connectNulls
              />
            ) : null}
            {visible.y1 ? (
              <Line
                type="monotone"
                dataKey="y1"
                stroke="var(--color-ago1)"
                strokeWidth={1.5}
                strokeDasharray="2 4"
                dot={false}
                activeDot={{ r: 3.5, fill: "var(--color-ago1)", stroke: "var(--color-bg)", strokeWidth: 2 }}
                connectNulls
              />
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
