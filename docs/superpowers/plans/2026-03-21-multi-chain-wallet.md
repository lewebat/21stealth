# Multi-Chain Wallet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow a single wallet card to contain addresses from multiple chains (ETH, BTC, SOL, etc.) grouped under one label, with aggregated total balance.

**Architecture:** Replace `wallet.chain` + `wallet.addresses` with `wallet.entries: [{chain, addresses}]` throughout the app. The cache key changes from `address` to `chain:address`. WalletCard renders one section per chain entry. AddWalletForm and EditWalletModal support adding entries from different chains. Backward compat on import via a single `normalise()` function.

**Tech Stack:** React, existing `detectChain` utility, existing `Modal`/`Form`/`Card` components, `@tanstack/react-table`.

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Modify | `src/hooks/useWallets.js` | entries model, chain:address keys |
| Modify | `src/services/walletConfig.js` | export entries, import backward compat |
| Modify | `src/components/ui/WalletCard.jsx` | per-chain sections via ChainSection |
| Modify | `src/components/ui/AddWalletForm.jsx` | multi-chain entry input |
| Modify | `src/components/ui/EditWalletModal.jsx` | manage chain entries |

`src/pages/DashboardPage.jsx` — no changes needed (API is unchanged: `addWallet(label, entries)`, `updateWallet(id, {label, entries})`).

---

## Task 1: Refactor `useWallets.js`

**Files:**
- Modify: `src/hooks/useWallets.js`

### Context

Current shape: `{ chain, addresses, addrTokens, addrStatus, addrError, tokens, status, errorMsg }`
New shape: `{ entries, addrTokens, addrStatus, addrError, tokens, status, errorMsg }` where `entries = [{chain, addresses}]` and all per-address keys are `chain:address`.

The cache already uses `chain:address` keys (unchanged). The main changes are:
1. `addrKey(chain, addr)` replaces inline template literals throughout
2. `allAddrKeys(wallet)` flattens entries to all `chain:address` keys
3. `aggregateTokens/Status/ErrorMsg` receive keys instead of plain addresses
4. `makeWallet(id, label, entries)` replaces `makeWallet(id, label, chain, addresses)`
5. `loadOneAddress` checks `w.entries.some(...)` instead of `w.addresses.includes(...)`
6. `loadBalances` iterates `wallet.entries`
7. `addWallet(label, entries)` — new signature
8. `updateWallet(id, patch)` — patch.entries instead of patch.addresses
9. `importWallets` — expects pre-normalised entries

- [ ] **Step 1: Replace `src/hooks/useWallets.js` with the new implementation**

