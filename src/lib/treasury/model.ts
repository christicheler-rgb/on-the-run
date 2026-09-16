export type Sector = "bill" | "note" | "bond";

export type TenorDef = {
  key: string;
  label: string;
  name: string;
  sector: Sector;
  months: number;
  xmlField: string;
  fredId: string | null;
};

export const TENORS: TenorDef[] = [
  { key: "1M", label: "1M", name: "1-Month", sector: "bill", months: 1, xmlField: "BC_1MONTH", fredId: "DGS1MO" },
  { key: "6W", label: "6W", name: "6-Week", sector: "bill", months: 1.5, xmlField: "BC_1_5MONTH", fredId: null },
  { key: "2M", label: "2M", name: "2-Month", sector: "bill", months: 2, xmlField: "BC_2MONTH", fredId: "DGS2MO" },
  { key: "3M", label: "3M", name: "3-Month", sector: "bill", months: 3, xmlField: "BC_3MONTH", fredId: "DGS3MO" },
  { key: "4M", label: "4M", name: "4-Month", sector: "bill", months: 4, xmlField: "BC_4MONTH", fredId: "DGS4MO" },
  { key: "6M", label: "6M", name: "6-Month", sector: "bill", months: 6, xmlField: "BC_6MONTH", fredId: "DGS6MO" },
  { key: "1Y", label: "1Y", name: "1-Year", sector: "bill", months: 12, xmlField: "BC_1YEAR", fredId: "DGS1" },
  { key: "2Y", label: "2Y", name: "2-Year", sector: "note", months: 24, xmlField: "BC_2YEAR", fredId: "DGS2" },
  { key: "3Y", label: "3Y", name: "3-Year", sector: "note", months: 36, xmlField: "BC_3YEAR", fredId: "DGS3" },
  { key: "5Y", label: "5Y", name: "5-Year", sector: "note", months: 60, xmlField: "BC_5YEAR", fredId: "DGS5" },
  { key: "7Y", label: "7Y", name: "7-Year", sector: "note", months: 84, xmlField: "BC_7YEAR", fredId: "DGS7" },
  { key: "10Y", label: "10Y", name: "10-Year", sector: "note", months: 120, xmlField: "BC_10YEAR", fredId: "DGS10" },
  { key: "20Y", label: "20Y", name: "20-Year", sector: "bond", months: 240, xmlField: "BC_20YEAR", fredId: "DGS20" },
  { key: "30Y", label: "30Y", name: "30-Year", sector: "bond", months: 360, xmlField: "BC_30YEAR", fredId: "DGS30" },
];

export const SECTOR_LABEL: Record<Sector, string> = {
  bill: "Bill",
  note: "Note",
  bond: "Bond",
};

export const SECTOR_BLURB: Record<Sector, string> = {
  bill: "Discount paper, one year and under",
  note: "Coupon notes, two to ten years",
  bond: "Long bonds, twenty and thirty years",
};

export type TenorPoint = {
  key: string;
  label: string;
  name: string;
  sector: Sector;
  months: number;
  now: number | null;
  d5: number | null;
  m3: number | null;
  y1: number | null;
};

export type SpreadPoint = {
  key: string;
  label: string;
  name: string;
  now: number | null;
  d5: number | null;
  m3: number | null;
  y1: number | null;
};

export type HistoryPoint = { date: string; value: number };

export type YieldCurveSnapshot = {
  currentDate: string;
  fiveDayDate: string;
  threeMonthDate: string;
  oneYearDate: string;
  fetchedAt: string;
  source: "US Treasury" | "FRED";
  tenors: TenorPoint[];
  spreads: SpreadPoint[];
  history10y: HistoryPoint[];
};

export function toBp(deltaPct: number | null): number | null {
  if (deltaPct == null || !Number.isFinite(deltaPct)) return null;
  return Math.round(deltaPct * 100);
}

export function yieldDelta(current: number | null, prior: number | null): number | null {
  if (current == null || prior == null) return null;
  return current - prior;
}

export function formatYield(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return `${value.toFixed(2)}%`;
}

export function formatBp(bp: number | null, withSuffix = true): string {
  if (bp == null || !Number.isFinite(bp)) return "—";
  const sign = bp > 0 ? "+" : "";
  return withSuffix ? `${sign}${bp} bp` : `${sign}${bp}`;
}

export function tenorByKey(snapshot: YieldCurveSnapshot, key: string): TenorPoint | undefined {
  return snapshot.tenors.find((t) => t.key === key);
}

export type CurveShape = "inverted" | "flat" | "upward";

export function curveShape(snapshot: YieldCurveSnapshot): CurveShape {
  const two = tenorByKey(snapshot, "2Y")?.now;
  const ten = tenorByKey(snapshot, "10Y")?.now;
  if (two == null || ten == null) return "upward";
  const bp = Math.round((ten - two) * 100);
  if (bp < 0) return "inverted";
  if (bp < 20) return "flat";
  return "upward";
}

export function describeCurve(snapshot: YieldCurveSnapshot): { kicker: string; body: string } {
  const two = tenorByKey(snapshot, "2Y");
  const ten = tenorByKey(snapshot, "10Y");
  const long20 = tenorByKey(snapshot, "20Y");
  const long30 = tenorByKey(snapshot, "30Y");
  const shape = curveShape(snapshot);
  const s2s10 = toBp(yieldDelta(ten?.now ?? null, two?.now ?? null));
  const tenVs5d = toBp(yieldDelta(ten?.now ?? null, ten?.d5 ?? null));
  const tenVs3m = toBp(yieldDelta(ten?.now ?? null, ten?.m3 ?? null));
  const tenVs1y = toBp(yieldDelta(ten?.now ?? null, ten?.y1 ?? null));
  const longBp = toBp(yieldDelta(long30?.now ?? null, long20?.now ?? null));

  const kicker =
    shape === "inverted"
      ? "The curve is inverted"
      : shape === "flat"
        ? "The curve is nearly flat"
        : "The curve is upward-sloping";

  const parts: string[] = [];
  if (s2s10 != null) {
    parts.push(
      s2s10 >= 0
        ? `10-year yields sit ${s2s10} bp above the 2-year.`
        : `10-year yields sit ${Math.abs(s2s10)} bp through the 2-year.`,
    );
  }
  if (tenVs5d != null) {
    const dir5 = tenVs5d >= 0 ? "risen" : "fallen";
    parts.push(`Over the last five trading days the 10-year has ${dir5} ${Math.abs(tenVs5d)} bp.`);
  }
  if (tenVs3m != null && tenVs1y != null) {
    const dir3 = tenVs3m >= 0 ? "risen" : "fallen";
    const dir1 = tenVs1y >= 0 ? "risen" : "fallen";
    parts.push(
      `It has ${dir3} ${Math.abs(tenVs3m)} bp in three months and ${dir1} ${Math.abs(tenVs1y)} bp over the year.`,
    );
  }
  if (longBp != null && longBp < 0) {
    parts.push(`The long end is mildly inverted: 30-year yields sit ${Math.abs(longBp)} bp through the 20-year.`);
  }

  return { kicker, body: parts.join(" ") };
}
