# Live Prices — Design Spec

**Date:** 2026-03-21
**Status:** Approved

## Goal

Prices (USD + 24h change) are fetched centrally in the backend, cached 60 seconds server-side, and polled every 60 seconds by the frontend. USD wallet values are computed live from token quantities × current price, so every price update is reflected instantly in all wallet cards without re-fetching blockchain data.

## Architecture

Two concerns are separated cleanly:

1. **Token quantities** — fetched from blockchain APIs, stored in `addrTokens` as `{ key, symbol, balance }`. Never change until the user manually refreshes.
2. **Prices** — fetched from the backend every 60 seconds, held in React state. USD values (`balance × price`) are computed at render time.

## Backend: `prices.php`

Extend to fetch CoinGecko 24h change alongside CryptoCompare USD prices in a single server-side call. Cache both together for 60 seconds in the temp file.

Response shape (unchanged from frontend perspective):
```json
{
  "bitcoin":  { "usd": 95000, "change24h": 1.23 },
  "ethereum": { "usd": 3200,  "change24h": -0.5 },
  ...
}
```

If CoinGecko fails (rate limit, timeout), `change24h` is `null` for all coins — USD prices still work.

Cache TTL reduced from 300s → 60s.

## Frontend Data Flow

### `blockchain.js`

`withPrices()` is removed. Each `fetchXxxBalances()` returns raw tokens only:
```js
{ key: 'btc', symbol: 'BTC', balance: 0.11 }
```
No `usd` field. No call to `getPrices()` from blockchain.js.

### `useWallets.js`

`addrTokens` stores raw tokens (no `usd`). The `aggregateTokens` function sums `balance` only — no USD aggregation. `wallet.tokens` contains `{ key, symbol, balance }`.

The `recompute` function no longer needs to sum USD (that happens at render time).

### `prices.js`

- Removes direct CoinGecko fetch
- Single `fetch(BLOCKCHAIN_API.prices)` call
- `cachedPrices` and `invalidatePrices()` remain (used by Refresh All to force a re-fetch)

### `DashboardPage.jsx`

- `prices` state already exists
- Add `setInterval` (60s) that calls `invalidatePrices()` then `getPrices().then(setPrices)`
- Clear interval on unmount
- Pass `prices` as prop to `WalletCard`, `TotalBar`, `PortfolioSummary`

### USD Calculation (render-time)

A shared helper used by WalletCard, TotalBar, PortfolioSummary:
```js
// src/utils/tokenUsd.js
const PRICE_KEYS = { eth: 'ethereum', btc: 'bitcoin', sol: 'solana', ltc: 'litecoin', doge: 'dogecoin', trx: 'tron' }

export function tokenUsd(token, chain, prices) {
  if (!prices) return 0
  if (token.key === 'usdt' || token.key === 'usdc') return token.balance
  const coinId = PRICE_KEYS[chain]
  return token.balance * (prices[coinId]?.usd ?? 0)
}

export function tokensWithUsd(tokens, chain, prices) {
  return tokens.map(t => ({ ...t, usd: tokenUsd(t, chain, prices) }))
}
```

### `WalletCard.jsx`

- Receives `prices` prop
- `ChainSection` gets `prices` + `chain`, calls `tokensWithUsd(chainTokens, chain, prices)` before passing to the table
- Footer total: sum of all chain tokens' live USD values

### `TotalBar.jsx`

- Receives `prices` prop
- Computes total USD by summing `tokensWithUsd` across all wallets and all chain entries

### `PortfolioSummary.jsx`

- Receives `prices` prop
- Recomputes USD per token using `tokensWithUsd`

### `useHistory.js`

History snapshots store USD values at snapshot time — this is intentional and correct. Snapshots represent the portfolio value at a point in time. No change needed.

## Price Key Mapping

| Chain | `prices` key |
|-------|-------------|
| eth   | ethereum    |
| btc   | bitcoin     |
| sol   | solana      |
| ltc   | litecoin    |
| doge  | dogecoin    |
| trx   | tron        |

Stablecoins (`usdt`, `usdc`) always = `balance` (1:1 USD).

## Files Changed

| Action | File | Purpose |
|--------|------|---------|
| Modify | `backend/api/prices.php` | Add CoinGecko 24h fetch, reduce TTL to 60s |
| Modify | `src/services/blockchain.js` | Remove withPrices(), return raw tokens only |
| Modify | `src/services/prices.js` | Remove direct CoinGecko fetch |
| Create | `src/utils/tokenUsd.js` | Shared render-time USD calculation helper |
| Modify | `src/hooks/useWallets.js` | addrTokens stores raw tokens, no USD aggregation |
| Modify | `src/pages/DashboardPage.jsx` | 60s polling, pass prices to cards |
| Modify | `src/components/ui/WalletCard.jsx` | prices prop, live USD via tokensWithUsd |
| Modify | `src/components/ui/TotalBar.jsx` | prices prop, live USD total |
| Modify | `src/components/ui/PortfolioSummary.jsx` | prices prop, live USD per token |
| No change | `src/hooks/useHistory.js` | Snapshots store USD at time of snapshot — correct |