```js
import { useState, useCallback, useRef } from 'react'
import { fetchEthBalances, fetchBtcBalances, fetchSolBalances, fetchLtcBalances, fetchDogeBalances, fetchTrxBalances } from '@/services/blockchain'

const CACHE_TTL = 60_000
const cache = new Map() // key: 'chain:address' → { tokens, ts }

function addrKey(chain, address) { return `${chain}:${address}` }

function getCached(chain, address) {
  const key = addrKey(chain, address)
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null }
  return entry
}

function setCached(chain, address, tokens) {
  cache.set(addrKey(chain, address), { tokens, ts: Date.now() })
}

function fetchBalances(chain, address) {
  switch (chain) {
    case 'eth':  return fetchEthBalances(address)
    case 'btc':  return fetchBtcBalances(address)
    case 'sol':  return fetchSolBalances(address)
    case 'ltc':  return fetchLtcBalances(address)
    case 'doge': return fetchDogeBalances(address)
    case 'trx':  return fetchTrxBalances(address)
    default: throw new Error(`Unsupported chain: ${chain}`)
  }
}

function allAddrKeys(wallet) {
  return wallet.entries.flatMap(e => e.addresses.map(a => addrKey(e.chain, a)))
}

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
        existing.usd += t.usd
        // metadata from first entry is kept
      }
    }
  }
  return [...map.values()]
}

function aggregateStatus(addrStatus, keys) {
  const statuses = keys.map(k => addrStatus[k] ?? 'loading')
  if (statuses.some(s => s === 'loading')) return 'loading'
  if (statuses.some(s => s === 'error')) return 'error'
  return 'ok'
}

function aggregateErrorMsg(addrStatus, keys) {
  const errCount = keys.filter(k => addrStatus[k] === 'error').length
  if (errCount === 0) return undefined
  return `${errCount} von ${keys.length} Adressen konnten nicht geladen werden`
}

function recompute(wallet) {
  const keys = allAddrKeys(wallet)
  return {
    ...wallet,
    tokens: aggregateTokens(wallet.addrTokens, keys),
    status: aggregateStatus(wallet.addrStatus, keys),
    errorMsg: aggregateErrorMsg(wallet.addrStatus, keys),
  }
}

function makeWallet(id, label, entries) {
  const addrStatus = {}
  const addrTokens = {}
  const addrError = {}
  for (const { chain, addresses } of entries) {
    for (const addr of addresses) {
      addrStatus[addrKey(chain, addr)] = 'loading'
    }
  }
  return recompute({ id, label, entries, addrTokens, addrStatus, addrError })
}

export function useWallets() {
  const [wallets, setWallets] = useState([])
  const walletsRef = useRef(wallets)
  walletsRef.current = wallets

  const loadOneAddress = useCallback(async (walletId, chain, address, force = false) => {
    const key = addrKey(chain, address)
    if (!force) {
      const cached = getCached(chain, address)
      if (cached) {
        setWallets(prev => prev.map(w => {
          if (w.id !== walletId) return w
          if (!w.entries.some(e => e.chain === chain && e.addresses.includes(address))) return w
          const addrTokens = { ...w.addrTokens, [key]: cached.tokens }
          const addrStatus = { ...w.addrStatus, [key]: 'ok' }
          const addrError = { ...w.addrError }
          delete addrError[key]
          return recompute({ ...w, addrTokens, addrStatus, addrError })
        }))
        return
      }
    }

    setWallets(prev => prev.map(w => {
      if (w.id !== walletId) return w
      if (!w.entries.some(e => e.chain === chain && e.addresses.includes(address))) return w
      return recompute({ ...w, addrStatus: { ...w.addrStatus, [key]: 'loading' } })
    }))

    try {
      const tokens = await fetchBalances(chain, address)
      setCached(chain, address, tokens)
      setWallets(prev => prev.map(w => {
        if (w.id !== walletId) return w
        if (!w.entries.some(e => e.chain === chain && e.addresses.includes(address))) return w
        const addrTokens = { ...w.addrTokens, [key]: tokens }
        const addrStatus = { ...w.addrStatus, [key]: 'ok' }
        const addrError = { ...w.addrError }
        delete addrError[key]
        return recompute({ ...w, addrTokens, addrStatus, addrError })
      }))
    } catch (err) {
      setWallets(prev => prev.map(w => {
        if (w.id !== walletId) return w
        if (!w.entries.some(e => e.chain === chain && e.addresses.includes(address))) return w
        const addrStatus = { ...w.addrStatus, [key]: 'error' }
        const addrError = { ...w.addrError, [key]: err instanceof Error ? err.message : 'Unknown error' }
        return recompute({ ...w, addrStatus, addrError })
      }))
    }
  }, [])

  const loadBalances = useCallback((wallet, force = false) => {
    for (const { chain, addresses } of wallet.entries) {
      for (const address of addresses) {
        loadOneAddress(wallet.id, chain, address, force)
      }
    }
  }, [loadOneAddress])

  const addWallet = useCallback((label, entries) => {
    const wallet = makeWallet(crypto.randomUUID(), label, entries)
    setWallets(prev => [...prev, wallet])
    loadBalances(wallet)
  }, [loadBalances])

  const removeWallet = useCallback((id) => {
    setWallets(prev => prev.filter(w => w.id !== id))
  }, [])

  const updateWallet = useCallback((id, patch) => {
    const currentWallet = walletsRef.current.find(w => w.id === id)
    if (!currentWallet) return

    const existingKeys = new Set(allAddrKeys(currentWallet))
    const newEntries = patch.entries ?? currentWallet.entries

    setWallets(prev => prev.map(w => {
      if (w.id !== id) return w
      const label = patch.label !== undefined ? patch.label : w.label

      const addrTokens = {}
      const addrStatus = {}
      const addrError = {}
      for (const { chain, addresses } of newEntries) {
        for (const addr of addresses) {
          const k = addrKey(chain, addr)
          addrTokens[k] = w.addrTokens[k] ?? []
          addrStatus[k] = w.addrStatus[k] ?? 'loading'
          if (w.addrError[k]) addrError[k] = w.addrError[k]
        }
      }

      return recompute({ ...w, label, entries: newEntries, addrTokens, addrStatus, addrError })
    }))

    if (patch.entries) {
      for (const { chain, addresses } of newEntries) {
        for (const addr of addresses) {
          if (!existingKeys.has(addrKey(chain, addr))) {
            loadOneAddress(id, chain, addr, false)
          }
        }
      }
    }
  }, [loadOneAddress])

  const refreshWallet = useCallback((id) => {
    const wallet = walletsRef.current.find(w => w.id === id)
    if (wallet) loadBalances(wallet, true)
  }, [loadBalances])

  const refreshAll = useCallback(() => {
    walletsRef.current.forEach(w => loadBalances(w, true))
  }, [loadBalances])

  const importWallets = useCallback((imported) => {
    const newWallets = imported.map(w => makeWallet(w.id ?? crypto.randomUUID(), w.label, w.entries))
    setWallets(newWallets)
    newWallets.forEach(w => loadBalances(w))
  }, [loadBalances])

  return { wallets, addWallet, removeWallet, updateWallet, refreshWallet, refreshAll, importWallets }
}
```

