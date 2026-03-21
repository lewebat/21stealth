# Wallet Edit & Multi-Address Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make wallets editable (label + addresses) via a modal, and support multiple addresses per wallet (same chain) at creation and edit time.

**Architecture:** Refactor the `useWallets` hook to store `addresses[]` instead of `address`, track per-address token/status data, and compute aggregated values. New `EditWalletModal` component uses the existing `Modal`. `WalletCard` renders per-address sections. `AddWalletForm` allows adding extra addresses after first valid one.

**Tech Stack:** React, Zustand (useUIStore only), Vite, Tailwind CSS, @tanstack/react-table, existing `detectChain` utility, existing `Modal` component.

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Modify | `src/hooks/useWallets.js` | Core state: address→addresses, per-addr data, aggregation, updateWallet |
| Modify | `src/services/walletConfig.js` | Import backward compat: `address` → `addresses` |
| Modify | `src/components/ui/WalletCard.jsx` | Per-address sections, edit icon, partial-error footer |
| Create | `src/components/ui/EditWalletModal.jsx` | Modal for editing label + addresses |
| Modify | `src/components/ui/AddWalletForm.jsx` | Multi-address input at creation |
| Modify | `src/components/ui/index.js` | Export EditWalletModal |
| Modify | `src/pages/DashboardPage.jsx` | Pass `onEdit` + `updateWallet` to WalletCard |

---

## Task 1: Refactor `useWallets` — data model + aggregation

**Files:**
- Modify: `src/hooks/useWallets.js`

### Context

Currently each wallet has `address: string` and flat `tokens: Token[]`. We replace this with `addresses: string[]` and per-address maps. The cache stays the same (`chain:address` key).

New wallet shape:
```js
{
  id, label, chain,
  addresses: string[],
  addrTokens: { [addr]: Token[] },
  addrStatus: { [addr]: 'loading'|'ok'|'error' },
  addrError:  { [addr]: string },
  tokens: Token[],        // aggregated
  status: 'loading'|'ok'|'error',  // aggregated
  errorMsg: string|undefined,
}
```

- [ ] **Step 1: Replace `useWallets.js` with the new implementation**

