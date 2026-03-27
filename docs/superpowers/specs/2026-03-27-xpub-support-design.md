# xPub Support — Design Spec

**Date:** 2026-03-27
**Status:** Approved
**Branch:** feature/xpub (separate from main)

---

## Overview

Add xPub (Extended Public Key) support for BTC, LTC, and DOGE. Users can enter an xPub key instead of individual addresses. The app derives all used addresses via the blockchain.com API and displays balances — including an expandable address list. Individual address wallets continue to work unchanged.

---

## Scope

- **In scope:** BTC, LTC, DOGE xPub via blockchain.com API
- **Out of scope:** ETH xPub (no suitable public API; deferred)
- **Both modes coexist:** A single wallet can mix xPub entries and address entries across chains

---

## Data Model

Entry type extended with optional `type` field. Backwards compatible — missing `type` defaults to `'address'`.

```js
// Address entry (unchanged, type defaults to 'address')
{ chain: 'btc', type: 'address', addresses: ['1abc...', '1def...'] }

// xPub entry (new)
{ chain: 'btc', type: 'xpub', xpub: 'xpub6Cx...' }
```

Config export/import unchanged — xPub serialises as a regular field in the entry object.

---

## xPub Format Detection

New utility `src/utils/detectInput.js` — unified auto-detection for both addresses and xPub keys. Returns `{ chain, type }` or `null`.

| Prefix | Chain | Type |
|--------|-------|------|
| `xpub`, `ypub`, `zpub` | btc | xpub |
| `Ltub`, `Mtub` | ltc | xpub |
| `dgub` | doge | xpub |
| BTC address pattern | btc | address |
| LTC address pattern | ltc | address |
| DOGE address pattern | doge | address |
| *(anything else)* | — | null → error |

---

## Backend

Three new PHP endpoints, one per chain:

```
backend/api/xpub/btc.php?xpub=xpub6Cx...
backend/api/xpub/ltc.php?xpub=Ltub2...
backend/api/xpub/doge.php?xpub=dgub9...
```

Each calls the blockchain.com multiaddr API:
```
https://blockchain.info/multiaddr?active={xpub}
```

Response format — same structure as existing balance endpoints, extended with `addresses`:

```json
{
  "tokens": [{ "key": "btc", "label": "BTC", "balance": 0.042 }],
  "addresses": ["1abc...", "1def...", "bc1q..."]
}
```

---

## Frontend — Balance Fetching

`src/services/blockchainApi.js` gets a new endpoint:
```js
xpub: (chain) => `${BASE}/backend/api/xpub/${chain}.php`
```

`src/services/blockchain.js` gets a new `fetchXpubBalance(chain, xpub)` function — same fetch/error-handling pattern as existing `fetchBalance`.

`src/hooks/useWallets.js` — `fetchBalances` dispatches based on entry type:
- `type === 'xpub'` → `fetchXpubBalance(chain, xpub)`
- `type === 'address'` (or missing) → existing per-address logic

Cache key for xPub: `xpub:{chain}:{xpub}` — same 60s TTL.

Derived addresses returned from the API are stored in `addrTokens` keyed per address, enabling the existing expand view to work without changes.

---

## UI Changes

### AddWalletForm
- Replace `detectChain` with `detectInput` — same single input field, now recognises xPub prefixes
- On xPub detected: creates `{ chain, type: 'xpub', xpub }` entry
- Error message for unknown input: "Unknown format — please enter a valid address or xPub key"

### WalletCard
- xPub entries display the key masked: `xpub6Cx••••••` with chain badge
- Expand behaviour unchanged — derived addresses shown per-address with individual balances (same as current multi-address expand)

### EditWalletModal
- xPub entries shown as single masked row — no add-address option within an xPub entry
- Remove button to delete the xPub entry entirely

---

## Branch Strategy

All work on `feature/xpub` branch. Not merged to `main` until fully tested.
