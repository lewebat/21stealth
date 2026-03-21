# Price Ticker — Design Spec

**Date:** 2026-03-21
**Status:** Approved

## Goal

Display live market prices for the most important coins (BTC, ETH, SOL, LTC, DOGE, TRX) in a compact ticker bar on the dashboard, including 24h price change.

## Placement

A horizontal ticker bar directly below the dashboard header (`<h1>Portfolio` + `ConfigActions`), always visible — including on the empty state (no wallets yet). Full width, dark background, compact height.

## Component

**`src/components/ui/PriceTicker.jsx`** — new component.

Props:
```js
prices: {
  bitcoin:  { usd: number, change24h: number },
  ethereum: { usd: number, change24h: number },
  solana:   { usd: number, change24h: number },
  litecoin: { usd: number, change24h: number },
  dogecoin: { usd: number, change24h: number },
  tron:     { usd: number, change24h: number },
} | null
```

When `prices` is `null` (loading), show skeleton placeholders for each coin slot.

Display per coin: ticker symbol (e.g. `BTC`), USD price formatted with appropriate decimal places, 24h change percentage in green (positive) or red (negative). Coins shown in fixed order: BTC, ETH, SOL, LTC, DOGE, TRX.

## Data — `prices.js` Extension

The existing `getPrices()` service returns only `{ bitcoin: usd, … }`. Extend it to return `{ bitcoin: { usd, change24h }, … }`.

The backend proxy at `/backend/api/prices.php` may need updating to include `price_change_percentage_24h` from CoinGecko. If the backend cannot be modified, fetch `change24h` via a separate direct CoinGecko call in `getPrices()`:

```
https://api.coingecko.com/api/v3/simple/price
  ?ids=bitcoin,ethereum,solana,litecoin,dogecoin,tron
  &vs_currencies=usd
  &include_24hr_change=true
```

The implementation plan resolves which approach to use based on what the backend currently returns.

Caching: same 60s module-level cache as today (no change).

## Dashboard Integration

`DashboardPage` passes `prices` state (already fetched) to `PriceTicker`. No new fetches needed.

```jsx
<Container className="py-6 flex flex-col gap-6">
  <div className="flex items-center justify-between">
    <h1 className="h2">Portfolio</h1>
    <ConfigActions … />
  </div>

  <PriceTicker prices={prices} />   {/* always rendered */}

  {wallets.length === 0 ? (…) : (…)}
</Container>
```

## Number Formatting

- **USD price:** `$94,210` for ≥ $1, `$0.3800` for < $1 (4 decimal places), `$0.00028` for very small values
- **24h change:** `+2.1%` / `−0.4%`, always one decimal place, sign always shown
- **Color:** green for ≥ 0, red for < 0

## Error Handling

If `getPrices()` fails, `prices` stays `null`. The ticker renders skeleton state indefinitely — no error message shown (non-critical UI). Dashboard continues to function normally.

## Export

Add `PriceTicker` to `src/components/ui/index.js`.

## Files Changed

| Action | File | Purpose |
|--------|------|---------|
| Create | `src/components/ui/PriceTicker.jsx` | Ticker component |
| Modify | `src/components/ui/index.js` | Export PriceTicker |
| Modify | `src/services/prices.js` | Add change24h to returned data |
| Modify | `src/pages/DashboardPage.jsx` | Render PriceTicker |