```js
import { useState, useCallback, useRef } from 'react'
import { fetchEthBalances, fetchBtcBalances, fetchSolBalances, fetchLtcBalances, fetchDogeBalances, fetchTrxBalances } from '@/services/blockchain'

const CACHE_TTL = 60_000
const cache = new Map() // key: 'chain:address' → { tokens, ts }

function cacheKey(chain, address) { return `${chain}:${address}` }

function getCached(chain, address) {
  const entry = cache.get(cacheKey(chain, address))
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(cacheKey(chain, address)); return null }
  return entry
}

function setCached(chain, address, tokens) {
  cache.set(cacheKey(chain, address), { tokens, ts: Date.now() })
}

function fetchBalances(chain, address) {
  switch (chain) {
    case 'eth':  return fetchEthBalances(address)
    case 'btc':  return fetchBtcBalances(address)
    case 'sol':  return fetchSolBalances(address)
    case 'ltc':  return fetchLtcBalances(address)
    case 'doge': return fetchDogeBalances(address)
    case 'trx':  return fetchTrxBalances(address)
  }
}

function aggregateTokens(addrTokens, addresses) {
  const map = new Map()
  for (const addr of addresses) {
    const tokens = addrTokens[addr]
    if (!tokens) continue
    for (const t of tokens) {
      const existing = map.get(t.key)
      if (!existing) {
        map.set(t.key, { ...t })
      } else {
        existing.balance += t.balance
        existing.usd += t.usd
        // metadata from first entry is kept (same chain = identical metadata)
      }
    }
  }
  return [...map.values()]
}

function aggregateStatus(addrStatus, addresses) {
  const statuses = addresses.map(a => addrStatus[a] ?? 'loading')
  if (statuses.some(s => s === 'loading')) return 'loading'
  if (statuses.some(s => s === 'error')) return 'error'
  return 'ok'
}

function aggregateErrorMsg(addrStatus, addresses) {
  const errCount = addresses.filter(a => addrStatus[a] === 'error').length
  if (errCount === 0) return undefined
  return `${errCount} von ${addresses.length} Adressen konnten nicht geladen werden`
}

function recompute(wallet) {
  return {
    ...wallet,
    tokens: aggregateTokens(wallet.addrTokens, wallet.addresses),
    status: aggregateStatus(wallet.addrStatus, wallet.addresses),
    errorMsg: aggregateErrorMsg(wallet.addrStatus, wallet.addresses),
  }
}

function makeWallet(id, label, chain, addresses) {
  const addrStatus = Object.fromEntries(addresses.map(a => [a, 'loading']))
  const addrTokens = {}
  const addrError = {}
  return recompute({ id, label, chain, addresses, addrTokens, addrStatus, addrError })
}

export function useWallets() {
  const [wallets, setWallets] = useState([])
  // walletsRef gives loadOneAddress access to current wallets without stale closure
  const walletsRef = useRef(wallets)
  walletsRef.current = wallets

  const loadOneAddress = useCallback(async (walletId, chain, address, force = false) => {
    if (!force) {
      const cached = getCached(chain, address)
      if (cached) {
        setWallets(prev => prev.map(w => {
          if (w.id !== walletId || !w.addresses.includes(address)) return w
          const addrTokens = { ...w.addrTokens, [address]: cached.tokens }
          const addrStatus = { ...w.addrStatus, [address]: 'ok' }
          const addrError = { ...w.addrError }
          delete addrError[address]
          return recompute({ ...w, addrTokens, addrStatus, addrError })
        }))
        return
      }
    }

    setWallets(prev => prev.map(w => {
      if (w.id !== walletId || !w.addresses.includes(address)) return w
      return recompute({ ...w, addrStatus: { ...w.addrStatus, [address]: 'loading' } })
    }))

    try {
      const tokens = await fetchBalances(chain, address)
      setCached(chain, address, tokens)
      setWallets(prev => prev.map(w => {
        if (w.id !== walletId || !w.addresses.includes(address)) return w
        const addrTokens = { ...w.addrTokens, [address]: tokens }
        const addrStatus = { ...w.addrStatus, [address]: 'ok' }
        const addrError = { ...w.addrError }
        delete addrError[address]
        return recompute({ ...w, addrTokens, addrStatus, addrError })
      }))
    } catch (err) {
      setWallets(prev => prev.map(w => {
        if (w.id !== walletId || !w.addresses.includes(address)) return w
        const addrStatus = { ...w.addrStatus, [address]: 'error' }
        const addrError = { ...w.addrError, [address]: err instanceof Error ? err.message : 'Unknown error' }
        return recompute({ ...w, addrStatus, addrError })
      }))
    }
  }, [])

  const loadBalances = useCallback((wallet, force = false) => {
    for (const address of wallet.addresses) {
      loadOneAddress(wallet.id, wallet.chain, address, force)
    }
  }, [loadOneAddress])

  const addWallet = useCallback((label, chain, addresses) => {
    const wallet = makeWallet(crypto.randomUUID(), label, chain, addresses)
    setWallets(prev => [...prev, wallet])
    loadBalances(wallet)
  }, [loadBalances])

  const removeWallet = useCallback((id) => {
    setWallets(prev => prev.filter(w => w.id !== id))
  }, [])

  const updateWallet = useCallback((id, patch) => {
    // Capture current addresses before update to detect new ones
    const currentWallet = walletsRef.current.find(w => w.id === id)
    if (!currentWallet) return
    const existingAddrs = new Set(currentWallet.addresses)

    setWallets(prev => prev.map(w => {
      if (w.id !== id) return w
      const newAddresses = patch.addresses ? [...new Set(patch.addresses)] : w.addresses
      if (newAddresses.length === 0) throw new Error('At least one address required')
      const label = patch.label !== undefined ? patch.label : w.label

      const addrTokens = {}
      const addrStatus = {}
      const addrError = {}
      for (const addr of newAddresses) {
        addrTokens[addr] = w.addrTokens[addr] ?? []
        addrStatus[addr] = w.addrStatus[addr] ?? 'loading'
        if (w.addrError[addr]) addrError[addr] = w.addrError[addr]
      }

      return recompute({ ...w, label, addresses: newAddresses, addrTokens, addrStatus, addrError })
    }))

    // Load balances for newly added addresses only
    if (patch.addresses) {
      const newAddrs = patch.addresses.filter(a => !existingAddrs.has(a))
      for (const addr of newAddrs) {
        loadOneAddress(id, currentWallet.chain, addr, false)
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
    const newWallets = imported.map(w => makeWallet(w.id ?? crypto.randomUUID(), w.label, w.chain, w.addresses))
    setWallets(newWallets)
    newWallets.forEach(w => loadBalances(w))
  }, [loadBalances])

  return { wallets, addWallet, removeWallet, updateWallet, refreshWallet, refreshAll, importWallets }
}
```