- [ ] **Step 2: Verify the file saved correctly**

```bash
head -5 src/hooks/useWallets.js
# Expected: import { useState, useCallback, useRef } from 'react'
grep "allAddrKeys" src/hooks/useWallets.js
# Expected: at least 3 matches (definition + two uses)
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useWallets.js
git commit -m "feat: refactor useWallets for multi-chain entries model"
```

---

## Task 2: Update `walletConfig.js`

**Files:**
- Modify: `src/services/walletConfig.js`

### Context

Current file handles export (strips runtime fields) and import (normalises old `address` → `addresses`). The new `normalise()` function replaces the existing per-field normalisation and handles both old shapes (`{ chain, addresses }` or `{ chain, address }`) and the new shape (`{ entries }`).

Read the current file first: `src/services/walletConfig.js`

- [ ] **Step 1: Replace `src/services/walletConfig.js` with the updated implementation**

```js
function toBase64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
}

function fromBase64(s) {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
}

async function deriveKey(password, salt) {
  const enc = new TextEncoder()
  const raw = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    raw,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

// Normalise any wallet shape to { id, label, entries }
// Handles: new shape (entries), old shape (chain + addresses), older shape (chain + address)
function normalise(w) {
  if (w.entries) return { id: w.id, label: w.label, entries: w.entries }
  const addresses = w.addresses ?? (w.address ? [w.address] : [])
  return { id: w.id, label: w.label, entries: [{ chain: w.chain, addresses }] }
}

export async function exportConfig(wallets, history, password) {
  const config = {
    version: '1',
    exportedAt: new Date().toISOString(),
    wallets: wallets.map(({ addrTokens, addrStatus, addrError, tokens, status, errorMsg, ...w }) => w),
    history: history.length > 0 ? history : undefined,
  }
  const json = JSON.stringify(config, null, 2)

  let blob, filename

  if (password) {
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const iv   = crypto.getRandomValues(new Uint8Array(12))
    const key  = await deriveKey(password, salt)
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(json))
    const file = { '21stealth': true, v: 1, salt: toBase64(salt), iv: toBase64(iv), data: toBase64(ciphertext) }
    blob = new Blob([JSON.stringify(file)], { type: 'application/json' })
    filename = '21stealth-config.encrypted.json'
  } else {
    blob = new Blob([json], { type: 'application/json' })
    filename = '21stealth-config.json'
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function importConfig(file, password) {
  const text = await file.text()
  const parsed = JSON.parse(text)

  if (parsed['21stealth'] === true) {
    if (!password) throw new NeedsPasswordError()
    const { salt, iv, data } = parsed
    const key = await deriveKey(password, fromBase64(salt))
    let plaintext
    try {
      plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(iv) }, key, fromBase64(data))
    } catch {
      throw new Error('Wrong password')
    }
    const config = JSON.parse(new TextDecoder().decode(plaintext))
    const wallets = config.wallets.map(normalise)
    return { wallets, history: config.history }
  }

  if (parsed.version !== '1' || !Array.isArray(parsed.wallets)) throw new Error('Invalid config format')
  const wallets = parsed.wallets.map(normalise)
  return { wallets, history: parsed.history }
}

export class NeedsPasswordError extends Error {
  constructor() { super('Password required') }
}
```

