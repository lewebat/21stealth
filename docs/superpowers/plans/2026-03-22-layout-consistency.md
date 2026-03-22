# Layout Consistency Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the layout pattern `card → card-header → card-body → card-footer` consistent across the entire app — no raw `.card` divs with inline padding, no spacing utilities on container elements.

**Architecture:** Every card-like container uses the `<Card>` React component and its subcomponents (`Card.Header`, `Card.Body`, `Card.Footer`). Container padding comes exclusively from CSS classes. Inline Tailwind padding utilities (`px-*`, `py-*`, `p-*`) are only allowed on inner layout elements (not on the card sections themselves). The `chain-badge` CSS class replaces all inline badge styling across the app.

**Tech Stack:** React, Tailwind CSS, custom design system (`card`, `card-header`, `card-body`, `card-footer`, `chain-badge` CSS classes). No test framework — manual visual verification in browser.

---

## File Map

| Action | File | Change |
|--------|------|--------|
| Modify | `src/components/ui/TotalBar.jsx` | Replace raw `.card` divs with `<Card>/<Card.Header>/<Card.Body>` |
| Modify | `src/components/ui/AddWalletForm.jsx` | Replace raw `.card` divs with `<Card>/<Card.Header>/<Card.Body>`, use `chain-badge` class |
| Modify | `src/components/ui/EditWalletModal.jsx` | Add CSS classes for chain-entry sections, use `chain-badge` class |
| Modify | `src/styles/components/cards.css` | Add `.chain-entry-header` and `.chain-entry-body` CSS classes |
| Modify | `src/components/ui/HistoryChart.jsx` | Restructure to `Card.Header` + `Card.Body`, remove `mb-4`/`mt-4`/`-mx-1` |
| Modify | `src/pages/DashboardPage.jsx` | Replace empty-state raw `.card` div with `<Card>/<Card.Body>` |

---

### Task 1: TotalBar — swap raw divs to Card component

**Files:**
- Modify: `src/components/ui/TotalBar.jsx`

**Context:** Currently uses `<div class="card">/<div class="card-header">/<div class="card-body">` directly. Replace with the `<Card>` component imported from `./Card`.

- [ ] **Step 1: Rewrite TotalBar.jsx**

```jsx
import Card from './Card'
import Button from './Button'
import { tokenUsd } from '@/utils/tokenUsd'

export function TotalBar({ wallets, prices, onRefreshAll }) {
  const total = wallets.reduce(
    (sum, w) => sum + w.tokens.reduce((s, t) => s + tokenUsd(t, prices), 0),
    0
  )

  return (
    <Card>
      <Card.Header>
        <span className="text-label text-text-subtle">Total Portfolio</span>
        <Button variant="ghost" size="xs" onClick={onRefreshAll}>Refresh all</Button>
      </Card.Header>
      <Card.Body>
        <div className="h2">
          ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </Card.Body>
    </Card>
  )
}
```

- [ ] **Step 2: Verify visually**

