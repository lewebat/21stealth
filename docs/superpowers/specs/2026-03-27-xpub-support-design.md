# xPub Support — Design Spec

**Date:** 2026-03-27
**Status:** Approved
**Branch:** feature/xpub (separate from main)

---

## Overview

Add xPub (Extended Public Key) support for BTC, LTC, and DOGE. Users can enter an xPub key instead of individual addresses. The app resolves all used addresses and balances via chain-specific backend endpoints. Individual address wallets continue to work unchanged.

---

## Scope

- **In scope:** BTC, LTC, DOGE xPub
- **Out of scope:** ETH xPub (no suitable public API; deferred)
- **Both modes coexist:** A single wallet can mix xPub entries and address entries across chains

---

## Data Model

Entry type extended with optional `type` field. Backwards compatible — missing `type` defaults to `'address'`.

```js
// Address entry (unchanged)
{ chain: 'btc', type: 'address', addresses: ['1abc...', '1def...'] }

// xPub entry (new)
{ chain: 'btc', type: 'xpub', xpub: 'xpub6Cx...' }
```

**Config export** — `walletConfig.js` exports entries as-is. xPub entries contain only `{ chain, type, xpub }` — no derived addresses. Derived addresses are runtime-only (see below).

**Runtime-only derived addresses** — a separate field `derivedAddrs` on the wallet object (not persisted) stores derived addresses per xPub entry:
```js
// wallet.derivedAddrs shape (runtime only, never exported)
{ 'xpub:btc:xpub6Cx...': ['1abc...', '1def...',  'bc1q...'] }
```
This mirrors `addrTokens` / `addrStatus` / `addrError` which are already stripped on export.

---

## xPub Format Detection

New utility `src/utils/detectInput.js` — unified auto-detection returning `{ chain, type }` or `null`. Replaces `detectChain` in all input fields.

| Prefix | Chain | Type | Note |
|--------|-------|------|------|
| `xpub`, `zpub`, `ypub` | btc | xpub | `ypub`/`zpub` converted to `xpub` format before API call |
| `Ltub`, `Mtub` | ltc | xpub | |
| `dgub` | doge | xpub | |
| BTC address pattern | btc | address | |
| LTC address pattern | ltc | address | |
| DOGE address pattern | doge | address | |
| *(anything else)* | — | null | → error: "Unknown format — please enter a valid address or xPub key" |

**`ypub`/`zpub` conversion:** these BIP49/BIP84 keys must be converted to standard `xpub` format before passing to any backend endpoint, as blockchain.com only accepts `xpub`. Conversion happens in `detectInput.js` or a small helper.

---

## Backend

Three new PHP endpoints, one per chain. Each validates input and calls the appropriate upstream API. Clean URLs via `.htaccess` rewriting (no `.php` extension required).

```
backend/api/xpub/btc?xpub=xpub6Cx...   → blockchain.com
backend/api/xpub/ltc?xpub=Ltub2...      → Blockchair (primary) + BlockCypher (fallback)
backend/api/xpub/doge?xpub=dgub9...     → Blockchair (primary) + BlockCypher (fallback)
```

**`.htaccess`** in `backend/api/` rewrites all extensionless requests to their `.php` counterpart. Covers existing endpoints (`prices`, `status`, `balance/{chain}`) and new xPub endpoints alike.

**Upstream APIs per chain:**
- **BTC:** `https://blockchain.info/multiaddr?active={xpub}`
- **LTC:** `https://api.blockchair.com/litecoin/dashboards/xpub/{xpub}` (fallback: `https://api.blockcypher.com/v1/ltc/main/addrs/{xpub}`)
- **DOGE:** `https://api.blockchair.com/dogecoin/dashboards/xpub/{xpub}` (fallback: `https://api.blockcypher.com/v1/doge/main/addrs/{xpub}`)

**Input validation** — each endpoint validates the xpub key with a regex before the upstream call (base58 character set, minimum length). Invalid input → HTTP 400 with `{ "error": "Invalid xPub key" }`.

**Response format** — same structure as existing balance endpoints, with aggregated `tokens` and per-address breakdown:
```json
{
  "tokens": [{ "key": "btc", "label": "BTC", "balance": 0.042 }],
  "addresses": [
    { "address": "1abc...", "tokens": [{ "key": "btc", "label": "BTC", "balance": 0.031 }] },
    { "address": "bc1q...", "tokens": [{ "key": "btc", "label": "BTC", "balance": 0.011 }] }
  ]
}
```
`tokens` = aggregated total (WalletCard header), `addresses` = per-address breakdown (expand view).

**Timeout:** 15s (increased from 10s to accommodate potentially large xPub responses).

---

## Frontend — Balance Fetching

### `blockchainApi.js`
New endpoint added (clean URL, no `.php`):
```js
xpub: (chain) => `${BASE}/backend/api/xpub/${chain}`
```
Existing endpoints already updated to clean URLs: `prices`, `price-history`, `balance/{chain}`.

### `blockchain.js`
New function `fetchXpubBalance(chain, xpub)` — same fetch/error-handling pattern as `fetchBalance`. Returns `{ tokens, addresses }`.

### `useWallets.js` — full audit required

Every function that iterates over entries must handle both `type: 'address'` and `type: 'xpub'`:

| Function | Change needed |
|----------|--------------|
| `allAddrKeys` | Skip xPub entries (they have no `addresses`) |
| `makeWallet` | Add `derivedAddrs: {}` to wallet shape |
| `recompute` | Aggregate tokens from both address and xPub entries |
| `aggregateStatus` | Include xPub entry status |
| `aggregateErrorMsg` | Include xPub entry errors |
| `updateWallet` | Handle xPub entry replacement + evict old xPub cache key |
| `loadBalances` | Dispatch `fetchXpubBalance` for xPub entries; store returned `addresses` in `derivedAddrs` |

**Cache key** for xPub: `xpub:{chain}:{xpub}` — same 60s TTL as address entries.

**Cache eviction on `updateWallet`:** if an xPub key is replaced, the old cache entry is explicitly deleted before the new fetch.

---

## UI Changes

### `AddWalletForm`
- Replace `detectChain` with `detectInput` on the primary input
- On xPub detected: creates `{ chain, type: 'xpub', xpub }` entry
- When first entry is xPub: secondary "Add another address or chain" input remains available for adding entries on *other chains* (e.g., a LTC address alongside a BTC xPub), but a second entry for the *same chain* as the xPub is prevented
- Error message for unknown input: "Unknown format — please enter a valid address or xPub key"

### `WalletCard`
- xPub entries display the key masked in the chain header: `xpub6Cx••••••`
- Expand button shown — on expand, derived addresses listed per-address with individual balances (using `derivedAddrs` + `addrTokens`)
- Address-count label replaced with "xPub" badge for xPub entries
- All existing `e.addresses` references guarded with `entry.type === 'address'` check

### `EditWalletModal`
- xPub entries shown as single masked row — no add-address option within an xPub entry
- "Add another chain" input uses `detectInput` — can add a new xPub or address entry for a different chain
- Remove button deletes the xPub entry entirely

---

## Branch Strategy

All work on `feature/xpub` branch. Not merged to `main` until fully tested.
