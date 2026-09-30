export type Fit = {
  pctPer100bp: number;
  tStat: number;
  n: number;
};

/** OLS of return on a yield change, scaled so the slope is percent price per +100 bp. */
export function olsSensitivity(yieldChanges: number[], returns: number[]): Fit | null {
  const n = Math.min(yieldChanges.length, returns.length);
  if (n < 80) return null;
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < n; i++) {
    sumX += yieldChanges[i] ?? 0;
    sumY += returns[i] ?? 0;
  }
  const meanX = sumX / n;
  const meanY = sumY / n;
  let varX = 0;
  let cov = 0;
  for (let i = 0; i < n; i++) {
    const dx = (yieldChanges[i] ?? 0) - meanX;
    const dy = (returns[i] ?? 0) - meanY;
    varX += dx * dx;
    cov += dx * dy;
  }
  if (varX <= 0) return null;
  const beta = cov / varX;
  const intercept = meanY - beta * meanX;
  let sse = 0;
  for (let i = 0; i < n; i++) {
    const fitted = intercept + beta * (yieldChanges[i] ?? 0);
    const resid = (returns[i] ?? 0) - fitted;
    sse += resid * resid;
  }
  if (n <= 2) return null;
  const se = Math.sqrt(sse / (n - 2) / varX);
  if (!Number.isFinite(se) || se === 0) return null;
  return { pctPer100bp: beta * 100, tStat: beta / se, n };
}

export function dailyChanges(points: Array<{ date: string; value: number }>): Map<string, number> {
  const sorted = [...points].sort((a, b) => a.date.localeCompare(b.date));
  const out = new Map<string, number>();
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    if (!prev || !cur) continue;
    out.set(cur.date, cur.value - prev.value);
  }
  return out;
}

export function dailyReturns(points: Array<{ date: string; value: number }>, from: string): Map<string, number> {
  const sorted = [...points].filter((p) => p.date >= from).sort((a, b) => a.date.localeCompare(b.date));
  const out = new Map<string, number>();
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const cur = sorted[i];
    if (!prev || !cur || prev.value <= 0) continue;
    out.set(cur.date, cur.value / prev.value - 1);
  }
  return out;
}

export function paired(yieldMoves: Map<string, number>, stockMoves: Map<string, number>): { xs: number[]; ys: number[] } {
  const xs: number[] = [];
  const ys: number[] = [];
  for (const [date, ret] of stockMoves) {
    const dy = yieldMoves.get(date);
    if (dy == null || !Number.isFinite(dy) || !Number.isFinite(ret)) continue;
    xs.push(dy);
    ys.push(ret);
  }
  return { xs, ys };
}