Run `npm run dev`, open dashboard. TotalBar must look identical to before — same spacing, same font, same button.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/TotalBar.jsx
git commit -m "refactor: TotalBar uses Card component instead of raw div"
```

---

### Task 2: AddWalletForm — swap raw divs to Card component + chain-badge

**Files:**
- Modify: `src/components/ui/AddWalletForm.jsx`

**Context:** `<form className="card">` wraps raw card-header/card-body divs. Wrap `<Card>` inside the form instead. Also: chain entry list items use `text-xs font-bold px-1.5 py-0.5 rounded shrink-0` — replace with `chain-badge` class (already defined in `cards.css`).

- [ ] **Step 1: Rewrite the return block of AddWalletForm.jsx**

Also add `import Card from './Card'` at the top of the file alongside the other imports.

Replace everything from `if (!open)` to the end of the function with:

```jsx
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-secondary btn-full" style={{ borderStyle: 'dashed' }}>
        + Add wallet
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <Card.Header>
          <span className="h5">Add wallet</span>
          <button type="button" className="btn-link text-text-muted" onClick={handleClose}>Cancel</button>
        </Card.Header>
        <Card.Body className="stack stack-md">

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
          {detectedChain && (sameChainAddrs.length > 0 || !atMaxSameChain) && (
            <div>
              <div className="form-label mb-2">Extra {detectedChain.toUpperCase()} addresses (optional)</div>
              <div className="stack stack-sm">
                {sameChainAddrs.map(addr => (
                  <div key={addr} className="flex items-center gap-2">
                    <span className="flex-1 font-mono text-caption text-text-muted truncate">{addr}</span>
                    <button type="button" onClick={() => setSameChainAddrs(p => p.filter(a => a !== addr))} className="btn-icon text-danger">✕</button>
                  </div>
                ))}
                {!atMaxSameChain ? (
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
                ) : (
                  <p className="text-caption text-text-muted">Maximum of 10 addresses reached</p>
                )}
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
                    <span className={`chain-badge ${CHAIN_BADGE[chain]}`}>
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

        </Card.Body>
      </Card>
    </form>
  )
```

Also add `import Card from './Card'` at the top. Remove the `CHAIN_BADGE` map entries for `px-1.5 py-0.5 rounded shrink-0 text-xs font-bold` — keep only the color classes since `chain-badge` handles the rest. The `CHAIN_BADGE` map stays as-is (it only has color classes already).

- [ ] **Step 2: Verify visually**

Open dashboard, click "Add wallet". Form must look identical. Add a wallet with multiple chains, verify badge styling.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/AddWalletForm.jsx
git commit -m "refactor: AddWalletForm uses Card component, chain-badge class"
```

---

### Task 3: EditWalletModal — CSS classes for chain-entry sections + chain-badge

**Files:**
- Modify: `src/styles/components/cards.css`
- Modify: `src/components/ui/EditWalletModal.jsx`

**Context:** Each chain entry inside the modal is a bordered mini-section with a header (`px-3 py-2 bg-surface`) and a body (`p-3`). Extract these to CSS classes so JSX has no inline padding. Also use `chain-badge` class.

- [ ] **Step 1: Add CSS classes to cards.css**

Append to `src/styles/components/cards.css`:

```css
/* ── Chain entry (used in EditWalletModal) ───────────── */
.chain-entry {
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  overflow: hidden;
}

.chain-entry-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.75rem;
  background-color: var(--color-surface);
}

.chain-entry-body {
  padding: 0.75rem;
}
```

- [ ] **Step 2: Update EditWalletModal.jsx**

Replace the chain entry `div` block (inside `entries.map`) with:

```jsx
<div key={chain} className="chain-entry">
  <div className="chain-entry-header">
    <div className="flex items-center gap-2">
      <span className={`chain-badge ${CHAIN_BADGE[chain]}`}>
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
  <div className="chain-entry-body stack stack-sm">
    {addresses.map((addr, i) => (
      <div key={`${addr}-${i}`} className="flex items-center gap-2">
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
    {!atMax ? (
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
    ) : (
      <p className="text-caption text-text-muted">Maximum von {MAX_ADDRESSES} Adressen erreicht</p>
    )}
  </div>
</div>
```

- [ ] **Step 3: Verify visually**

Open dashboard, click edit on a wallet. Chain entry sections must look identical. Verify badge size matches WalletCard badges.

- [ ] **Step 4: Commit**

```bash
git add src/styles/components/cards.css src/components/ui/EditWalletModal.jsx
git commit -m "refactor: EditWalletModal uses chain-entry CSS classes and chain-badge"
```

---

### Task 4: HistoryChart — restructure to Card.Header + Card.Body

**Files:**
- Modify: `src/components/ui/HistoryChart.jsx`

**Context:** Currently everything is stuffed into one `<Card.Body>` with `mb-4` and `mt-4` spacing utilities providing structure. Split into `Card.Header` (value + delta + toggle button) and `Card.Body` (chart + wallet switcher). Remove `mb-4`, `mt-4`, `-mx-1`.

- [ ] **Step 1: Rewrite the return block of HistoryChart.jsx**

```jsx
  return (
    <Card>
      <Card.Header>
        <div>
          <div className="h2">{formatUsd(currentValue)}</div>
          <div className={`text-caption font-mono mt-0.5 ${totalDelta >= 0 ? 'text-success' : 'text-danger'}`}>
            {totalDelta >= 0 ? '+' : ''}{formatUsd(totalDelta)}
            <span className="ml-1 text-xs">
              ({totalDeltaPct >= 0 ? '+' : ''}{totalDeltaPct.toFixed(2)}%)
            </span>
            <span className="text-text-subtle ml-1 font-sans">since {history[0].date}</span>
          </div>
        </div>
        <Button
          variant={volatileOnly ? 'accent' : 'ghost'}
          size="sm"
          onClick={() => setVolatileOnly((v) => !v)}
        >
          {volatileOnly ? 'Include stablecoins' : 'Exclude stablecoins'}
        </Button>
      </Card.Header>
      <Card.Body>
        <div className="h-40 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: colors['text-subtle'], fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis domain={[min * 0.998, max * 1.002]} tick={{ fill: colors['text-subtle'], fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatUsd} width={60} />
              <Tooltip
                contentStyle={{ backgroundColor: colors['surface-elevated'], border: `1px solid ${colors.border}`, borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: colors['text-muted'] }}
                itemStyle={{ color }}
                formatter={(value) => [formatUsd(Number(value)), 'Value']}
              />
              <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill="url(#chartGradient)" dot={false} activeDot={{ r: 4, fill: color, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-2 pt-4">
          <button
            onClick={() => setSelected('total')}
            className={selected === 'total' ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
          >
            Total
          </button>
          {loadedWallets.map((wallet) => (
            <button
              key={wallet.id}
              onClick={() => setSelected(wallet.id)}
              className={selected === wallet.id ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
            >
              {wallet.label}
            </button>
          ))}
        </div>
      </Card.Body>
    </Card>
  )
```

Note: `pt-4` on the wallet switcher div is spacing *between elements inside* Card.Body — this is acceptable (it's not container padding). This is a deliberate change from the original `mt-4` (margin) to `pt-4` (padding) — the visual result is identical when there is no border, but `pt-4` is semantically cleaner for internal element spacing.

- [ ] **Step 2: Verify visually**

Check that the chart card renders correctly: header with value/delta on left and button on right, chart below, wallet switcher at bottom. The chart will no longer bleed edge-to-edge — `Card.Body` padding now provides the horizontal margin. This is intentional, not a regression. The chart must render without errors and fill the `h-40` container height.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/HistoryChart.jsx
git commit -m "refactor: HistoryChart uses Card.Header + Card.Body, removes inline spacing utilities"
```

---

### Task 5: DashboardPage — empty state uses Card component

**Files:**
- Modify: `src/pages/DashboardPage.jsx`

**Context:** The empty state uses `<div class="card"><div class="card-body flex flex-col items-center py-24 ...">`. Replace with `<Card>/<Card.Body>`. Move `py-24` to an inner div so Card.Body keeps its standard padding and the inner content gets the extra vertical space.

- [ ] **Step 1: Update the empty state block in DashboardPage.jsx**

First, add `Card` to the existing `@ui` import line at the top of the file. Change:

```js
import { TotalBar, PortfolioSummary, HistoryChart, WalletCard, AddWalletForm, ConfigActions, EditWalletModal, PriceTicker } from '@ui'
```

To:

```js
import { TotalBar, PortfolioSummary, HistoryChart, WalletCard, AddWalletForm, ConfigActions, EditWalletModal, PriceTicker, Card } from '@ui'
```

Then find the empty state block and replace:

```jsx
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
```

With:

```jsx
<Card>
  <Card.Body>
    <div className="flex flex-col items-center py-24 gap-4 text-center">
      <div className="text-display">🔒</div>
      <p className="h4">No wallets yet</p>
      <p className="text-body text-text-muted">Add a wallet address or import your config.</p>
      <div className="w-full max-w-sm">
        <AddWalletForm onAdd={addWallet} />
      </div>
    </div>
  </Card.Body>
</Card>
```

Make sure `Card` is imported in DashboardPage.jsx. Check existing imports at the top of the file.

- [ ] **Step 2: Verify visually**

Remove all wallets (or test with empty state), verify the centered empty state still looks correct with the lock emoji and text.

- [ ] **Step 3: Commit**

```bash
git add src/pages/DashboardPage.jsx
git commit -m "refactor: DashboardPage empty state uses Card component"
```

---

### Task 6: Push

- [ ] **Step 1: Push all commits**

```bash
git push
```
