# Price Ticker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Display a compact dark ticker bar with live prices + 24h change for BTC, ETH, SOL, LTC, DOGE, TRX directly below the dashboard header.

**Architecture:** Extend `prices.js` to return `{ usd, change24h }` per coin, create a `PriceTicker` component that renders a dark horizontal bar, and mount it in `DashboardPage` above the wallet content. No new data fetches — reuses the existing `prices` state.

**Tech Stack:** React, Tailwind CSS, existing CI design tokens (`sidebar-bg`, `sidebar-text`, `success`, `danger`), CoinGecko public API (no key required).

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Modify | `src/services/prices.js` | Add `change24h` to returned shape |
| Create | `src/components/ui/PriceTicker.jsx` | Ticker bar component |
| Modify | `src/components/ui/index.js` | Export PriceTicker |
| Modify | `src/pages/DashboardPage.jsx` | Mount PriceTicker below header |

---

## Task 1: Extend `prices.js` to include 24h change

**Files:**
- Modify: `src/services/prices.js`

### Context

The current service fetches from `/backend/api/prices.php` and returns only `{ bitcoin: usd, … }`. We need `{ bitcoin: { usd, change24h }, … }`.

First, check if the backend already returns `price_change_percentage_24h`. If it does, just parse it. If not, call CoinGecko directly — it's a public endpoint, no API key needed.

Note: The current `prices.js` uses a permanent module-level cache (no TTL) — the new code below preserves this behavior intentionally.

- [ ] **Step 1: Check what the backend actually returns**

Open a browser DevTools console on the running app (`npm run dev`) and run:

```js
fetch('/backend/api/prices.php').then(r => r.json()).then(console.log)
```

Look at the response shape. If the `bitcoin` object has a `price_change_percentage_24h` field → use it (Step 2a). If not → use the direct CoinGecko call (Step 2b).

- [ ] **Step 2a (if backend has 24h data): Update the parser**

Replace `src/services/prices.js` with:

```js
import { BLOCKCHAIN_API } from './blockchainApi'

let cachedPrices = null

export async function getPrices() {
  if (cachedPrices) return cachedPrices

  const res = await fetch(BLOCKCHAIN_API.prices)
  if (!res.ok) throw new Error('Failed to fetch prices')
  const d = await res.json()

  cachedPrices = {
    bitcoin:  { usd: d.bitcoin.usd,  change24h: d.bitcoin.usd_24h_change ?? d.bitcoin.price_change_percentage_24h ?? 0 },
    ethereum: { usd: d.ethereum.usd, change24h: d.ethereum.usd_24h_change ?? d.ethereum.price_change_percentage_24h ?? 0 },
    solana:   { usd: d.solana.usd,   change24h: d.solana.usd_24h_change ?? d.solana.price_change_percentage_24h ?? 0 },
    litecoin: { usd: d.litecoin.usd, change24h: d.litecoin.usd_24h_change ?? d.litecoin.price_change_percentage_24h ?? 0 },
    dogecoin: { usd: d.dogecoin.usd, change24h: d.dogecoin.usd_24h_change ?? d.dogecoin.price_change_percentage_24h ?? 0 },
    tron:     { usd: d.tron.usd,     change24h: d.tron.usd_24h_change ?? d.tron.price_change_percentage_24h ?? 0 },
  }

  return cachedPrices
}
```

- [ ] **Step 2b (if backend has NO 24h data): Call CoinGecko directly**

Replace `src/services/prices.js` with:

```js
import { BLOCKCHAIN_API } from './blockchainApi'

const COINGECKO_URL =
  'https://api.coingecko.com/api/v3/simple/price' +
  '?ids=bitcoin,ethereum,solana,litecoin,dogecoin,tron' +
  '&vs_currencies=usd&include_24hr_change=true'

const COIN_IDS = ['bitcoin', 'ethereum', 'solana', 'litecoin', 'dogecoin', 'tron']

let cachedPrices = null

export async function getPrices() {
  if (cachedPrices) return cachedPrices

  // Fetch both in parallel: backend for USD prices, CoinGecko for 24h change
  const [backendRes, geckoRes] = await Promise.all([
    fetch(BLOCKCHAIN_API.prices),
    fetch(COINGECKO_URL),
  ])

  if (!backendRes.ok) throw new Error('Failed to fetch prices')
  const backend = await backendRes.json()
  const gecko = geckoRes.ok ? await geckoRes.json() : {}

  cachedPrices = Object.fromEntries(
    COIN_IDS.map(id => [
      id,
      {
        usd: backend[id].usd,
        change24h: gecko[id]?.usd_24h_change ?? 0,
      },
    ])
  )

  return cachedPrices
}
```

- [ ] **Step 3: Verify in console**

With the dev server running, open DevTools console and run:

```js
import('/src/services/prices.js').then(m => m.getPrices()).then(console.log)
```

You should see `{ bitcoin: { usd: 94210, change24h: 2.1 }, … }`. All 6 coins with both fields.

- [ ] **Step 4: Fix any consumers of the old shape**

The only current consumer of `prices` in the app is `HistoryChart`. Check if it uses the `prices` prop directly:

```bash
grep -r "prices\." src/ --include="*.jsx" --include="*.js"
```

