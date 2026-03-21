# Multi-Chain Wallet — Design Spec

**Date:** 2026-03-21
**Status:** Approved

## Goal

Allow a single wallet card to contain addresses from multiple chains (e.g. a "Trust Wallet" with ETH, BTC and SOL addresses). Each chain entry can have one or more addresses. The card aggregates all balances into one total.

## Data Model

Replace `wallet.chain` (string) and `wallet.addresses` (string[]) with `wallet.entries` (array of chain+addresses pairs). All other runtime fields remain, but the cache key for per-address data changes from `address` to `chain:address` to prevent collisions.

**New wallet shape:**

```js
{
  id: string,
  label: string,
  entries: [
    { chain: 'eth', addresses: ['0x...', '0x...'] },
    { chain: 'btc', addresses: ['bc1q...'] },
    { chain: 'sol', addresses: ['7xKp...'] },
  ],
  // Runtime fields — key is `chain:address`
  addrTokens: { 'eth:0x...': Token[], 'btc:bc1q...': Token[] },
  addrStatus:  { 'eth:0x...': 'loading' | 'ok' | 'error' },
  addrError:   { 'eth:0x...': string },
  // Aggregated across all chains and addresses
  tokens: Token[],
  status: 'loading' | 'ok' | 'error',
  errorMsg: string | undefined,
}
```

**Token aggregation:** Tokens with the same `key` (e.g. `usdc`) across different chains are summed. This is correct for portfolio tracking — total USDC value regardless of chain.

**Constraints:**
- A wallet must have at least 1 entry with at least 1 address
- The same chain can appear only once per wallet (multiple addresses for the same chain go inside one entry's `addresses[]`)
- Each chain in `entries` must be one of: `eth`, `btc`, `sol`, `ltc`, `doge`, `trx`

## `useWallets` Hook

The hook is refactored to work with `entries` instead of `chain` + `addresses`:

- `makeWallet(id, label, entries)` — initialises addrTokens/addrStatus/addrError keyed by `chain:address`
- `loadOneAddress(walletId, chain, address, force)` — unchanged logic, uses `chain:address` key
- `loadBalances(wallet, force)` — iterates all entries and all their addresses
- `addWallet(label, entries)` — entries is `[{ chain, addresses }]`
- `updateWallet(id, patch)` — patch can include `{ label, entries }`. New chain:address pairs are loaded, removed ones are dropped from state
- `importWallets(imported)` — same as today, works with normalised shape

Helper: `addrKey(chain, address)` → `'chain:address'` — used consistently throughout the hook.

## `walletConfig.js`

**Export:** Strip runtime fields as today. Persist `entries` instead of `chain`/`addresses`.

**Import backward compat:** Old configs with `chain` + `addresses` are normalised to `entries: [{ chain, addresses }]`. New configs with `entries` are used as-is.

```js
// normalise fn applied to each wallet on import:
function normalise(w) {
  if (w.entries) return w
  return { ...w, entries: [{ chain: w.chain, addresses: w.addresses ?? (w.address ? [w.address] : []) }] }
}
```

## WalletCard

Header: wallet label + "N Chains" badge (if >1 chain) + action buttons (edit, refresh, remove).

Body: one section per chain entry, in `entries` order:
- Chain badge (e.g. `ETH`) + shortened first address (if one address) or address count (e.g. `3 Adressen`)
- Token table for that chain's aggregated tokens (same as current per-address table)
- Loading/error/empty state per chain section

Footer: total USD across all chains.

When a wallet has only 1 chain entry, it looks identical to today's single-chain card.

## AddWalletForm

**Flow:**
1. User enters first address → chain auto-detected (existing `detectChain`) → entry confirmed
2. Confirmed entries list appears below (chain badge + short address + remove button)
3. "Weitere Chain hinzufügen" input appears for additional entries
4. Each new address auto-detects its chain; if that chain already exists in entries → error "Chain bereits vorhanden, füge die Adresse zum bestehenden ETH-Eintrag hinzu"
5. Submit button shows count: "Wallet hinzufügen (3 Chains)"
6. On submit: `addWallet(label, entries)` called with all confirmed entries

**Extra addresses per chain:** The "same-chain extra address" feature from the current form is preserved within each chain entry. After confirming the first address for a chain, a sub-input for additional addresses of the same chain appears (same as today).

## EditWalletModal

- Label: editable text input
- Entries list: one section per chain
  - Within each section: list of addresses with add/remove (same as current modal)
  - "Chain entfernen" button per entry — disabled if only 1 entry remains
- "Weitere Chain hinzufügen" section at bottom: address input → auto-detect → adds new entry
- Duplicate chain validation: same error as AddWalletForm

## Implementation Notes

**`MAX_ADDRESSES` limit:** 10 addresses per chain entry (not per wallet total). Same as today — the limit applies within each `{ chain, addresses }` entry independently.

**`isPartialError` in WalletCard:** The current footer `*` indicator must be re-derived from entries: a partial error exists when at least one `chain:address` key has `addrStatus = 'error'` and at least one has `addrStatus = 'ok'`.

**`walletConfig` normalisation:** The existing `importConfig` already normalises `address → addresses`. The new normalisation (`chain+addresses → entries`) replaces and consolidates the old pass — a single `normalise(w)` function handles both old shapes in one step.

**Token metadata on cross-chain collision:** When two chains produce a token with the same `key` (e.g. `usdc`), metadata (symbol, name) from the first occurrence is kept. USD value is summed. This matches the existing same-chain behaviour and is correct for portfolio totals.

## Files Changed

| Action | File | Purpose |
|--------|------|---------|
| Modify | `src/hooks/useWallets.js` | entries model, chain:address keys |
| Modify | `src/services/walletConfig.js` | export entries, import backward compat |
| Modify | `src/components/ui/WalletCard.jsx` | per-chain sections |
| Modify | `src/components/ui/AddWalletForm.jsx` | multi-chain entry input |
| Modify | `src/components/ui/EditWalletModal.jsx` | manage chain entries |
| No change | `src/pages/DashboardPage.jsx` | API unchanged |
| No change | `src/hooks/useHistory.js` | wallet.id + token.key based, unaffected |
