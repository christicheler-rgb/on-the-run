import { createServerFn } from "@tanstack/react-start";
import { subYears, parseISO, formatISO } from "date-fns";
import { TENORS, type Sector } from "@/lib/treasury/model";
import { loadCurveHistory } from "@/lib/treasury/get-yield-curve";
import { DESK } from "./universe";
import { dailyChanges, dailyReturns, olsSensitivity, paired } from "./rank";

export type SensitivityPick = {
  ticker: string;
  name: string;
  sleeve: string;
  pctPer100bp: number;
  tStat: number;
  observations: number;
};

export type NodeSensitivity = {
  key: string;
  label: string;
  name: string;
  sector: Sector;
  weak: boolean;
  picks: SensitivityPick[];
};

export type SensitivityReport = {
  asOf: string;
  windowStart: string;
  deskSize: number;
  fitted: number;
  nodes: NodeSensitivity[];
};

const CACHE_MS = 6 * 60 * 60 * 1000;
let cache: { expires: number; value: SensitivityReport } | null = null;

type Bar = { date: string; value: number };

async function fetchBars(ticker: string): Promise<Bar[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=2y&interval=1d`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "Mozilla/5.0" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`${ticker} ${res.status}`);
  const body = (await res.json()) as {
    chart?: {
      result?: Array<{
        timestamp?: number[];
        indicators?: { adjclose?: Array<{ adjclose?: Array<number | null> }>; quote?: Array<{ close?: Array<number | null> }> };
      }>;
    };
  };
  const result = body.chart?.result?.[0];
  const stamps = result?.timestamp ?? [];
  const adj = result?.indicators?.adjclose?.[0]?.adjclose;
  const close = result?.indicators?.quote?.[0]?.close ?? [];
  const prices = adj && adj.length === stamps.length ? adj : close;
  const bars: Bar[] = [];
  for (let i = 0; i < stamps.length; i++) {
    const stamp = stamps[i];
    const price = prices[i];
    if (stamp == null || price == null || !Number.isFinite(price)) continue;
    bars.push({ date: new Date(stamp * 1000).toISOString().slice(0, 10), value: price });
  }
  return bars;
}

async function mapPool<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      const item = items[index];
      if (item === undefined) continue;
      out[index] = await fn(item);
    }
  }
  const workers = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return out;
}

async function buildReport(): Promise<SensitivityReport> {
  const { rows } = await loadCurveHistory();
  const last = rows[rows.length - 1];
  if (!last) throw new Error("No Treasury history to regress against.");
  const windowStart = formatISO(subYears(parseISO(last.date), 1), { representation: "date" });

  const settled = await mapPool(DESK, 8, async (name) => {
    try {
      const bars = await fetchBars(name.ticker);
      return { name, bars };
    } catch {
      return { name, bars: [] as Bar[] };
    }
  });

  const returns = new Map<string, Map<string, number>>();
  let fitted = 0;
  for (const row of settled) {
    if (!row || row.bars.length < 100) continue;
    returns.set(row.name.ticker, dailyReturns(row.bars, windowStart));
    fitted += 1;
  }
  if (fitted < 15) throw new Error("Equity prices could not be loaded for enough of the desk.");

  const byTicker = new Map(DESK.map((name) => [name.ticker, name]));

  const nodes: NodeSensitivity[] = TENORS.map((tenor) => {
    const series: Bar[] = [];
    for (const row of rows) {
      const value = row.values[tenor.key];
      if (value == null) continue;
      series.push({ date: row.date, value });
    }
    const moves = dailyChanges(series);
    const picks: SensitivityPick[] = [];
    for (const [ticker, stock] of returns) {
      const meta = byTicker.get(ticker);
      if (!meta) continue;
      const { xs, ys } = paired(moves, stock);
      const fit = olsSensitivity(xs, ys);
      if (!fit) continue;
      picks.push({
        ticker,
        name: meta.name,
        sleeve: meta.sleeve,
        pctPer100bp: fit.pctPer100bp,
        tStat: fit.tStat,
        observations: fit.n,
      });
    }
    picks.sort((a, b) => Math.abs(b.pctPer100bp) - Math.abs(a.pctPer100bp));
    const top = picks.slice(0, 5);
    const leader = top[0];
    return {
      key: tenor.key,
      label: tenor.label,
      name: tenor.name,
      sector: tenor.sector,
      weak: leader == null || Math.abs(leader.tStat) < 2.5,
      picks: top,
    };
  });

  return { asOf: last.date, windowStart, deskSize: DESK.length, fitted, nodes };
}

export const getRateSensitivity = createServerFn({ method: "POST" }).handler(async (): Promise<SensitivityReport> => {
  if (cache && cache.expires > Date.now()) return cache.value;
  const value = await buildReport();
  cache = { value, expires: Date.now() + CACHE_MS };
  return value;
});
