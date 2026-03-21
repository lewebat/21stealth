# Live Prices Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decouple token quantities from USD values so prices auto-update every 60 seconds without re-fetching blockchain data; move 24h change fetch from browser to backend.

**Architecture:** Backend `prices.php` returns `{coinId: {usd, change24h}}` and caches 60s. Frontend polls every 60s. Token balances (`addrTokens`) store raw `{key, symbol, balance}` only. USD is computed at render time via a new `tokenUsd.js` helper using `token.key → CoinGecko coin ID` mapping. All components receive `prices` prop from `DashboardPage`.

**Tech Stack:** PHP (backend), React, Vite, no test framework in this project.

---

## File Map

| Action | File | Change |
|--------|------|--------|
| Modify | `backend/api/prices.php` | Fetch CoinGecko 24h alongside CryptoCompare, reduce TTL 300→60s |
| Modify | `src/services/prices.js` | Remove direct CoinGecko fetch, single backend call |
| Modify | `src/services/blockchain.js` | Remove `withPrices()`, each export calls `fetchBalance()` directly |
| Create | `src/utils/tokenUsd.js` | `tokenUsd(token, prices)` and `tokensWithUsd(tokens, prices)` |
| Modify | `src/hooks/useWallets.js` | Remove `usd` field from `aggregateTokens` |
| Modify | `src/pages/DashboardPage.jsx` | 60s price polling interval, pass `prices` to WalletCard/TotalBar/PortfolioSummary |
| Modify | `src/components/ui/WalletCard.jsx` | Add `prices` prop, use `tokensWithUsd` in ChainSection, `tokenUsd` in footer total |
| Modify | `src/components/ui/TotalBar.jsx` | Add `prices` prop, compute USD via `tokenUsd` |
| Modify | `src/components/ui/PortfolioSummary.jsx` | Add `prices` prop, compute USD via `tokensWithUsd` |

---

### Task 1: Update `prices.php` — add 24h change, reduce TTL to 60s

**Files:**
- Modify: `backend/api/prices.php`

**Context:** Currently fetches CryptoCompare for USD only, 300s TTL. Need to additionally fetch CoinGecko for `usd_24h_change` in the same server-side call and return both values together. If CoinGecko fails, `change24h` is `null` but USD still works.

- [ ] **Step 1: Update prices.php**

Replace the entire file with:

```php
<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$cache_file = sys_get_temp_dir() . '/21stealth_prices.json';
$cache_ttl  = 60; // 1 minute

// Return cached prices if still fresh
if (file_exists($cache_file) && time() - filemtime($cache_file) < $cache_ttl) {
    echo file_get_contents($cache_file);
    exit;
}

// Fetch USD prices from CryptoCompare
$ccResponse = @file_get_contents(
    'https://min-api.cryptocompare.com/data/pricemulti?fsyms=BTC,ETH,SOL,LTC,DOGE,TRX&tsyms=USD',
    false,
    stream_context_create(['http' => ['timeout' => 10]])
);

if ($ccResponse === false) {
    http_response_code(502);
    echo json_encode(['error' => 'Failed to fetch prices']);
    exit;
}

$cc = json_decode($ccResponse, true);

// Fetch 24h change from CoinGecko (best-effort — null if unavailable)
$geckoResponse = @file_get_contents(
    'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,litecoin,dogecoin,tron&vs_currencies=usd&include_24hr_change=true',
    false,
    stream_context_create(['http' => ['timeout' => 10]])
);
$gecko = $geckoResponse !== false ? json_decode($geckoResponse, true) : [];

$result = json_encode([
    'bitcoin'  => ['usd' => $cc['BTC']['USD'], 'change24h' => $gecko['bitcoin']['usd_24h_change']  ?? null],
    'ethereum' => ['usd' => $cc['ETH']['USD'], 'change24h' => $gecko['ethereum']['usd_24h_change'] ?? null],
    'solana'   => ['usd' => $cc['SOL']['USD'], 'change24h' => $gecko['solana']['usd_24h_change']   ?? null],
    'litecoin' => ['usd' => $cc['LTC']['USD'], 'change24h' => $gecko['litecoin']['usd_24h_change'] ?? null],
    'dogecoin' => ['usd' => $cc['DOGE']['USD'], 'change24h' => $gecko['dogecoin']['usd_24h_change'] ?? null],
    'tron'     => ['usd' => $cc['TRX']['USD'], 'change24h' => $gecko['tron']['usd_24h_change']     ?? null],
]);

file_put_contents($cache_file, $result);
echo $result;
```

