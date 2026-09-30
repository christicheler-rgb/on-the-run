import assert from "node:assert/strict";
import test from "node:test";
import { dailyChanges, dailyReturns, olsSensitivity, paired } from "./rank.ts";

test("100 bp of yield change maps to the regression slope in percent", () => {
  const xs = [0.1, -0.1, 0.2, -0.2, 0.05, -0.05, 0.15, -0.15];
  const ys = xs.map((x) => -0.2 * x);
  while (xs.length < 80) {
    xs.push(0.01 * ((xs.length % 7) - 3));
    ys.push(-0.2 * xs[xs.length - 1]!);
  }
  const fit = olsSensitivity(xs, ys);
  assert.ok(fit);
  assert.ok(Math.abs(fit.pctPer100bp - -20) < 0.01);
  assert.ok(fit.tStat < -10);
});

test("daily changes and returns line up on the second date", () => {
  const yields = dailyChanges([
    { date: "2026-01-02", value: 4 },
    { date: "2026-01-05", value: 4.1 },
  ]);
  const returns = dailyReturns(
    [
      { date: "2026-01-02", value: 100 },
      { date: "2026-01-05", value: 99 },
    ],
    "2026-01-01",
  );
  const pairs = paired(yields, returns);
  assert.ok(pairs.xs[0] != null && Math.abs(pairs.xs[0] - 0.1) < 1e-9);
  assert.ok(pairs.ys[0] != null && Math.abs(pairs.ys[0] + 0.01) < 1e-12);
});