- [ ] **Step 2: Verify the app still loads in browser**

```bash
npm run dev
```

Open http://localhost:5173 — dashboard should render without errors. Adding a wallet should still work (you'll update `AddWalletForm` in Task 5 to pass `addresses[]`, but for now the old form will break — that's fine, fix forward).

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useWallets.js
git commit -m "feat: refactor useWallets for multi-address support"
```

---

## Task 2: Update `walletConfig` — import backward compat

**Files:**
- Modify: `src/services/walletConfig.js`

- [ ] **Step 1: Update `exportConfig` to write `addresses`**

In `exportConfig` (line 22), the `wallets` array is serialised directly. No change needed there — wallet objects already use `addresses[]` after Task 1. However, to avoid carrying the old `address` field in exports, strip it explicitly in the config object:

```js
// In exportConfig, replace the config line (around line 22):
const config = {
  version: '1',
  exportedAt: new Date().toISOString(),
  wallets: wallets.map(({ addrTokens, addrStatus, addrError, tokens, status, errorMsg, ...w }) => w),
  history: history.length > 0 ? history : undefined,
}
```

This strips runtime-only fields (`addrTokens`, `addrStatus`, `addrError`, `tokens`, `status`, `errorMsg`) from the export, keeping only the persisted shape: `{ id, label, chain, addresses }`.

- [ ] **Step 2: Update `importConfig` — backward compat for old `address` field**

In `importConfig`, normalise each wallet after parsing so old exports with `address: string` are converted to `addresses: [address]`:

```js
// encrypted path — replace the return (around line 63):
const config = JSON.parse(new TextDecoder().decode(plaintext))
const wallets = config.wallets.map(w => ({ ...w, addresses: w.addresses ?? (w.address ? [w.address] : []) }))
return { wallets, history: config.history }

