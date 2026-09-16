# On-the-Run

Live **U.S. Treasury par yield curve** — bills, notes, and bonds — with the same tenors from five trading days ago, three months ago, and one year ago.

**Not investment advice.** Figures are official constant-maturity par yields from closing market bids on the most recently auctioned (on-the-run) issues. They are not a trade signal.

## What it does

- Overlay of the current curve against 5 trading days, 3 months, and 1 year ago
- Key rates: 10-year, 3-month, 2-year, 30-year, with basis-point changes
- Spreads: 2s10s, 3m10y, 10s30s, 20s30s, with inversion flags
- Tenor book for every major bill, note, and bond, filterable by type
- Automatic refresh on focus and every 15 minutes
- FRED fallback if the Treasury XML feed is unreachable

Source: [U.S. Department of the Treasury, Daily Treasury Par Yield Curve Rates](https://home.treasury.gov/resource-center/data-chart-center/interest-rates/TextView?type=daily_treasury_yield_curve), with [FRED](https://fred.stlouisfed.org/) as backup.

## Stack

TanStack Start (React 19, Vite, TanStack Router), Tailwind v4, Recharts, date-fns.

## Run locally

```bash
npm install
npm run dev
```

Then open the URL Vite prints (default `http://localhost:8080`).

```bash
npm run typecheck
npm run build
```

No `.env` is required. Auth and the database stay off.

## Disclaimer

This is a research view of public Treasury data, not investment, legal, or tax advice.
