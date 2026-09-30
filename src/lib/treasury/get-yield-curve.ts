import { createServerFn } from "@tanstack/react-start";
import { formatISO, parseISO, subMonths, subYears } from "date-fns";
import {
  TENORS,
  type HistoryPoint,
  type SpreadPoint,
  type TenorPoint,
  type YieldCurveSnapshot,
} from "./model";

type DayRow = {
  date: string;
  values: Record<string, number | null>;
};

export type CurveHistory = {
  rows: DayRow[];
  source: YieldCurveSnapshot["source"];
};

const TREASURY_XML = (year: number) =>
  `https://home.treasury.gov/resource-center/data-chart-center/interest-rates/pages/xml?data=daily_treasury_yield_curve&field_tdr_date_value=${year}`;

const FRED_BATCHES = [
  "DGS1MO,DGS2MO,DGS3MO,DGS4MO,DGS6MO,DGS1,DGS2",
  "DGS3,DGS5,DGS7,DGS10,DGS20,DGS30",
];

const CACHE_MS = 5 * 60 * 1000;
const CACHE_V = 2;
let cache: { expires: number; v: number; value: YieldCurveSnapshot } | null = null;

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      Accept: "application/xml,text/csv,text/plain;q=0.9,*/*;q=0.8",
      "User-Agent": "On-the-Run/1.0 (treasury yield curve)",
    },
    signal: AbortSignal.timeout(18000),
  });
  if (!res.ok) {
    throw new Error(`Upstream ${res.status} for ${url}`);
  }
  return res.text();
}