- [ ] **Step 2: Verify**

```bash
grep "normalise" src/services/walletConfig.js
# Expected: 3 matches (definition + 2 uses in importConfig)
grep "w.entries" src/services/walletConfig.js
# Expected: 1 match (in normalise function)
```

- [ ] **Step 3: Commit**

```bash
git add src/services/walletConfig.js
git commit -m "feat: update walletConfig for entries model with backward compat"
```

---

## Task 3: Rewrite `WalletCard.jsx`

**Files:**
- Modify: `src/components/ui/WalletCard.jsx`

### Context

Replace the current single-chain header badge and `wallet.addresses.map(AddressSection)` with a `ChainSection` component per entry. Each `ChainSection` shows one aggregated token table (all addresses in that chain combined), matching the spec: "Token table for that chain's aggregated tokens". The chain header shows the shortened address (1 address) or "N Adressen" (multiple addresses).

- [ ] **Step 1: Replace `src/components/ui/WalletCard.jsx`**

```jsx
import { useMemo } from 'react'
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table'
import Card from './Card'

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

// Aggregate tokens from multiple addrTokens entries into one list (sum balance+usd by key)
function aggregateTokens(addresses, chain, addrTokens) {
  const map = new Map()
  for (const addr of addresses) {
    const tokens = addrTokens[`${chain}:${addr}`] ?? []
    for (const t of tokens) {
      if (map.has(t.key)) {
        const existing = map.get(t.key)
        map.set(t.key, { ...existing, balance: existing.balance + t.balance, usd: existing.usd + t.usd })
      } else {
        map.set(t.key, { ...t })
      }
    }
  }
  return [...map.values()]
}

function ChainSection({ chain, addresses, addrTokens, addrStatus, addrError, walletId, getDelta }) {
  // Derive chain-level status: loading if any loading, error if all errored, else ok
  const statuses = addresses.map(a => addrStatus[`${chain}:${a}`] ?? 'loading')
  const chainStatus = statuses.some(s => s === 'loading') ? 'loading'
    : statuses.every(s => s === 'error') ? 'error'
    : 'ok'
  const firstError = addresses.map(a => addrError[`${chain}:${a}`]).find(Boolean)
  const chainTokens = useMemo(
    () => aggregateTokens(addresses, chain, addrTokens),
    [addresses, chain, addrTokens]
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

export function WalletCard({ wallet, onRefresh, onRemove, onEdit, getDelta }) {
  const totalUsd = wallet.tokens.reduce((s, t) => s + t.usd, 0)
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

- [ ] **Step 2: Verify**

```bash
grep "ChainSection" src/components/ui/WalletCard.jsx
# Expected: 2 matches (definition + usage)
grep "wallet.chain" src/components/ui/WalletCard.jsx
# Expected: 0 matches (fully removed)
grep "wallet.addresses" src/components/ui/WalletCard.jsx
# Expected: 0 matches (fully removed)
```

- [ ] **Step 3: Start dev server and verify visually**

```bash
npm run dev
```

Open http://localhost:5173. If you have wallets already loaded (from a previous session/import), the cards should display correctly with chain sections. If no wallets, add one to verify.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/WalletCard.jsx
git commit -m "feat: WalletCard per-chain sections for multi-chain entries"
```

---

## Task 4: Rewrite `AddWalletForm.jsx`

**Files:**
- Modify: `src/components/ui/AddWalletForm.jsx`

### Context

The form now builds a list of `entries: [{chain, addresses}]`. State:
- `firstAddr` — primary input, auto-detects chain of the first entry
- `sameChainAddrs` — extra addresses within the same chain as `firstAddr` (same as today)
- `extraEntries` — additional chain entries added after the first
- `newSameAddr` / `newSameError` — input state for extra same-chain addresses
- `newChainAddr` / `newChainError` — input state for adding a new chain entry