- [ ] **Step 2: Verify manually**

Hit `http://localhost/backend/api/prices.php` (or via proxy) — confirm response shape:
```json
{"bitcoin":{"usd":95000,"change24h":1.23},"ethereum":{"usd":3200,"change24h":-0.5},...}
```
`change24h` may be `null` if CoinGecko rate-limits — that is acceptable.

- [ ] **Step 3: Commit**

```bash
git add backend/api/prices.php
git commit -m "feat: prices.php adds 24h change from CoinGecko, reduces TTL to 60s"
```

---

### Task 2: Simplify `prices.js` — single backend call

**Files:**
- Modify: `src/services/prices.js`

**Context:** Currently fetches backend (USD) + CoinGecko (24h) in parallel from the browser. After the backend now returns both, remove the direct CoinGecko call. The `cachedPrices` module cache and `invalidatePrices()` remain — they're used by `DashboardPage.refreshAll`.

- [ ] **Step 1: Rewrite prices.js**

```js
import { BLOCKCHAIN_API } from './blockchainApi'

let cachedPrices = null

export function invalidatePrices() {
  cachedPrices = null
}

export async function getPrices() {
  if (cachedPrices) return cachedPrices

  const res = await fetch(BLOCKCHAIN_API.prices)
  if (!res.ok) throw new Error('Failed to fetch prices')
  cachedPrices = await res.json()
  return cachedPrices
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/prices.js
git commit -m "feat: prices.js fetches from backend only, removes direct CoinGecko call"
```

---

### Task 3: Create `src/utils/tokenUsd.js`

**Files:**
- Create: `src/utils/tokenUsd.js`

**Context:** New utility that computes USD value at render time using `token.key → CoinGecko coin ID` mapping. Key-based (no chain argument) so it works on aggregated `wallet.tokens` which has no chain context. Stablecoins (usdt, usdc) are always 1:1 USD.

- [ ] **Step 1: Create tokenUsd.js**

```js
// Token key → CoinGecko coin ID
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

- [ ] **Step 2: Commit**

```bash
git add src/utils/tokenUsd.js
git commit -m "feat: add tokenUsd utility for render-time USD computation"
```

---

### Task 4: Remove `withPrices()` from `blockchain.js`

**Files:**
- Modify: `src/services/blockchain.js`

**Context:** Currently each `fetchXxxBalances` calls `withPrices()` which fetches prices AND multiplies balance × price, adding a `usd` field. After this change, each export calls `fetchBalance()` directly and returns raw tokens `{key, symbol, balance}` — no `usd` field, no price fetching.

- [ ] **Step 1: Rewrite blockchain.js**

```js
import { BLOCKCHAIN_API } from './blockchainApi'

async function fetchBalance(chain, address) {
  let res
  try {
    res = await fetch(`${BLOCKCHAIN_API.balance(chain)}?address=${encodeURIComponent(address)}`)
  } catch {
    throw new Error('Backend not reachable')
  }

  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Backend not configured (no JSON)')
  }

  if (!res.ok) throw new Error(data.error ?? `${chain.toUpperCase()} API error`)
  return data.tokens
}