function xmlField(block: string, name: string): number | null {
  if (new RegExp(`<d:${name}\\b[^>]*m:null="true"`, "i").test(block)) return null;
  const match = block.match(new RegExp(`<d:${name}\\b[^>]*>([^<]*)`));
  if (!match || match[1] === "") return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function parseTreasuryXml(xml: string): DayRow[] {
  const blocks = xml.match(/<m:properties>[\s\S]*?<\/m:properties>/g) ?? [];
  const rows: DayRow[] = [];
  for (const block of blocks) {
    const dateMatch = block.match(/<d:NEW_DATE[^>]*>([^<]+)/);
    if (!dateMatch) continue;
    const date = dateMatch[1].slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const values: Record<string, number | null> = {};
    for (const tenor of TENORS) {
      values[tenor.key] = xmlField(block, tenor.xmlField);
    }
    rows.push({ date, values });
  }
  return rows;
}

function parseFredCsv(csv: string): DayRow[] {
  const lines = csv.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const header = (lines[0] ?? "").split(",").map((h) => h.trim());
  const dateIdx = header.findIndex((h) => /date/i.test(h));
  if (dateIdx < 0) return [];
  const colToKey = new Map<number, string>();
  header.forEach((col, idx) => {
    const tenor = TENORS.find((t) => t.fredId === col);
    if (tenor) colToKey.set(idx, tenor.key);
  });
  const rows: DayRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = (lines[i] ?? "").split(",");
    const date = (cols[dateIdx] ?? "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    const values: Record<string, number | null> = {};
    for (const tenor of TENORS) values[tenor.key] = values[tenor.key] ?? null;
    let any = false;
    for (const [idx, key] of colToKey) {
      const raw = (cols[idx] ?? "").trim();
      if (!raw || raw === ".") continue;
      const value = Number(raw);
      if (!Number.isFinite(value)) continue;
      values[key] = value;
      any = true;
    }
    if (any) rows.push({ date, values });
  }
  return rows;
}

function mergeRows(groups: DayRow[][]): DayRow[] {
  const byDate = new Map<string, DayRow>();
  for (const group of groups) {
    for (const row of group) {
      const existing = byDate.get(row.date);
      if (!existing) {
        byDate.set(row.date, {
          date: row.date,
          values: { ...row.values },
        });
        continue;
      }
      for (const [key, value] of Object.entries(row.values)) {
        if (value != null) existing.values[key] = value;
      }
    }
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function onOrBefore(rows: DayRow[], iso: string): DayRow | null {
  let best: DayRow | null = null;
  for (const row of rows) {
    if (row.date <= iso) best = row;
    else break;
  }
  return best;
}

function lastComplete(rows: DayRow[]): DayRow | null {
  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i];
    if (!row) continue;
    if (row.values["10Y"] != null || row.values["3M"] != null) return row;
  }
  return rows[rows.length - 1] ?? null;
}

function isComplete(row: DayRow): boolean {
  return row.values["10Y"] != null || row.values["3M"] != null;
}

function tradingDaysBefore(rows: DayRow[], current: DayRow, n: number): DayRow | null {
  const complete = rows.filter(isComplete);
  const index = complete.findIndex((row) => row.date === current.date);
  if (index < n) return null;
  return complete[index - n] ?? null;
}

function toIsoDate(date: Date): string {
  return formatISO(date, { representation: "date" });
}

function spread(
  key: string,
  label: string,
  name: string,
  longKey: string,
  shortKey: string,
  now: DayRow,
  d5: DayRow | null,
  m3: DayRow | null,
  y1: DayRow | null,
): SpreadPoint {
  const diff = (row: DayRow | null): number | null => {
    if (!row) return null;
    const a = row.values[longKey];
    const b = row.values[shortKey];
    if (a == null || b == null) return null;
    return a - b;
  };
  return { key, label, name, now: diff(now), d5: diff(d5), m3: diff(m3), y1: diff(y1) };
}

function downsample(history: HistoryPoint[], maxPoints: number): HistoryPoint[] {
  if (history.length <= maxPoints) return history;
  const step = Math.ceil(history.length / maxPoints);
  const sampled: HistoryPoint[] = [];
  for (let i = 0; i < history.length; i += step) {
    const point = history[i];
    if (point) sampled.push(point);
  }
  const last = history[history.length - 1];
  if (last && sampled[sampled.length - 1]?.date !== last.date) sampled.push(last);
  return sampled;
}

function buildSnapshot(rows: DayRow[], source: YieldCurveSnapshot["source"]): YieldCurveSnapshot {
  const current = lastComplete(rows);
  if (!current) throw new Error("No Treasury closes in the fetched window.");

  const currentDate = parseISO(current.date);
  const threeTarget = toIsoDate(subMonths(currentDate, 3));
  const yearTarget = toIsoDate(subYears(currentDate, 1));
  const five = tradingDaysBefore(rows, current, 5);
  const three = onOrBefore(rows, threeTarget);
  const year = onOrBefore(rows, yearTarget);

  const tenors: TenorPoint[] = TENORS.map((tenor) => ({
    key: tenor.key,
    label: tenor.label,
    name: tenor.name,
    sector: tenor.sector,
    months: tenor.months,
    now: current.values[tenor.key] ?? null,
    d5: five?.values[tenor.key] ?? null,
    m3: three?.values[tenor.key] ?? null,
    y1: year?.values[tenor.key] ?? null,
  }));

  const spreads: SpreadPoint[] = [
    spread("2s10s", "2s10s", "10-Year minus 2-Year", "10Y", "2Y", current, five, three, year),
    spread("3m10y", "3m10y", "10-Year minus 3-Month", "10Y", "3M", current, five, three, year),
    spread("10s30s", "10s30s", "30-Year minus 10-Year", "30Y", "10Y", current, five, three, year),
    spread("20s30s", "20s30s", "30-Year minus 20-Year", "30Y", "20Y", current, five, three, year),
  ];

  const history10y: HistoryPoint[] = [];
  const floor = year?.date ?? rows[0]?.date ?? current.date;
  for (const row of rows) {
    if (row.date < floor) continue;
    const value = row.values["10Y"];
    if (value == null) continue;
    history10y.push({ date: row.date, value });
  }

  return {
    currentDate: current.date,
    fiveDayDate: five?.date ?? current.date,
    threeMonthDate: three?.date ?? threeTarget,
    oneYearDate: year?.date ?? yearTarget,
    fetchedAt: new Date().toISOString(),
    source,
    tenors,
    spreads,
    history10y: downsample(history10y, 72),
  };
}

async function rowsFromTreasury(): Promise<DayRow[]> {
  const year = new Date().getUTCFullYear();
  const years = [year - 1, year];
  const settled = await Promise.allSettled(
    years.map(async (y) => parseTreasuryXml(await fetchText(TREASURY_XML(y)))),
  );
  const groups = settled
    .filter((r): r is PromiseFulfilledResult<DayRow[]> => r.status === "fulfilled")
    .map((r) => r.value);
  return mergeRows(groups);
}

async function rowsFromFred(): Promise<DayRow[]> {
  const settled = await Promise.allSettled(
    FRED_BATCHES.map(async (ids) =>
      parseFredCsv(await fetchText(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${ids}`)),
    ),
  );
  const groups = settled
    .filter((r): r is PromiseFulfilledResult<DayRow[]> => r.status === "fulfilled")
    .map((r) => r.value);
  return mergeRows(groups);
}

export async function loadCurveHistory(): Promise<CurveHistory> {
  try {
    const rows = await rowsFromTreasury();
    if (!rows.length) throw new Error("Treasury feed returned no closes.");
    return { rows, source: "US Treasury" };
  } catch (treasuryError) {
    try {
      const rows = await rowsFromFred();
      if (!rows.length) throw new Error("FRED feed returned no closes.");
      return { rows, source: "FRED" };
    } catch {
      throw treasuryError instanceof Error
        ? treasuryError
        : new Error("Could not load Treasury yields.");
    }
  }
}

async function loadFresh(): Promise<YieldCurveSnapshot> {
  const { rows, source } = await loadCurveHistory();
  return buildSnapshot(rows, source);
}

export const getYieldCurve = createServerFn({ method: "POST" }).handler(
  async (): Promise<YieldCurveSnapshot> => {
    if (cache && cache.v === CACHE_V && cache.expires > Date.now()) return cache.value;
    try {
      const value = await loadFresh();
      cache = { value, v: CACHE_V, expires: Date.now() + CACHE_MS };
      return value;
    } catch (error) {
      if (cache) return cache.value;
      throw error;
    }
  },
);