On submit: `onAdd(label, [{chain: detectedChain, addresses: [firstAddr, ...sameChainAddrs]}, ...extraEntries])`

`onAdd` signature changes from `(label, chain, addresses)` to `(label, entries)` — matching the updated `useWallets.addWallet`.

- [ ] **Step 1: Replace `src/components/ui/AddWalletForm.jsx`**

```jsx
import { useState } from 'react'
import { detectChain } from '@utils/detectChain'
import { FormGroup, Input } from './Form'
import Button from './Button'

const CHAIN_LABELS = { eth: 'Ethereum', btc: 'Bitcoin', sol: 'Solana', ltc: 'Litecoin', doge: 'Dogecoin', trx: 'Tron' }
const CHAIN_BADGE = {
  eth: 'bg-primary text-text-inverted', btc: 'bg-accent text-text-inverted',
  sol: 'bg-info text-text-inverted',    ltc: 'bg-info text-text-inverted',
  doge: 'bg-warning text-text-inverted', trx: 'bg-danger text-text-inverted',
}
const MAX_ADDRESSES = 10

export function AddWalletForm({ onAdd }) {
  const [label, setLabel] = useState('')
  const [firstAddr, setFirstAddr] = useState('')
  const [sameChainAddrs, setSameChainAddrs] = useState([])  // extra addrs same chain as firstAddr
  const [extraEntries, setExtraEntries] = useState([])       // [{chain, addresses}] additional chains
  const [newSameAddr, setNewSameAddr] = useState('')
  const [newSameError, setNewSameError] = useState('')
  const [newChainAddr, setNewChainAddr] = useState('')
  const [newChainError, setNewChainError] = useState('')
  const [open, setOpen] = useState(false)

  const firstAddrTrimmed = firstAddr.trim()
  const detectedChain = detectChain(firstAddrTrimmed)
  const firstEntryAddrs = detectedChain ? [firstAddrTrimmed, ...sameChainAddrs] : []
  const allEntries = detectedChain
    ? [{ chain: detectedChain, addresses: firstEntryAddrs }, ...extraEntries]
    : extraEntries
  const usedChains = new Set(allEntries.map(e => e.chain))
  const atMaxSameChain = firstEntryAddrs.length >= MAX_ADDRESSES

  function handleAddSameChain() {
    const trimmed = newSameAddr.trim()
    if (!trimmed) return
    if (firstEntryAddrs.includes(trimmed)) { setNewSameError('Adresse bereits vorhanden'); return }
    const detected = detectChain(trimmed)
    if (!detected || detected !== detectedChain) {
      setNewSameError(`Ungültige Adresse oder falsche Chain (erwartet: ${detectedChain?.toUpperCase()})`)
      return
    }
    setSameChainAddrs(prev => [...prev, trimmed])
    setNewSameAddr('')
    setNewSameError('')
  }

  function handleAddChain() {
    const trimmed = newChainAddr.trim()
    if (!trimmed) return
    const detected = detectChain(trimmed)
    if (!detected) { setNewChainError('Unbekannte Adresse'); return }
    if (usedChains.has(detected)) {
      setNewChainError(`${CHAIN_LABELS[detected] ?? detected} bereits vorhanden — füge weitere Adressen zum bestehenden Eintrag hinzu`)
      return
    }
    setExtraEntries(prev => [...prev, { chain: detected, addresses: [trimmed] }])
    setNewChainAddr('')
    setNewChainError('')
  }

  function handleRemoveChainEntry(chain) {
    setExtraEntries(prev => prev.filter(e => e.chain !== chain))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!firstAddrTrimmed || !detectedChain) return
    onAdd(label.trim() || CHAIN_LABELS[detectedChain] || 'Wallet', allEntries)
    setLabel(''); setFirstAddr(''); setSameChainAddrs([]); setExtraEntries([])
    setNewSameAddr(''); setNewSameError(''); setNewChainAddr(''); setNewChainError('')
    setOpen(false)
  }

  function handleClose() {
    setOpen(false)
    setLabel(''); setFirstAddr(''); setSameChainAddrs([]); setExtraEntries([])
    setNewSameAddr(''); setNewSameError(''); setNewChainAddr(''); setNewChainError('')
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-secondary btn-full" style={{ borderStyle: 'dashed' }}>
        + Add wallet
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <div className="card-header">
        <span className="h5">Add wallet</span>
        <button type="button" className="btn-link text-text-muted" onClick={handleClose}>Cancel</button>
      </div>
      <div className="card-body stack stack-md">

        <FormGroup label="Label (optional)" htmlFor="wallet-label">
          <Input
            id="wallet-label"
            type="text"
            placeholder="e.g. Trust Wallet"
            value={label}
            onChange={e => setLabel(e.target.value)}
          />
        </FormGroup>

        <FormGroup label="Wallet address" htmlFor="wallet-address" required>
          <Input
            id="wallet-address"
            type="text"
            placeholder="Enter address — chain auto-detected"
            value={firstAddr}
            onChange={e => { setFirstAddr(e.target.value); setSameChainAddrs([]); setNewSameError('') }}
            required
            className="font-mono"
            iconRight={
              firstAddr.length > 0 ? (
                detectedChain
                  ? <span className="text-success text-xs font-semibold">{CHAIN_LABELS[detectedChain]}</span>
                  : <span className="text-danger text-xs font-semibold">Unknown</span>
              ) : null
            }
          />
        </FormGroup>

        {/* Extra addresses for same chain */}
        {detectedChain && !atMaxSameChain && (
          <div>
            <div className="form-label mb-2">Extra {detectedChain.toUpperCase()} addresses (optional)</div>
            <div className="stack stack-sm">
              {sameChainAddrs.map(addr => (
                <div key={addr} className="flex items-center gap-2">
                  <span className="flex-1 font-mono text-caption text-text-muted truncate">{addr}</span>
                  <button type="button" onClick={() => setSameChainAddrs(p => p.filter(a => a !== addr))} className="btn-icon text-danger">✕</button>
                </div>
              ))}
              <div>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder={`Additional ${detectedChain.toUpperCase()} address…`}
                    value={newSameAddr}
                    onChange={e => { setNewSameAddr(e.target.value); setNewSameError('') }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSameChain() } }}
                    className="font-mono flex-1"
                  />
                  <Button type="button" variant="secondary" onClick={handleAddSameChain}>+</Button>
                </div>
                {newSameError && <p className="form-error mt-1">{newSameError}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Additional chain entries */}
        {detectedChain && extraEntries.length > 0 && (
          <div>
            <div className="form-label mb-2">Weitere Chains</div>
            <div className="stack stack-sm">
              {extraEntries.map(({ chain, addresses }) => (
                <div key={chain} className="flex items-center gap-2 p-2 rounded border border-border bg-surface">
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 ${CHAIN_BADGE[chain]}`}>
                    {chain.toUpperCase()}
                  </span>
                  <span className="flex-1 font-mono text-caption text-text-muted truncate">{addresses[0]}</span>
                  <button type="button" onClick={() => handleRemoveChainEntry(chain)} className="btn-icon text-danger">✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add another chain */}
        {detectedChain && (
          <div>
            <div className="form-label mb-2">Weitere Chain hinzufügen (optional)</div>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Adresse eingeben — Chain wird erkannt…"
                value={newChainAddr}
                onChange={e => { setNewChainAddr(e.target.value); setNewChainError('') }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddChain() } }}
                className="font-mono flex-1"
              />
              <Button type="button" variant="secondary" onClick={handleAddChain}>+</Button>
            </div>
            {newChainError && <p className="form-error mt-1">{newChainError}</p>}
            <p className="text-caption text-text-muted mt-1">Unterstützt ETH, BTC, SOL, LTC, DOGE, TRX</p>
          </div>
        )}

        <Button type="submit" variant="primary" fullWidth disabled={!detectedChain}>
          {detectedChain
            ? `Add wallet (${allEntries.length} Chain${allEntries.length > 1 ? 's' : ''})`
            : 'Add wallet'}
        </Button>

      </div>
    </form>
  )
}
```

- [ ] **Step 2: Verify**

```bash
grep "extraEntries" src/components/ui/AddWalletForm.jsx | wc -l
# Expected: at least 5 (definition + uses)
grep "onAdd(label" src/components/ui/AddWalletForm.jsx
# Expected: 1 match — called with (label, allEntries)
```

- [ ] **Step 3: Test manually**

Open http://localhost:5173, click "+ Add wallet":
1. Enter an ETH address → "Ethereum" badge appears, extra-addresses section appears
2. Enter a BTC address in "Weitere Chain" → BTC entry appears in the list
3. Submit → wallet card shows ETH section + BTC section with "2 Chains" badge

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/AddWalletForm.jsx
git commit -m "feat: AddWalletForm multi-chain entries"
```