export const fetchEthBalances  = (address) => fetchBalance('eth',  address)
export const fetchBtcBalances  = (address) => fetchBalance('btc',  address)
export const fetchSolBalances  = (address) => fetchBalance('sol',  address)
export const fetchLtcBalances  = (address) => fetchBalance('ltc',  address)
export const fetchDogeBalances = (address) => fetchBalance('doge', address)
export const fetchTrxBalances  = (address) => fetchBalance('trx',  address)
```

- [ ] **Step 2: Commit**

```bash
git add src/services/blockchain.js
git commit -m "feat: blockchain.js returns raw tokens only, removes withPrices()"
```

---

### Task 5: Update `useWallets.js` — remove `usd` from aggregateTokens

**Files:**
- Modify: `src/hooks/useWallets.js:37-54`

**Context:** `aggregateTokens` currently sums both `balance` and `usd`. Since tokens no longer have a `usd` field, remove `usd` from the merge. The `wallet.tokens` array will contain only `{key, symbol, balance}`.

- [ ] **Step 1: Edit aggregateTokens in useWallets.js**

Find the `aggregateTokens` function (lines 37-54) and replace it:

```js
function aggregateTokens(addrTokens, keys) {
  const map = new Map()
  for (const key of keys) {
    const tokens = addrTokens[key]
    if (!tokens) continue
    for (const t of tokens) {
      const existing = map.get(t.key)
      if (!existing) {
        map.set(t.key, { ...t })
      } else {
        existing.balance += t.balance
        // metadata from first entry is kept
      }
    }
  }
  return [...map.values()]
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useWallets.js
git commit -m "feat: useWallets aggregateTokens sums balance only, no usd field"
```

---

### Task 6: Update `DashboardPage.jsx` — 60s polling, pass prices to components

**Files:**
- Modify: `src/pages/DashboardPage.jsx`

**Context:** Currently fetches prices once on mount. Need to add a 60-second `setInterval` that calls `invalidatePrices()` then `getPrices()`. The interval must be cleared on unmount. When user clicks "Refresh All", the interval should reset (clear and restart) to avoid a redundant fetch right after a manual refresh. Also pass `prices` prop to `WalletCard`, `TotalBar`, and `PortfolioSummary`.

**Note on HistoryChart:** The original `DashboardPage.jsx` already passes `prices={prices}` to `HistoryChart` (pre-existing, not added here). The plan preserves it. `useHistory.js` snapshots only store `token.balance` — not `usd` — so `saveSnapshot(wallets)` works correctly with raw tokens.

- [ ] **Step 1: Update DashboardPage.jsx**

```jsx
import { useEffect, useRef, useState } from 'react'
import { useWallets } from '@hooks/useWallets'
import { useHistory } from '@hooks/useHistory'
import { getPrices, invalidatePrices } from '@/services/prices'
import { TotalBar, PortfolioSummary, HistoryChart, WalletCard, AddWalletForm, ConfigActions, EditWalletModal, PriceTicker } from '@ui'
import { Container, Grid } from '@layout'

export default function DashboardPage() {
  const { wallets, addWallet, removeWallet, updateWallet, refreshWallet, refreshAll, importWallets } = useWallets()
  const { history, saveSnapshot, loadHistory, getDelta } = useHistory()
  const [prices, setPrices] = useState(null)
  const [editingWalletId, setEditingWalletId] = useState(null)
  const editingWallet = editingWalletId ? wallets.find(w => w.id === editingWalletId) ?? null : null
  const intervalRef = useRef(null)

  function startPricePolling() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      invalidatePrices()
      getPrices().then(setPrices).catch(() => {})
    }, 60_000)
  }

  useEffect(() => {
    getPrices().then(setPrices).catch(() => {})
    startPricePolling()
    return () => clearInterval(intervalRef.current)
  }, [])

  useEffect(() => {
    const anyLoading = wallets.some(w => w.status === 'loading' || w.status === 'idle')
    const anyLoaded  = wallets.some(w => w.status === 'ok')
    if (!anyLoading && anyLoaded) saveSnapshot(wallets)
  }, [wallets, saveSnapshot])

  function handleRefreshAll() {
    invalidatePrices()
    getPrices().then(setPrices).catch(() => {})
    startPricePolling()
    refreshAll()
  }

  return (
    <Container className="py-6 flex flex-col gap-6">

      <div className="flex items-center justify-between">
        <h1 className="h2">Portfolio</h1>
        <ConfigActions
          wallets={wallets}
          history={history}
          onImport={(ws, hist) => { importWallets(ws); if (hist) loadHistory(hist) }}
        />
      </div>

      <PriceTicker prices={prices} />

      {wallets.length === 0 ? (
        <Grid>
          <Grid.Col span="full">
            <div className="card">
              <div className="card-body flex flex-col items-center py-24 gap-4 text-center">
                <div className="text-display">🔒</div>
                <p className="h4">No wallets yet</p>
                <p className="text-body text-text-muted">Add a wallet address or import your config.</p>
                <div className="w-full max-w-sm">
                  <AddWalletForm onAdd={addWallet} />
                </div>
              </div>
            </div>
          </Grid.Col>
        </Grid>
      ) : (
        <>
          <Grid gap="md">
            <Grid.Col span="third">
              <TotalBar wallets={wallets} prices={prices} onRefreshAll={handleRefreshAll} />
            </Grid.Col>
            <Grid.Col span="two-thirds">
              <PortfolioSummary wallets={wallets} prices={prices} getDelta={getDelta} />
            </Grid.Col>
          </Grid>

          <Grid>
            <Grid.Col span="full">
              <HistoryChart history={history} wallets={wallets} prices={prices} />
            </Grid.Col>
          </Grid>

          <Grid gap="md" className="items-stretch">
            {wallets.map(wallet => (
              <Grid.Col key={wallet.id} span="half">
                <WalletCard
                  wallet={wallet}
                  prices={prices}
                  onRefresh={() => refreshWallet(wallet.id)}
                  onRemove={() => removeWallet(wallet.id)}
                  onEdit={() => setEditingWalletId(wallet.id)}
                  getDelta={getDelta}
                />
              </Grid.Col>
            ))}
          </Grid>

          <Grid>
            <Grid.Col span="full">
              <AddWalletForm onAdd={addWallet} />
            </Grid.Col>
          </Grid>
        </>
      )}

      {editingWallet && (
        <EditWalletModal
          wallet={editingWallet}
          isOpen={true}
          onClose={() => setEditingWalletId(null)}
          onSave={(id, patch) => { updateWallet(id, patch); setEditingWalletId(null) }}
        />
      )}

    </Container>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/DashboardPage.jsx
git commit -m "feat: DashboardPage polls prices every 60s, passes prices to components"
```

---

### Task 7: Update `WalletCard.jsx` — live USD via prices prop

**Files:**
- Modify: `src/components/ui/WalletCard.jsx`

**Context:** `ChainSection` currently calls local `aggregateTokens` which returns tokens with a `usd` field from `addrTokens`. After this change, `addrTokens` has no `usd`. Instead, call `tokensWithUsd(chainTokens, prices)` to inject `usd` at render time. The footer total also changes from `wallet.tokens.reduce(…usd)` to summing `tokenUsd(t, prices)` per token. The local `aggregateTokens` function: remove the `usd` summation (tokens from `addrTokens` no longer have `usd`).

- [ ] **Step 1: Rewrite WalletCard.jsx**

```jsx
import { useMemo } from 'react'
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table'
import Card from './Card'
import { tokenUsd, tokensWithUsd } from '@/utils/tokenUsd'

const CHAIN_BADGE = {
  eth:  'bg-primary text-text-inverted',
  btc:  'bg-accent text-text-inverted',
  sol:  'bg-info text-text-inverted',
  ltc:  'bg-info text-text-inverted',
  doge: 'bg-warning text-text-inverted',
  trx:  'bg-danger text-text-inverted',
}

const fmt4 = (n) => n.toLocaleString('en-US', { maximumFractionDigits: 4 })
const fmt2 = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const shorten = (addr) => addr.length > 20 ? `${addr.slice(0, 10)}…${addr.slice(-6)}` : addr

// Aggregate raw tokens from multiple addrTokens entries into one list (sum balance by key)
function aggregateTokens(addresses, chain, addrTokens) {
  const map = new Map()
  for (const addr of addresses) {
    const tokens = addrTokens[`${chain}:${addr}`] ?? []
    for (const t of tokens) {
      if (map.has(t.key)) {
        const existing = map.get(t.key)
        map.set(t.key, { ...existing, balance: existing.balance + t.balance })
      } else {
        map.set(t.key, { ...t })
      }
    }
  }
  return [...map.values()]
}

function ChainSection({ chain, addresses, addrTokens, addrStatus, addrError, walletId, getDelta, prices }) {
  // Derive chain-level status: loading if any loading, error if all errored, else ok
  const statuses = addresses.map(a => addrStatus[`${chain}:${a}`] ?? 'loading')
  const chainStatus = statuses.some(s => s === 'loading') ? 'loading'
    : statuses.every(s => s === 'error') ? 'error'
    : 'ok'
  const firstError = addresses.map(a => addrError[`${chain}:${a}`]).find(Boolean)
  const rawTokens = useMemo(
    () => aggregateTokens(addresses, chain, addrTokens),
    [addresses, chain, addrTokens]
  )
  const chainTokens = useMemo(
    () => tokensWithUsd(rawTokens, prices),
    [rawTokens, prices]
  )

  const columns = useMemo(() => [
    {
      id: 'token',
      header: 'Token',
      accessorKey: 'key',
      cell: ({ getValue }) => <span className="text-label text-text-muted">{getValue().toUpperCase()}</span>,
    },
    {
      id: 'balance',
      header: () => <span className="block text-right">Balance</span>,
      accessorKey: 'balance',
      cell: ({ getValue, row }) => {
        const delta = getDelta(walletId, row.original.key, getValue())
        const positive = delta !== null && delta > 0
        return (
          <div className="text-right">
            <span className="font-mono text-caption">{fmt4(getValue())}</span>
            {delta !== null && (
              <span className={`text-caption font-mono ml-1 ${positive ? 'text-success' : 'text-danger'}`}>
                {positive ? '+' : ''}{fmt4(delta)}
              </span>
            )}
          </div>
        )
      },
    },
    {
      id: 'usd',
      header: () => <span className="block text-right">USD</span>,
      accessorKey: 'usd',
      cell: ({ getValue }) => (
        <div className="text-right font-mono text-caption text-text-muted">${fmt2(getValue())}</div>
      ),
    },
  ], [walletId, getDelta])

  const table = useReactTable({
    data: chainTokens,
    columns,
    getCoreRowModel: getCoreRowModel(),
    autoResetPageIndex: false,
  })

  const addrLabel = addresses.length === 1
    ? shorten(addresses[0])
    : `${addresses.length} Adressen`

  return (
    <div className="border-t border-border">
      <div className="px-3 pt-2 pb-1 flex items-center gap-2">
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 ${CHAIN_BADGE[chain]}`}>
          {chain.toUpperCase()}
        </span>
        <span className="text-caption font-mono text-text-subtle truncate">{addrLabel}</span>
      </div>
      {chainStatus === 'loading' && (
        <div className="px-3 pb-2"><div className="skeleton h-4 w-24" /></div>
      )}
      {chainStatus === 'error' && (
        <div className="px-3 pb-2 form-error">{firstError ?? 'Error'}</div>
      )}
      {chainStatus === 'ok' && (
        chainTokens.length === 0 ? (
          <div className="px-3 pb-2 text-caption text-text-subtle">No balance</div>
        ) : (
          <Card.Body className="pt-0">
            <div className="table-wrapper">
              <table className="table table-compact">
                <thead>
                  {table.getHeaderGroups().map(hg => (
                    <tr key={hg.id}>
                      {hg.headers.map(h => (
                        <th key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map(row => (
                    <tr key={row.id}>
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card.Body>
        )
      )}
    </div>
  )
}

export function WalletCard({ wallet, prices, onRefresh, onRemove, onEdit, getDelta }) {
  // wallet.tokens is pre-aggregated raw tokens (no usd). Compute total from prices.
  const totalUsd = wallet.tokens.reduce((s, t) => s + tokenUsd(t, prices), 0)
  const allKeys = wallet.entries.flatMap(e => e.addresses.map(a => `${e.chain}:${a}`))
  const isPartialError = wallet.status === 'error' &&
    allKeys.some(k => wallet.addrStatus[k] === 'ok')
  const chainCount = wallet.entries.length

  return (
    <Card className="h-full flex flex-col">
      <Card.Header>
        <div className="flex items-center gap-1.5 min-w-0">
          {chainCount === 1 ? (
            <span className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 ${CHAIN_BADGE[wallet.entries[0].chain]}`}>
              {wallet.entries[0].chain.toUpperCase()}
            </span>
          ) : (
            <span className="text-xs font-bold px-1.5 py-0.5 rounded shrink-0 bg-primary text-text-inverted">
              {chainCount} Chains
            </span>
          )}
          <span className="text-body font-semibold truncate">{wallet.label}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onEdit}
            title="Bearbeiten"
            className="btn-icon text-text-muted hover:text-text"
          >
            ✎
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={wallet.status === 'loading'}
            title="Refresh"
            className="btn-icon text-text-muted hover:text-text disabled:opacity-40"
          >
            {wallet.status === 'loading' ? '…' : '↻'}
          </button>
          <button type="button" onClick={onRemove} title="Remove" className="btn-icon text-text-subtle hover:text-danger">
            ✕
          </button>
        </div>
      </Card.Header>

      {wallet.entries.map(({ chain, addresses }) => (
        <ChainSection
          key={chain}
          chain={chain}
          addresses={addresses}
          addrTokens={wallet.addrTokens}
          addrStatus={wallet.addrStatus}
          addrError={wallet.addrError}
          walletId={wallet.id}
          getDelta={getDelta}
          prices={prices}
        />
      ))}

      <Card.Footer className="mt-auto">
        <span className="text-caption text-text-subtle">Total</span>
        <span className="text-caption font-semibold">
          ${fmt2(totalUsd)}{isPartialError ? ' *' : ''}
        </span>
      </Card.Footer>
    </Card>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/WalletCard.jsx