// plain path — replace the return (around line 67):
const wallets = parsed.wallets.map(w => ({ ...w, addresses: w.addresses ?? (w.address ? [w.address] : []) }))
return { wallets, history: parsed.history }
```

- [ ] **Step 3: Commit**

```bash
git add src/services/walletConfig.js
git commit -m "feat: import backward compat for address → addresses"
```

---

## Task 3: Update `WalletCard` — per-address display + edit icon

**Files:**
- Modify: `src/components/ui/WalletCard.jsx`

### Context

Replace the current single-address line and flat token table with per-address sections. Each section shows the shortened address, then its token table (or loading/error/empty state). Footer shows aggregated total with `*` if partial error.

- [ ] **Step 1: Rewrite `WalletCard.jsx`**

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

function AddressSection({ address, tokens, status, errorMsg, walletId, getDelta }) {
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
    data: tokens ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
    autoResetPageIndex: false,
  })

  return (
    <div className="border-t border-border">
      <div className="px-3 pt-2 pb-1">
        <span className="text-caption font-mono text-text-subtle">{shorten(address)}</span>
      </div>
      {status === 'loading' && (
        <div className="px-3 pb-2"><div className="skeleton h-4 w-24" /></div>
      )}
      {status === 'error' && (
        <div className="px-3 pb-2 form-error">{errorMsg ?? 'Error'}</div>
      )}
      {status === 'ok' && (
        tokens?.length === 0 ? (
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

export function WalletCard({ wallet, onRefresh, onRemove, onEdit, getDelta, className = '' }) {
  const totalUsd = wallet.tokens.reduce((s, t) => s + t.usd, 0)
  const isPartialError = wallet.status === 'error' &&
    wallet.addresses.some(a => wallet.addrStatus[a] === 'ok')

  return (
    <Card className={`h-full flex flex-col`}>
      <Card.Header>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 ${CHAIN_BADGE[wallet.chain]}`}>
            {wallet.chain.toUpperCase()}
          </span>
          <span className="text-body font-semibold truncate">{wallet.label}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onEdit}
            title="Bearbeiten"
            className="btn-icon text-text-muted hover:text-text"
          >
            ✎
          </button>
          <button
            onClick={onRefresh}
            disabled={wallet.status === 'loading'}
            title="Refresh"
            className="btn-icon text-text-muted hover:text-text disabled:opacity-40"
          >
            {wallet.status === 'loading' ? '…' : '↻'}
          </button>
          <button onClick={onRemove} title="Remove" className="btn-icon text-text-subtle hover:text-danger">
            ✕
          </button>
        </div>
      </Card.Header>

      {wallet.addresses.map(addr => (
        <AddressSection
          key={addr}
          address={addr}
          tokens={wallet.addrTokens[addr]}
          status={wallet.addrStatus[addr] ?? 'loading'}
          errorMsg={wallet.addrError[addr]}
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

- [ ] **Step 2: Verify visually**

Open http://localhost:5173 — wallet cards should show per-address sections. Edit icon (✎) appears in header (modal doesn't work yet — that's Task 4).

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/WalletCard.jsx
git commit -m "feat: WalletCard per-address sections and edit icon"
```

---

## Task 4: Create `EditWalletModal`

**Files:**
- Create: `src/components/ui/EditWalletModal.jsx`
- Modify: `src/components/ui/index.js`

- [ ] **Step 1: Create `EditWalletModal.jsx`**

```jsx
import { useState, useEffect } from 'react'
import { Modal } from './Modal'
import { Input, FormGroup } from './Form'
import Button from './Button'
import { detectChain } from '@utils/detectChain'

const CHAIN_LABELS = { eth: 'Ethereum', btc: 'Bitcoin', sol: 'Solana', ltc: 'Litecoin', doge: 'Dogecoin', trx: 'Tron' }
const MAX_ADDRESSES = 10

export function EditWalletModal({ wallet, isOpen, onClose, onSave }) {
  const [label, setLabel] = useState('')
  const [addresses, setAddresses] = useState([])
  const [newAddr, setNewAddr] = useState('')
  const [addrError, setAddrError] = useState('')

  // Sync state from wallet prop whenever modal opens
  useEffect(() => {
    if (isOpen && wallet) {
      setLabel(wallet.label)
      setAddresses(wallet.addresses)
      setNewAddr('')
      setAddrError('')
    }
  }, [isOpen, wallet])

  function handleAddAddress() {
    const trimmed = newAddr.trim()
    if (!trimmed) return
    if (addresses.includes(trimmed)) {
      setAddrError('Adresse bereits vorhanden')
      return
    }
    const detected = detectChain(trimmed)
    if (!detected || detected !== wallet.chain) {
      setAddrError(`Ungültige Adresse oder falsche Chain (erwartet: ${wallet.chain.toUpperCase()})`)
      return
    }
    setAddresses(prev => [...prev, trimmed])
    setNewAddr('')
    setAddrError('')
  }

  function handleRemoveAddress(addr) {
    if (addresses.length <= 1) return
    setAddresses(prev => prev.filter(a => a !== addr))
  }

  function handleSave() {
    onSave(wallet.id, { label: label.trim() || CHAIN_LABELS[wallet.chain], addresses })
    // onSave handler in DashboardPage calls setEditingWallet(null) which closes the modal
    // do NOT call onClose() here to avoid double state update
  }

  const atMax = addresses.length >= MAX_ADDRESSES

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Wallet bearbeiten"
      size="md"
    >
      <Modal.Body>
        <div className="stack stack-md">
          <FormGroup label="Label" htmlFor="edit-label">
            <Input
              id="edit-label"
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder={CHAIN_LABELS[wallet?.chain] ?? ''}
            />
          </FormGroup>

          <div>
            <div className="form-label mb-2">
              Adressen ({wallet?.chain?.toUpperCase()})
            </div>
            <div className="stack stack-sm">
              {addresses.map(addr => (
                <div key={addr} className="flex items-center gap-2">
                  <span className="flex-1 font-mono text-caption text-text-muted truncate">{addr}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAddress(addr)}
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
                      placeholder="Neue Adresse hinzufügen…"
                      value={newAddr}
                      onChange={e => { setNewAddr(e.target.value); setAddrError('') }}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddAddress() } }}
                      className="font-mono flex-1"
                    />
                    <Button type="button" variant="secondary" onClick={handleAddAddress}>+</Button>
                  </div>
                  {addrError && <p className="form-error mt-1">{addrError}</p>}
                </div>
              )}
              {atMax && (
                <p className="text-caption text-text-muted">Maximum von {MAX_ADDRESSES} Adressen erreicht</p>
              )}
            </div>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Abbrechen</Button>
        <Button variant="primary" onClick={handleSave}>Speichern</Button>
      </Modal.Footer>
    </Modal>
  )
}
```

- [ ] **Step 2: Export from index**

In `src/components/ui/index.js`, add:

```js
export { EditWalletModal } from './EditWalletModal'
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/EditWalletModal.jsx src/components/ui/index.js
git commit -m "feat: add EditWalletModal component"
```

---

## Task 5: Update `AddWalletForm` — multi-address support

**Files:**
- Modify: `src/components/ui/AddWalletForm.jsx`

- [ ] **Step 1: Rewrite `AddWalletForm.jsx`**

```jsx
import { useState } from 'react'
import { detectChain } from '@utils/detectChain'
import { FormGroup, Input } from './Form'
import Button from './Button'