If `HistoryChart` reads `prices.bitcoin` expecting a number, update those reads to `prices.bitcoin.usd`. Check `src/components/ui/HistoryChart.jsx`.

- [ ] **Step 5: Commit**

```bash
git add src/services/prices.js
# Only add HistoryChart.jsx if it was modified in Step 4:
git add src/components/ui/HistoryChart.jsx 2>/dev/null || true
git commit -m "feat: extend prices service with 24h change data"
```

---

## Task 2: Create `PriceTicker` component

**Files:**
- Create: `src/components/ui/PriceTicker.jsx`

### Context

Dark horizontal bar using the design system's `sidebar-bg` / `sidebar-text` colors (already defined in `ci.js`). Six coins in fixed order. Skeleton state when `prices` is null. No interactivity.

Price formatting rules:
- ≥ $1: `toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })` with `$` prefix (e.g. `$94,210`, `$3,420.50`)
- < $1: `toLocaleString('en-US', { maximumSignificantDigits: 4 })` with `$` prefix (e.g. `$0.3800`, `$0.000280`)
- 24h change: always show sign, one decimal (e.g. `+2.1%`, `−0.4%`)

- [ ] **Step 1: Create `PriceTicker.jsx`**

```jsx
const COINS = [
  { id: 'bitcoin',  symbol: 'BTC' },
  { id: 'ethereum', symbol: 'ETH' },
  { id: 'solana',   symbol: 'SOL' },
  { id: 'litecoin', symbol: 'LTC' },
  { id: 'dogecoin', symbol: 'DOGE' },
  { id: 'tron',     symbol: 'TRX' },
]

function formatUsd(n) {
  if (n >= 1) {
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  }
  return '$' + n.toLocaleString('en-US', { maximumSignificantDigits: 4 })
}

function formatChange(n) {
  const sign = n >= 0 ? '+' : ''
  return sign + n.toFixed(1) + '%'
}

export function PriceTicker({ prices }) {
  return (
    <div className="rounded-lg overflow-hidden" style={{ background: 'var(--color-sidebar-bg)' }}>
      <div className="flex items-center gap-6 px-4 py-2 overflow-x-auto scrollbar-none">
        {COINS.map(({ id, symbol }) => {
          const coin = prices?.[id]
          return (
            <div key={id} className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs font-bold" style={{ color: 'var(--color-sidebar-text)' }}>
                {symbol}
              </span>
              {coin ? (
                <>
                  <span className="text-xs font-mono" style={{ color: 'var(--color-sidebar-text)' }}>
                    {formatUsd(coin.usd)}
                  </span>
                  <span
                    className="text-xs font-mono"
                    style={{ color: coin.change24h >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}
                  >
                    {formatChange(coin.change24h)}
                  </span>
                </>
              ) : (
                <span className="inline-block h-3 w-20 rounded animate-pulse" style={{ background: 'var(--color-sidebar-border)' }} />{/* sidebar-border is defined in ci.js: rgb(255 255 255 / 0.1) */}
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify it looks right**

Temporarily import and render it in isolation. In `DashboardPage.jsx`, add before the return:

```jsx
// TEMP: remove after verifying
import { PriceTicker } from '@ui'
// ... inside JSX at the top:
<PriceTicker prices={{ bitcoin: { usd: 94210, change24h: 2.1 }, ethereum: { usd: 3420, change24h: -0.4 }, solana: { usd: 182, change24h: 1.2 }, litecoin: { usd: 98, change24h: 0.9 }, dogecoin: { usd: 0.38, change24h: 5.2 }, tron: { usd: 0.28, change24h: -1.1 } }} />
```

Open `http://localhost:5173` — should see a dark bar with 6 coins, green/red percentages. Then remove the temp line.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/PriceTicker.jsx
git commit -m "feat: add PriceTicker component"
```

---

## Task 3: Export + wire up in DashboardPage

**Files:**
- Modify: `src/components/ui/index.js`
- Modify: `src/pages/DashboardPage.jsx`

- [ ] **Step 1: Export PriceTicker from index**

In `src/components/ui/index.js`, add at the end:

```js
export { PriceTicker } from './PriceTicker'
```

- [ ] **Step 2: Mount in DashboardPage**

In `src/pages/DashboardPage.jsx`:

1. Add `PriceTicker` to the import:
```js
import { TotalBar, PortfolioSummary, HistoryChart, WalletCard, AddWalletForm, ConfigActions, EditWalletModal, PriceTicker } from '@ui'
```

2. Add the ticker below the header div, before the wallets conditional:
```jsx
<div className="flex items-center justify-between">
  <h1 className="h2">Portfolio</h1>
  <ConfigActions … />
</div>

<PriceTicker prices={prices} />   {/* ← add this line */}

{wallets.length === 0 ? ( … ) : ( … )}
```

- [ ] **Step 3: Verify full flow**

Open `http://localhost:5173`:
1. Ticker appears immediately below header on both the empty state and wallet dashboard
2. On first load, skeleton placeholders are visible briefly while prices load
3. After load: 6 coins with prices and green/red percentages
4. On mobile-width: ticker scrolls horizontally, no layout break

- [ ] **Step 4: Final commit**

```bash
git add src/components/ui/index.js src/pages/DashboardPage.jsx
git commit -m "feat: mount PriceTicker in dashboard"
```
