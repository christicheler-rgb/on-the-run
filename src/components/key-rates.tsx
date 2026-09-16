import { formatYield, formatBp, toBp, yieldDelta, tenorByKey, type YieldCurveSnapshot } from "@/lib/treasury/model";
import { cn } from "@/lib/utils";

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null;
  const min = Math.min(...points);
  const max = Math.max(...points);
  const w = 120;
  const h = 36;
  const span = max - min || 1;
  const d = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * w;
      const y = h - ((p - min) / span) * (h - 2) - 1;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const up = points[points.length - 1]! >= points[0]!;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-9 w-28" aria-hidden="true">
      <path
        d={d}
        fill="none"
        stroke={up ? "var(--color-rise)" : "var(--color-fall)"}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function Delta({ current, prior }: { current: number | null; prior: number | null }) {
  const bp = toBp(yieldDelta(current, prior));
  if (bp == null) return <span className="text-faint">—</span>;
  const up = bp > 0;
  const flat = bp === 0;
  return (
    <span className={cn("tabular-nums", flat ? "text-muted" : up ? "text-rise" : "text-fall")}>
      {formatBp(bp)}
    </span>
  );
}

function RateCard({
  label,
  name,
  value,
  prior5,
  prior3,
  prior1,
  featured,
  spark,
}: {
  label: string;
  name: string;
  value: number | null;
  prior5: number | null;
  prior3: number | null;
  prior1: number | null;
  featured?: boolean;
  spark?: number[];
}) {
  return (
    <article
      className={cn(
        "flex flex-col justify-between rounded-lg bg-elevated p-4 shadow-border",
        featured && "lg:p-5",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-muted uppercase">{label}</p>
          <p className="mt-0.5 text-sm text-faint">{name}</p>
        </div>
        {featured && spark ? <Sparkline points={spark} /> : null}
      </div>
      <p
        className={cn(
          "mt-3 font-medium tabular-nums tracking-tight text-fg",
          featured ? "font-display text-3xl" : "text-2xl",
        )}
      >
        {formatYield(value)}
      </p>
      <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <div className="flex gap-1.5">
          <dt className="text-faint">5 days</dt>
          <dd>
            <Delta current={value} prior={prior5} />
          </dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-faint">3 months</dt>
          <dd>
            <Delta current={value} prior={prior3} />
          </dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="text-faint">1 year</dt>
          <dd>
            <Delta current={value} prior={prior1} />
          </dd>
        </div>
      </dl>
    </article>
  );
}

export function KeyRates({ data }: { data: YieldCurveSnapshot }) {
  const keys = ["10Y", "3M", "2Y", "30Y"] as const;
  const spark = data.history10y.map((p) => p.value);

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {keys.map((key) => {
        const tenor = tenorByKey(data, key);
        if (!tenor) return null;
        const featured = key === "10Y";
        return (
          <RateCard
            key={key}
            label={tenor.label}
            name={featured ? "Benchmark note" : tenor.name}
            value={tenor.now}
            prior5={tenor.d5}
            prior3={tenor.m3}
            prior1={tenor.y1}
            featured={featured}
            spark={featured ? spark : undefined}
          />
        );
      })}
    </div>
  );
}

export function SpreadRow({ data }: { data: YieldCurveSnapshot }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {data.spreads.map((spread) => {
        const bpNow = toBp(spread.now);
        const inverted = (bpNow ?? 0) < 0;
        return (
          <article key={spread.key} className="rounded-lg bg-surface px-4 py-3 shadow-border">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium tracking-wide text-muted uppercase">{spread.label}</p>
              {inverted ? (
                <span className="rounded-full bg-elevated px-2 py-0.5 text-xs text-rise">Inverted</span>
              ) : null}
            </div>
            <p className="mt-1 text-lg font-medium tabular-nums text-fg">{formatBp(bpNow)}</p>
            <p className="mt-0.5 text-xs text-faint">{spread.name}</p>
            <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
              <span className="text-faint">
                5 days <Delta current={spread.now} prior={spread.d5} />
              </span>
              <span className="text-faint">
                3 months <Delta current={spread.now} prior={spread.m3} />
              </span>
              <span className="text-faint">
                1 year <Delta current={spread.now} prior={spread.y1} />
              </span>
            </p>
          </article>
        );
      })}
    </div>
  );
}