const CHAIN_LABELS = { eth: 'Ethereum', btc: 'Bitcoin', sol: 'Solana', ltc: 'Litecoin', doge: 'Dogecoin', trx: 'Tron' }
const MAX_ADDRESSES = 10

export function AddWalletForm({ onAdd }) {
  const [label, setLabel] = useState('')
  const [addresses, setAddresses] = useState([]) // confirmed addresses
  const [firstAddr, setFirstAddr] = useState('')  // the primary input
  const [newAddr, setNewAddr] = useState('')       // extra address input
  const [addrError, setAddrError] = useState('')
  const [open, setOpen] = useState(false)

  const detectedChain = detectChain(firstAddr)
  const allAddresses = detectedChain ? [firstAddr.trim(), ...addresses] : addresses

  function handleAddExtra() {
    const trimmed = newAddr.trim()
    if (!trimmed) return
    if (allAddresses.includes(trimmed)) {
      setAddrError('Adresse bereits vorhanden')
      return
    }
    const detected = detectChain(trimmed)
    if (!detected || detected !== detectedChain) {
      setAddrError(`Ungültige Adresse oder falsche Chain (erwartet: ${detectedChain?.toUpperCase()})`)
      return
    }
    setAddresses(prev => [...prev, trimmed])
    setNewAddr('')
    setAddrError('')
  }

  function handleRemoveExtra(addr) {
    setAddresses(prev => prev.filter(a => a !== addr))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!firstAddr.trim() || !detectedChain) return
    onAdd(label.trim() || CHAIN_LABELS[detectedChain], detectedChain, allAddresses)
    setLabel('')
    setFirstAddr('')
    setAddresses([])
    setNewAddr('')
    setAddrError('')
    setOpen(false)
  }

  function handleClose() {
    setOpen(false)
    setLabel('')
    setFirstAddr('')
    setAddresses([])
    setNewAddr('')
    setAddrError('')
  }

  const atMax = allAddresses.length >= MAX_ADDRESSES

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-secondary btn-full" style={{ borderStyle: 'dashed' }}>
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
            placeholder="e.g. Cold Storage"
            value={label}
            onChange={e => setLabel(e.target.value)}
          />
        </FormGroup>

        <FormGroup label="Wallet address" htmlFor="wallet-address" required>
          <Input
            id="wallet-address"
            type="text"
            placeholder="Enter address"
            value={firstAddr}
            onChange={e => { setFirstAddr(e.target.value); setAddresses([]); setAddrError('') }}
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

        {detectedChain && !atMax && (
          <div>
            <div className="form-label mb-2">Extra addresses (same chain, optional)</div>
            <div className="stack stack-sm">
              {addresses.map(addr => (
                <div key={addr} className="flex items-center gap-2">
                  <span className="flex-1 font-mono text-caption text-text-muted truncate">{addr}</span>
                  <button type="button" onClick={() => handleRemoveExtra(addr)} className="btn-icon text-danger">✕</button>
                </div>
              ))}
              <div>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder={`Additional ${detectedChain.toUpperCase()} address…`}
                    value={newAddr}
                    onChange={e => { setNewAddr(e.target.value); setAddrError('') }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddExtra() } }}
                    className="font-mono flex-1"
                  />
                  <Button type="button" variant="secondary" onClick={handleAddExtra}>+</Button>
                </div>
                {addrError && <p className="form-error mt-1">{addrError}</p>}
              </div>
            </div>
          </div>
        )}
        {atMax && detectedChain && (
          <p className="text-caption text-text-muted">Maximum von {MAX_ADDRESSES} Adressen erreicht</p>
        )}

        <Button type="submit" variant="primary" fullWidth disabled={!detectedChain}>
          {detectedChain ? `Add ${CHAIN_LABELS[detectedChain]} wallet` : 'Add wallet'}
        </Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/AddWalletForm.jsx