---

## Task 5: Rewrite `EditWalletModal.jsx`

**Files:**
- Modify: `src/components/ui/EditWalletModal.jsx`

### Context

The modal now manages `entries: [{chain, addresses}]` instead of a flat `addresses[]`. Per-entry, the user can add/remove addresses (same as today). They can also remove an entire chain entry (disabled if only 1 entry remains) and add a new chain entry at the bottom.

`onSave(id, { label, entries })` — matching the updated `useWallets.updateWallet`.

- [ ] **Step 1: Replace `src/components/ui/EditWalletModal.jsx`**

```jsx
import { useState, useEffect } from 'react'
import { Modal } from './Modal'
import { Input, FormGroup } from './Form'
import Button from './Button'
import { detectChain } from '@utils/detectChain'

const CHAIN_LABELS = { eth: 'Ethereum', btc: 'Bitcoin', sol: 'Solana', ltc: 'Litecoin', doge: 'Dogecoin', trx: 'Tron' }
const CHAIN_BADGE = {
  eth: 'bg-primary text-text-inverted', btc: 'bg-accent text-text-inverted',
  sol: 'bg-info text-text-inverted',    ltc: 'bg-info text-text-inverted',
  doge: 'bg-warning text-text-inverted', trx: 'bg-danger text-text-inverted',
}
const MAX_ADDRESSES = 10

export function EditWalletModal({ wallet, isOpen, onClose, onSave }) {
  const [label, setLabel] = useState('')
  const [entries, setEntries] = useState([])       // [{chain, addresses}]
  const [entryInputs, setEntryInputs] = useState({}) // {chain: {value, error}}
  const [newChainAddr, setNewChainAddr] = useState('')
  const [newChainError, setNewChainError] = useState('')

  useEffect(() => {
    if (isOpen && wallet) {
      setLabel(wallet.label)
      setEntries(wallet.entries.map(e => ({ ...e, addresses: [...e.addresses] })))
      setEntryInputs({})
      setNewChainAddr('')
      setNewChainError('')
    }
  }, [isOpen, wallet])

  const usedChains = new Set(entries.map(e => e.chain))

  function setEntryInput(chain, value) {
    setEntryInputs(prev => ({ ...prev, [chain]: { value, error: '' } }))
  }

  function setEntryError(chain, error) {
    setEntryInputs(prev => ({ ...prev, [chain]: { ...prev[chain], error } }))
  }

  function handleAddAddress(chain) {
    const value = entryInputs[chain]?.value?.trim() ?? ''
    if (!value) return
    const entry = entries.find(e => e.chain === chain)
    if (!entry) return
    if (entry.addresses.includes(value)) { setEntryError(chain, 'Adresse bereits vorhanden'); return }
    const detected = detectChain(value)
    if (!detected || detected !== chain) {
      setEntryError(chain, `Ungültige Adresse (erwartet: ${chain.toUpperCase()})`)
      return
    }
    setEntries(prev => prev.map(e => e.chain === chain ? { ...e, addresses: [...e.addresses, value] } : e))
    setEntryInput(chain, '')
  }

  function handleRemoveAddress(chain, addr) {
    const entry = entries.find(e => e.chain === chain)
    if (!entry || entry.addresses.length <= 1) return
    setEntries(prev => prev.map(e => e.chain === chain ? { ...e, addresses: e.addresses.filter(a => a !== addr) } : e))
  }

  function handleRemoveChainEntry(chain) {
    if (entries.length <= 1) return
    setEntries(prev => prev.filter(e => e.chain !== chain))
  }

  function handleAddChainEntry() {
    const trimmed = newChainAddr.trim()
    if (!trimmed) return
    const detected = detectChain(trimmed)
    if (!detected) { setNewChainError('Unbekannte Adresse'); return }
    if (usedChains.has(detected)) {
      setNewChainError(`${CHAIN_LABELS[detected] ?? detected} bereits vorhanden`)
      return
    }
    setEntries(prev => [...prev, { chain: detected, addresses: [trimmed] }])
    setNewChainAddr('')
    setNewChainError('')
  }

  function handleSave() {
    const firstEntry = entries[0]
    const fallbackLabel = firstEntry ? (CHAIN_LABELS[firstEntry.chain] ?? 'Wallet') : 'Wallet'
    onSave(wallet.id, { label: label.trim() || fallbackLabel, entries })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Wallet bearbeiten" size="md">
      <Modal.Body>
        <div className="stack stack-md">

          <FormGroup label="Label" htmlFor="edit-label">
            <Input
              id="edit-label"
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="Wallet Label"
            />
          </FormGroup>

          {/* Per-chain entry sections */}
          {entries.map(({ chain, addresses }) => {
            const input = entryInputs[chain] ?? { value: '', error: '' }
            const atMax = addresses.length >= MAX_ADDRESSES
            return (
              <div key={chain} className="border border-border rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-3 py-2 bg-surface">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${CHAIN_BADGE[chain]}`}>
                      {chain.toUpperCase()}
                    </span>
                    <span className="text-caption text-text-muted">{CHAIN_LABELS[chain]}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveChainEntry(chain)}
                    disabled={entries.length <= 1}
                    className="text-caption text-danger disabled:opacity-30 hover:underline"
                  >
                    Chain entfernen
                  </button>
                </div>
                <div className="p-3 stack stack-sm">
                  {addresses.map(addr => (
                    <div key={addr} className="flex items-center gap-2">
                      <span className="flex-1 font-mono text-caption text-text-muted truncate">{addr}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAddress(chain, addr)}
                        disabled={addresses.length <= 1}
                        className="btn-icon text-danger disabled:opacity-30"
                        title="Entfernen"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {!atMax && (
                    <div>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder={`Neue ${chain.toUpperCase()} Adresse…`}
                          value={input.value}
                          onChange={e => setEntryInput(chain, e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddAddress(chain) } }}
                          className="font-mono flex-1"
                        />
                        <Button type="button" variant="secondary" onClick={() => handleAddAddress(chain)}>+</Button>
                      </div>
                      {input.error && <p className="form-error mt-1">{input.error}</p>}
                    </div>
                  )}
                  {atMax && <p className="text-caption text-text-muted">Maximum von {MAX_ADDRESSES} Adressen erreicht</p>}
                </div>
              </div>
            )
          })}

          {/* Add new chain entry */}
          <div>
            <div className="form-label mb-2">Weitere Chain hinzufügen</div>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Adresse eingeben — Chain wird erkannt…"
                value={newChainAddr}
                onChange={e => { setNewChainAddr(e.target.value); setNewChainError('') }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddChainEntry() } }}
                className="font-mono flex-1"
              />
              <Button type="button" variant="secondary" onClick={handleAddChainEntry}>+</Button>
            </div>
            {newChainError && <p className="form-error mt-1">{newChainError}</p>}
          </div>

        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button type="button" variant="secondary" onClick={onClose}>Abbrechen</Button>
        <Button type="button" variant="primary" onClick={handleSave}>Speichern</Button>
      </Modal.Footer>
    </Modal>
  )
}
```

- [ ] **Step 2: Verify**

```bash
grep "wallet.chain" src/components/ui/EditWalletModal.jsx
# Expected: 0 matches
grep "entries" src/components/ui/EditWalletModal.jsx | wc -l
# Expected: at least 10 matches
```

- [ ] **Step 3: Test manually**

Open http://localhost:5173, add a multi-chain wallet (ETH + BTC), then click ✎:
1. Both chain sections appear with their addresses
2. Can add/remove addresses within each chain
3. Can remove a chain entry (disabled when only 1 remains)
4. Can add a new chain entry at the bottom
5. Save → card updates correctly

- [ ] **Step 4: Final commit**

```bash
git add src/components/ui/EditWalletModal.jsx
git commit -m "feat: EditWalletModal multi-chain entry management"
```
