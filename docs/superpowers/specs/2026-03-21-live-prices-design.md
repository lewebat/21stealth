# Live Prices — Design Spec

**Date:** 2026-03-21
**Status:** Approved

## Goal

Prices (USD + 24h change) are fetched centrally in the backend, cached 60 seconds server-side, and polled every 60 seconds by the frontend. USD wallet values are computed live from token quantities × current price, so every price update is reflected instantly in all wallet cards without re-fetching blockchain data.

## Architecture

Two concerns are separated cleanly:

1. **Token quantities** — fetched from blockchain APIs, stored in `addrTokens` as `{ key, symbol, balance }`. Never change until the user manually refreshes.
2. **Prices** — fetched from the backend every 60 seconds, held in React state. USD values (`balance × price`) are computed at render time using token key → price mapping.

## Backend: `prices.php`

Extend to fetch CoinGecko 24h change alongside CryptoCompare USD prices in a single server-side call. Cache both together for 60 seconds in the temp file. TTL reduced from 300s → 60s.

Response shape (unchanged from frontend perspective):
```json
{
  "bitcoin":  { "usd": 95000, "change24h": 1.23 },
  "ethereum": { "usd": 3200,  "change24h": -0.5 },
  ...
}
```

If CoinGecko fails (rate limit, timeout), `change24h` is `null` for all coins — USD prices still work.

## Frontend: Migration

The frontend currently fetches both the backend (USD) and CoinGecko (24h change) in parallel from the browser. After this change, the backend returns both values and the frontend makes a single call. The direct CoinGecko call is removed from `prices.js`.

## `blockchain.js`

`withPrices()` is removed. Each `fetchXxxBalances()` calls `fetchBalance()` directly and returns raw tokens only:
```js
{ key: 'btc', symbol: 'BTC', balance: 0.11 }
```
No `usd` field. No call to `getPrices()` from `blockchain.js`.

## `useWallets.js`

`addrTokens` stores raw tokens (no `usd`). Both `aggregateTokens` functions (in the hook and in WalletCard) sum `balance` only — the `usd` field is absent and must not be summed. `wallet.tokens` contains `{ key, symbol, balance }`.

## `prices.js`

- Removes the direct CoinGecko fetch and the parallel `Promise.all`
- Single `fetch(BLOCKCHAIN_API.prices)` call to the backend
- `cachedPrices` and `invalidatePrices()` remain (used by Refresh All)

## `src/utils/tokenUsd.js` (new file)

USD is computed by **token key**, not by chain. Each token key maps directly to a price — no chain argument needed. This means `wallet.tokens` (which aggregates across chains and loses chain info) works correctly.

```js
// Token key → CoinGecko coin id
const TOKEN_PRICE_IDS = {
  btc:  'bitcoin',
  eth:  'ethereum',
  sol:  'solana',
  ltc:  'litecoin',
  doge: 'dogecoin',
  trx:  'tron',
}

// Stablecoins are always 1:1 USD
const STABLECOINS = new Set(['usdt', 'usdc'])

export function tokenUsd(token, prices) {
  if (!prices) return 0
  if (STABLECOINS.has(token.key)) return token.balance
  const coinId = TOKEN_PRICE_IDS[token.key]
  return coinId ? token.balance * (prices[coinId]?.usd ?? 0) : 0
}

export function tokensWithUsd(tokens, prices) {
  return tokens.map(t => ({ ...t, usd: tokenUsd(t, prices) }))
}
```

This helper works for any token list — aggregated (`wallet.tokens`) or per-chain (`chainTokens` in WalletCard) — without needing chain context.

## `DashboardPage.jsx`

- `prices` state already exists
- Add `setInterval` (60 000ms) that calls `invalidatePrices()` then `getPrices().then(setPrices)`
- Interval is reset when user clicks "Refresh All" (clear + restart) to avoid a redundant fetch shortly after a manual refresh
- Clear interval on component unmount
- Pass `prices` as additional prop to `WalletCard`, `TotalBar`, `PortfolioSummary`

## `WalletCard.jsx`

- Receives `prices` prop
- `ChainSection` calls `tokensWithUsd(chainTokens, prices)` before passing to the table
- Local `aggregateTokens` function: remove `usd` summation (tokens no longer have `usd`)
- Footer total: sum of `tokenUsd(t, prices)` across all chain tokens

## `TotalBar.jsx`

- Receives `prices` prop
- Iterates `wallet.tokens` (aggregated across all chains) and calls `tokenUsd(t, prices)` per token
- No chain info needed — token key maps directly to price

## `PortfolioSummary.jsx`

- Receives `prices` prop
- Iterates `wallet.tokens` per wallet and calls `tokensWithUsd(wallet.tokens, prices)`
- No chain info needed — same reason as TotalBar

## `useHistory.js`

History snapshots store USD values at snapshot time — this is intentional and correct. Snapshots represent portfolio value at a point in time. **No change needed.**

The snapshot is triggered from `DashboardPage` after balances load. At that point `prices` is available and `tokensWithUsd` can be used to compute USD before snapshotting.

## In-Memory Cache

`useWallets.js` has a module-level `cache` Map that stores fetched tokens. After this change, cached tokens contain only `{ key, symbol, balance }` (no `usd`). The cache is RAM-only and resets on page reload — no migration concern.

## Files Changed

| Action | File | Purpose |
|--------|------|---------|
| Modify | `backend/api/prices.php` | Add CoinGecko 24h fetch, reduce TTL to 60s |
| Modify | `src/services/blockchain.js` | Remove withPrices(), return raw tokens only |
| Modify | `src/services/prices.js` | Remove direct CoinGecko fetch |
| Create | `src/utils/tokenUsd.js` | Shared render-time USD calculation (key-based) |
| Modify | `src/hooks/useWallets.js` | addrTokens stores raw tokens, no USD aggregation |
| Modify | `src/pages/DashboardPage.jsx` | 60s polling, pass prices to components |
| Modify | `src/components/ui/WalletCard.jsx` | prices prop, live USD via tokensWithUsd |
| Modify | `src/components/ui/TotalBar.jsx` | prices prop, live USD total |
| Modify | `src/components/ui/PortfolioSummary.jsx` | prices prop, live USD per token |
| No change | `src/hooks/useHistory.js` | Snapshots store USD at time of snapshot — correct |
