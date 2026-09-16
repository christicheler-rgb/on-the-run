import { useEffect, useState, useTransition } from "react";
import { createFileRoute, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { format, formatDistanceToNow, parseISO } from "date-fns";
import { RefreshCw } from "lucide-react";
import { CurveChart } from "@/components/curve-chart";
import { KeyRates, SpreadRow } from "@/components/key-rates";
import { YieldTable } from "@/components/yield-table";
import { getYieldCurve } from "@/lib/treasury/get-yield-curve";
import { curveShape, describeCurve } from "@/lib/treasury/model";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  loader: () => getYieldCurve(),
  component: Home,
  pendingMs: 120,
  pendingComponent: CurveSkeleton,
  errorComponent: CurveError,
});

function RelativeFetched({ iso }: { iso: string }) {
  const [label, setLabel] = useState<string | null>(null);
  useEffect(() => {
    setLabel(formatDistanceToNow(parseISO(iso), { addSuffix: true }));
  }, [iso]);
  if (!label) return <span className="tabular-nums">{format(parseISO(iso), "HH:mm")} UTC</span>;
  return <span>{label}</span>;
}

function Home() {
  const data = Route.useLoaderData();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const refresh = () => {
      startTransition(() => {
        void router.invalidate();
      });
    };
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    const id = window.setInterval(refresh, 15 * 60 * 1000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(id);
    };
  }, [router]);

  const asOf = format(parseISO(data.currentDate), "d MMMM yyyy");
  const copy = describeCurve(data);
  const shape = curveShape(data);

  return (
    <main className="mx-auto min-h-dvh w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <header className="flex flex-col gap-4 border-b border-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">U.S. Treasury</p>
          <h1 className="mt-1 font-display text-3xl font-medium tracking-tight text-fg">On-the-Run</h1>
          <p className="mt-2 max-w-xl text-sm text-muted">
            Major bill, note, and bond yields — the official par curve — with the same tenors from five trading
            days, three months, and one year ago, loaded automatically.
          </p>
        </div>
        <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end">
          <div className="text-left sm:text-right">
            <p className="text-xs text-faint">Close as of</p>
            <p className="text-sm font-medium tabular-nums text-fg">{asOf}</p>
            <p className="text-xs text-faint">
              Updated <RelativeFetched iso={data.fetchedAt} /> · {data.source}
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              startTransition(() => {
                void router.invalidate();
              })
            }
            disabled={pending}
            className="inline-flex min-h-11 items-center gap-2 rounded-md px-3.5 text-sm font-medium text-fg shadow-border transition-opacity duration-150 disabled:opacity-50"
          >
            <RefreshCw className={cn("size-3.5", pending && "animate-spin")} />
            Refresh
          </button>
        </div>
      </header>

      <section className="mt-6 rounded-xl bg-surface px-4 py-4 shadow-border sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={cn(
              "rounded-full px-2.5 py-0.5 text-xs font-medium shadow-border",
              shape === "inverted" ? "text-rise" : "text-fg",
            )}
          >
            {shape === "inverted" ? "Inverted" : shape === "flat" ? "Flat" : "Upward-sloping"}
          </span>
          <h2 className="font-display text-lg font-medium tracking-tight">{copy.kicker}</h2>
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted">{copy.body}</p>
      </section>

      <div className="mt-6">
        <KeyRates data={data} />
      </div>
      <div className="mt-3">
        <SpreadRow data={data} />
      </div>
      <div className="mt-6">
        <CurveChart data={data} />
      </div>
      <div className="mt-6">
        <YieldTable data={data} />
      </div>

      <footer className="mt-8 border-t border-border pt-5 pb-8 text-xs leading-relaxed text-faint">
        Constant-maturity par yields from closing market bids on the most recently auctioned (on-the-run) Treasury
        bills, notes, and bonds. Short tenors through 1-year are bills; 2- through 10-year are notes; 20- and 30-year
        are bonds. Source: U.S. Department of the Treasury, Daily Treasury Par Yield Curve Rates, with FRED as
        fallback. Figures are not investment advice.
      </footer>
    </main>
  );
}

function CurveSkeleton() {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="h-24 rounded-lg bg-surface" />
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="col-span-2 h-36 rounded-lg bg-surface lg:col-span-1" />
        <div className="h-32 rounded-lg bg-surface" />
        <div className="h-32 rounded-lg bg-surface" />
        <div className="h-32 rounded-lg bg-surface" />
      </div>
      <div className="mt-6 h-80 rounded-xl bg-surface" />
      <p className="sr-only">Loading Treasury yields</p>
    </main>
  );
}

function CurveError({ error }: ErrorComponentProps) {
  const router = useRouter();
  const message = error instanceof Error && error.message ? error.message : "The Treasury feed could not be reached.";
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col items-start justify-center gap-4 px-6">
      <p className="text-xs font-medium tracking-[0.18em] text-muted uppercase">U.S. Treasury</p>
      <h1 className="font-display text-3xl font-medium tracking-tight">Yields unavailable</h1>
      <p className="text-sm leading-relaxed text-muted">{message} Try again in a moment.</p>
      <button
        type="button"
        onClick={() => void router.invalidate()}
        className="min-h-11 rounded-md bg-now px-4 text-sm font-medium text-bg"
      >
        Try again
      </button>
    </main>
  );
}