git commit -m "feat: AddWalletForm multi-address support"
```

---

## Task 6: Wire up `DashboardPage` + final integration

**Files:**
- Modify: `src/pages/DashboardPage.jsx`

- [ ] **Step 1: Add edit modal state and wire up WalletCard**

```jsx
import { useEffect, useState } from 'react'
import { useWallets } from '@hooks/useWallets'
import { useHistory } from '@hooks/useHistory'
import { getPrices } from '@/services/prices'
import { TotalBar, PortfolioSummary, HistoryChart, WalletCard, AddWalletForm, ConfigActions, EditWalletModal } from '@ui'
import { Container, Grid } from '@layout'

export default function DashboardPage() {
  const { wallets, addWallet, removeWallet, updateWallet, refreshWallet, refreshAll, importWallets } = useWallets()
  const { history, saveSnapshot, loadHistory, getDelta } = useHistory()
  const [prices, setPrices] = useState(null)
  const [editingWallet, setEditingWallet] = useState(null)

  useEffect(() => {
    getPrices().then(setPrices).catch(() => {})
  }, [])

  useEffect(() => {
    const anyLoading = wallets.some(w => w.status === 'loading' || w.status === 'idle')
    const anyLoaded  = wallets.some(w => w.status === 'ok')
    if (!anyLoading && anyLoaded) saveSnapshot(wallets)
  }, [wallets, saveSnapshot])

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
              <TotalBar wallets={wallets} onRefreshAll={refreshAll} />
            </Grid.Col>
            <Grid.Col span="two-thirds">
              <PortfolioSummary wallets={wallets} getDelta={getDelta} />
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
                  onRefresh={() => refreshWallet(wallet.id)}
                  onRemove={() => removeWallet(wallet.id)}
                  onEdit={() => setEditingWallet(wallet)}
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
          isOpen={!!editingWallet}
          onClose={() => setEditingWallet(null)}
          onSave={(id, patch) => { updateWallet(id, patch); setEditingWallet(null) }}
          // Note: onSave closes the modal by setting editingWallet to null.
          // EditWalletModal.handleSave does NOT call onClose() to avoid double setState.
        />
      )}

    </Container>
  )
}
```

- [ ] **Step 2: Verify full flow in browser**

Open http://localhost:5173:
1. Add a wallet → form shows "Extra addresses" section after first valid address
2. Wallet card shows per-address sections with edit icon ✎
3. Click ✎ → modal opens with label + address list
4. Add/remove addresses in modal, save → card updates
5. Partial error case: if one address fails, footer shows `$X.XX *`

- [ ] **Step 3: Final commit + push**

```bash
git add src/pages/DashboardPage.jsx
git commit -m "feat: wire up EditWalletModal in DashboardPage"
git push origin main
```