git commit -m "feat: WalletCard computes USD live via prices prop"
```

---

### Task 8: Update `TotalBar.jsx` — live USD via prices prop

**Files:**
- Modify: `src/components/ui/TotalBar.jsx`

**Context:** Currently sums `t.usd` from `wallet.tokens`. After this change, tokens have no `usd` field — call `tokenUsd(t, prices)` per token instead.

- [ ] **Step 1: Rewrite TotalBar.jsx**

```jsx
import Button from './Button'
import { tokenUsd } from '@/utils/tokenUsd'

export function TotalBar({ wallets, prices, onRefreshAll }) {
  const total = wallets.reduce(
    (sum, w) => sum + w.tokens.reduce((s, t) => s + tokenUsd(t, prices), 0),
    0
  )

  return (
    <div className="card">
      <div className="card-header">
        <span className="text-label text-text-subtle">Total Portfolio</span>
        <Button variant="ghost" size="xs" onClick={onRefreshAll}>Refresh all</Button>
      </div>
      <div className="card-body">
        <div className="h2">
          ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/TotalBar.jsx
git commit -m "feat: TotalBar computes USD live via prices prop"
```

---

### Task 9: Update `PortfolioSummary.jsx` — live USD via prices prop

**Files:**
- Modify: `src/components/ui/PortfolioSummary.jsx`

**Context:** Currently reads `token.usd` directly from `wallet.tokens`. After this change tokens have no `usd`. Compute USD via `tokenUsd(token, prices)` for each token when building the table data. The `deltaUsd` computation also changes: `delta * (tokenUsd(token, prices) / token.balance || 1)` — but since `token.usd` is gone, derive price from `tokenUsd` itself. Actually, the price per token is `tokenUsd({...token, balance: 1}, prices)`. Use that to compute `deltaUsd`.

- [ ] **Step 1: Rewrite PortfolioSummary.jsx**

```jsx
import { useMemo } from 'react'
import { useReactTable, getCoreRowModel, getSortedRowModel, flexRender } from '@tanstack/react-table'
import Card from './Card'
import { tokenUsd } from '@/utils/tokenUsd'

const TOKEN_LABELS = { btc: 'Bitcoin', eth: 'Ethereum', sol: 'Solana', ltc: 'Litecoin', doge: 'Dogecoin', trx: 'Tron', usdt: 'Tether USD', usdc: 'USD Coin' }

const TOKEN_COLORS = {
  btc:  { text: 'text-accent',   bar: 'bg-accent' },
  eth:  { text: 'text-primary',  bar: 'bg-primary' },
  sol:  { text: 'text-info',     bar: 'bg-info' },
  ltc:  { text: 'text-info',     bar: 'bg-info' },
  doge: { text: 'text-warning',  bar: 'bg-warning' },
  trx:  { text: 'text-danger',   bar: 'bg-danger' },
  usdt: { text: 'text-success',  bar: 'bg-success' },
  usdc: { text: 'text-info',     bar: 'bg-info' },
}

const fmt = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function PortfolioSummary({ wallets, prices, getDelta }) {
  const loadedWallets = wallets.filter((w) => w.status === 'ok')

  const { data, totalUsd } = useMemo(() => {
    const map = new Map()
    for (const wallet of loadedWallets) {
      for (const token of wallet.tokens) {
        const usd = tokenUsd(token, prices)
        // price per 1 unit of this token (for delta calculation)
        const unitPrice = token.balance > 0 ? usd / token.balance : 0
        const delta = getDelta(wallet.id, token.key, token.balance)
        const existing = map.get(token.key)
        if (existing) {
          existing.usd += usd
          if (delta !== null)
            existing.deltaUsd = (existing.deltaUsd ?? 0) + delta * unitPrice
        } else {
          map.set(token.key, {
            key: token.key,
            label: TOKEN_LABELS[token.key] ?? token.key,
            usd,
            deltaUsd: delta !== null ? delta * unitPrice : null,
          })
        }
      }
    }
    const rows = Array.from(map.values()).sort((a, b) => b.usd - a.usd)
    const total = rows.reduce((s, t) => s + t.usd, 0)
    return { data: rows, totalUsd: total }
  }, [loadedWallets, prices, getDelta])

  const columns = useMemo(() => [
    {
      id: 'token',
      header: 'Token',
      accessorKey: 'key',
      cell: ({ row }) => {
        const colors = TOKEN_COLORS[row.original.key] ?? { text: 'text-text-muted' }
        return (
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold w-10 ${colors.text}`}>{row.original.key.toUpperCase()}</span>
            <span className="text-caption text-text-muted">{row.original.label}</span>
          </div>
        )
      },
    },
    {
      id: 'usd',
      header: () => <span className="block text-right">Value (USD)</span>,
      accessorKey: 'usd',
      cell: ({ getValue, row }) => {
        const positive = row.original.deltaUsd !== null && row.original.deltaUsd > 0
        return (
          <div className="text-right">
            <span className="font-semibold">${fmt(getValue())}</span>
            {row.original.deltaUsd !== null && Math.abs(row.original.deltaUsd) >= 0.01 && (
              <span className={`text-caption font-mono ml-1.5 ${positive ? 'text-success' : 'text-danger'}`}>
                {positive ? '+' : ''}${fmt(row.original.deltaUsd)}
              </span>
            )}
          </div>
        )
      },
    },
    {
      id: 'share',
      header: () => <span className="block text-right">Share</span>,
      accessorKey: 'usd',
      enableSorting: false,
      cell: ({ row }) => {
        const pct = totalUsd > 0 ? (row.original.usd / totalUsd) * 100 : 0
        const colors = TOKEN_COLORS[row.original.key] ?? { bar: 'bg-text-muted' }
        return (
          <div className="flex items-center justify-end gap-2 min-w-[80px]">
            <span className="text-caption text-text-muted w-10 text-right">{pct.toFixed(1)}%</span>
            <div className="w-16 h-1 bg-border rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${colors.bar}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      },
    },
  ], [totalUsd])

  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(), autoResetPageIndex: false })

  if (data.length === 0) return null

  return (
    <Card>
      <Card.Header>
        <span className="h5">Breakdown</span>
      </Card.Header>
      <Card.Body>
      <div className="table-wrapper">
        <table className="table table-compact">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </Card.Body>
    </Card>
  )
}
```

- [ ] **Step 2: Start dev server and verify**

```bash
npm run dev
```

Open app, add a wallet, confirm:
- Token balances show correct USD values
- Total portfolio value matches sum
- "Refresh all" still works (fetches fresh prices + blockchain data)
- After 60s the prices update silently in the background

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/PortfolioSummary.jsx
git commit -m "feat: PortfolioSummary computes USD live via prices prop"
```
