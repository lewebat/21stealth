# xPub Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add xPub key support for BTC, LTC, and DOGE wallets so users can track all derived addresses from a single HD wallet key.

**Architecture:** Each xPub entry stores the key in `{ chain, type: 'xpub', xpub }` format. The backend resolves it via chain-specific APIs (blockchain.com for BTC, Blockchair+BlockCypher for LTC/DOGE) and returns aggregated tokens plus per-address breakdown. The frontend detects xPub vs address automatically in all input fields via a new `detectInput` utility.

**Tech Stack:** PHP 8 (backend), React + Vite (frontend), no test framework present — manual verification steps used throughout.

**Spec:** `docs/superpowers/specs/2026-03-27-xpub-support-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `backend/api/xpub/btc.php` | Create | BTC xPub → blockchain.com |
| `backend/api/xpub/ltc.php` | Create | LTC xPub → Blockchair + BlockCypher |
| `backend/api/xpub/doge.php` | Create | DOGE xPub → Blockchair + BlockCypher |
| `src/utils/detectInput.js` | Create | Auto-detect address or xPub from any input |
| `src/utils/convertXpub.js` | Create | Convert ypub/zpub → xpub format |
| `src/services/blockchainApi.js` | Modify | Add `xpub` endpoint |
| `src/services/blockchain.js` | Modify | Add `fetchXpubBalance` function |
| `src/hooks/useWallets.js` | Modify | Handle xPub entries throughout |
| `src/components/ui/AddWalletForm.jsx` | Modify | Use `detectInput`, support xPub entry creation |
| `src/components/ui/WalletCard.jsx` | Modify | Render xPub entry with masked key + expand |
| `src/components/ui/EditWalletModal.jsx` | Modify | Render xPub entries, use `detectInput` |

---

## Task 1: Create feature branch

**Files:** —

- [ ] **Step 1: Create and switch to feature branch**

```bash
git checkout -b feature/xpub
```

- [ ] **Step 2: Verify**

```bash
git branch
```
Expected: `* feature/xpub`

---

## Task 2: Backend — `backend/api/xpub/btc.php`

**Files:**
- Create: `backend/api/xpub/btc.php`

- [ ] **Step 1: Create the file**

```php
<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$xpub = $_GET['xpub'] ?? '';

// Validate: base58 chars, reasonable length for an xpub key
if (!preg_match('/^[xyzYZ][a-km-zA-HJ-NP-Z1-9]{100,120}$/', $xpub)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid xPub key']);
    exit;
}

$url = 'https://blockchain.info/multiaddr?active=' . urlencode($xpub) . '&n=0';
$ctx = stream_context_create(['http' => ['timeout' => 15, 'ignore_errors' => true]]);
$body = @file_get_contents($url, false, $ctx);

if ($body === false) {
    http_response_code(502);
    echo json_encode(['error' => 'BTC API unreachable']);
    exit;
}

$data = json_decode($body, true);
if (!isset($data['addresses'])) {
    http_response_code(502);
    echo json_encode(['error' => 'Unexpected BTC API response']);
    exit;
}

$totalSatoshi = 0;
$addresses = [];

foreach ($data['addresses'] as $addr) {
    $satoshi = ($addr['final_balance'] ?? 0);
    $btc = $satoshi / 1e8;
    $totalSatoshi += $satoshi;
    if ($btc > 0) {
        $addresses[] = [
            'address' => $addr['address'],
            'tokens'  => [['key' => 'btc', 'label' => 'BTC', 'balance' => $btc]],
        ];
    }
}

echo json_encode([
    'tokens'    => [['key' => 'btc', 'label' => 'BTC', 'balance' => $totalSatoshi / 1e8]],
    'addresses' => $addresses,
]);
```

- [ ] **Step 2: Test manually**

Open in browser or curl:
```
https://21stealth.com/backend/api/xpub/btc?xpub=xpub6INVALID
```
Expected: `{"error":"Invalid xPub key"}` with HTTP 400.

- [ ] **Step 3: Verify `.htaccess` covers subdirectory**

The existing `backend/api/.htaccess` should rewrite `xpub/btc` → `xpub/btc.php` on Apache because `.htaccess` applies recursively to subdirectories. Confirm by testing the clean URL above. If it returns 404 instead of the PHP response, add a separate `.htaccess` inside `backend/api/xpub/` with the same rewrite rule.

- [ ] **Step 4: Commit**

```bash
git add backend/api/xpub/btc.php
git commit -m "feat(xpub): BTC xPub backend endpoint"
```

---

## Task 3: Backend — `backend/api/xpub/ltc.php`

**Files:**
- Create: `backend/api/xpub/ltc.php`

- [ ] **Step 1: Create the file**

```php
<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$xpub = $_GET['xpub'] ?? '';

if (!preg_match('/^[a-zA-Z][a-km-zA-HJ-NP-Z1-9]{100,120}$/', $xpub)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid xPub key']);
    exit;
}

$config = file_exists(__DIR__ . '/../../../config.php')
    ? require __DIR__ . '/../../../config.php'
    : [];

$ctx = stream_context_create(['http' => ['timeout' => 15, 'ignore_errors' => true]]);

// Primary: Blockchair
$url = 'https://api.blockchair.com/litecoin/dashboards/xpub/' . urlencode($xpub);
if (!empty($config['blockchair_api_key'])) $url .= '?key=' . $config['blockchair_api_key'];
$body = @file_get_contents($url, false, $ctx);
$data = $body ? json_decode($body, true) : null;

if ($data && isset($data['data'][$xpub]['addresses'])) {
    $addrData = $data['data'][$xpub]['addresses'];
    $totalLtc = 0;
    $addresses = [];
    foreach ($addrData as $addr => $info) {
        $ltc = ($info['balance'] ?? 0) / 1e8;
        $totalLtc += $ltc;
        if ($ltc > 0) {
            $addresses[] = [
                'address' => $addr,
                'tokens'  => [['key' => 'ltc', 'label' => 'LTC', 'balance' => $ltc]],
            ];
        }
    }
    echo json_encode([
        'tokens'    => [['key' => 'ltc', 'label' => 'LTC', 'balance' => $totalLtc]],
        'addresses' => $addresses,
    ]);
    exit;
}

// Fallback: BlockCypher
$url2 = 'https://api.blockcypher.com/v1/ltc/main/addrs/' . urlencode($xpub) . '/balance';
$body2 = @file_get_contents($url2, false, $ctx);
$data2 = $body2 ? json_decode($body2, true) : null;

if ($data2 && isset($data2['balance'])) {
    $ltc = $data2['balance'] / 1e8;
    echo json_encode([
        'tokens'    => [['key' => 'ltc', 'label' => 'LTC', 'balance' => $ltc]],
        'addresses' => [],
    ]);
    exit;
}

http_response_code(502);
echo json_encode(['error' => 'LTC API unreachable']);
```

- [ ] **Step 2: Commit**

```bash
git add backend/api/xpub/ltc.php
git commit -m "feat(xpub): LTC xPub backend endpoint"
```

---

## Task 4: Backend — `backend/api/xpub/doge.php`

**Files:**
- Create: `backend/api/xpub/doge.php`

- [ ] **Step 1: Create the file**

Same pattern as LTC, replacing `litecoin` → `dogecoin`, `ltc` → `doge`, `LTC` → `DOGE`, `1e8` stays the same (DOGE also uses satoshi-equivalent units):

```php
<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$xpub = $_GET['xpub'] ?? '';

if (!preg_match('/^[a-zA-Z][a-km-zA-HJ-NP-Z1-9]{100,120}$/', $xpub)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid xPub key']);
    exit;
}

$config = file_exists(__DIR__ . '/../../../config.php')
    ? require __DIR__ . '/../../../config.php'
    : [];

$ctx = stream_context_create(['http' => ['timeout' => 15, 'ignore_errors' => true]]);

// Primary: Blockchair
$url = 'https://api.blockchair.com/dogecoin/dashboards/xpub/' . urlencode($xpub);
if (!empty($config['blockchair_api_key'])) $url .= '?key=' . $config['blockchair_api_key'];
$body = @file_get_contents($url, false, $ctx);
$data = $body ? json_decode($body, true) : null;

if ($data && isset($data['data'][$xpub]['addresses'])) {
    $addrData = $data['data'][$xpub]['addresses'];
    $totalDoge = 0;
    $addresses = [];
    foreach ($addrData as $addr => $info) {
        $doge = ($info['balance'] ?? 0) / 1e8;
        $totalDoge += $doge;
        if ($doge > 0) {
            $addresses[] = [
                'address' => $addr,
                'tokens'  => [['key' => 'doge', 'label' => 'DOGE', 'balance' => $doge]],
            ];
        }
    }
    echo json_encode([
        'tokens'    => [['key' => 'doge', 'label' => 'DOGE', 'balance' => $totalDoge]],
        'addresses' => $addresses,
    ]);
    exit;
}

// Fallback: BlockCypher
$url2 = 'https://api.blockcypher.com/v1/doge/main/addrs/' . urlencode($xpub) . '/balance';
$body2 = @file_get_contents($url2, false, $ctx);
$data2 = $body2 ? json_decode($body2, true) : null;

if ($data2 && isset($data2['balance'])) {
    $doge = $data2['balance'] / 1e8;
    echo json_encode([
        'tokens'    => [['key' => 'doge', 'label' => 'DOGE', 'balance' => $doge]],
        'addresses' => [],
    ]);
    exit;
}

http_response_code(502);
echo json_encode(['error' => 'DOGE API unreachable']);
```

- [ ] **Step 2: Commit**

```bash
git add backend/api/xpub/doge.php
git commit -m "feat(xpub): DOGE xPub backend endpoint"
```

---

## Task 5: Frontend utility — `detectInput.js` + `convertXpub.js`

**Files:**
- Create: `src/utils/detectInput.js`
- Create: `src/utils/convertXpub.js`

- [ ] **Step 1: Create `convertXpub.js`**

Converts `ypub`/`zpub` version bytes to standard `xpub` so blockchain.com accepts them.

```js
// Base58 alphabet
const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz'
const BASE = BigInt(58)

function b58decode(str) {
  let n = BigInt(0)
  for (const c of str) {
    const idx = ALPHABET.indexOf(c)
    if (idx < 0) throw new Error('Invalid base58 char')
    n = n * BASE + BigInt(idx)
  }
  // count leading '1's → leading zero bytes
  let leadingZeros = 0
  for (const c of str) {
    if (c !== '1') break
    leadingZeros++
  }
  const bytes = []
  while (n > 0n) { bytes.unshift(Number(n & 0xffn)); n >>= 8n }
  return new Uint8Array([...new Array(leadingZeros).fill(0), ...bytes])
}

function b58encode(bytes) {
  let n = BigInt(0)
  for (const b of bytes) n = n * 256n + BigInt(b)
  let str = ''
  while (n > 0n) { str = ALPHABET[Number(n % BASE)] + str; n /= BASE }
  for (const b of bytes) {
    if (b !== 0) break
    str = '1' + str
  }
  return str
}

async function sha256(data) {
  const buf = await crypto.subtle.digest('SHA-256', data)
  return new Uint8Array(buf)
}

// Version bytes for known prefixes → xpub (mainnet public)
const XPUB_VERSION = new Uint8Array([0x04, 0x88, 0xb2, 0x1e])

const VERSION_MAP = {
  ypub: new Uint8Array([0x04, 0x9d, 0x7c, 0xb2]), // BIP49
  zpub: new Uint8Array([0x04, 0xb2, 0x47, 0x46]), // BIP84
}

/**
 * Converts ypub/zpub to xpub format.
 * Returns the original string unchanged if already xpub or unknown prefix.
 */
export async function toXpub(key) {
  const prefix = key.slice(0, 4)
  if (!VERSION_MAP[prefix]) return key // already xpub or unknown

  const decoded = b58decode(key)
  // decoded = 4 version bytes + 74 payload bytes + 4 checksum bytes
  if (decoded.length !== 82) return key

  const payload = decoded.slice(4, 78) // 74 bytes without version and checksum
  const newRaw = new Uint8Array([...XPUB_VERSION, ...payload])

  // Compute checksum: SHA256(SHA256(newRaw))[0:4]
  const hash1 = await sha256(newRaw)
  const hash2 = await sha256(hash1)
  const checksum = hash2.slice(0, 4)

  return b58encode(new Uint8Array([...newRaw, ...checksum]))
}
```

- [ ] **Step 2: Create `detectInput.js`**

```js
import { detectChain } from './detectChain'

const XPUB_PATTERNS = [
  { re: /^(xpub|ypub|zpub)[a-km-zA-HJ-NP-Z1-9]{100,120}$/, chain: 'btc' },
  { re: /^(Ltub|Mtub)[a-km-zA-HJ-NP-Z1-9]{100,120}$/,      chain: 'ltc' },
  { re: /^dgub[a-km-zA-HJ-NP-Z1-9]{100,120}$/,              chain: 'doge' },
]

/**
 * Detects whether input is an address or xPub key.
 * Returns { chain, type: 'address'|'xpub' } or null.
 */
export function detectInput(value) {
  const v = value.trim()
  if (!v) return null

  for (const { re, chain } of XPUB_PATTERNS) {
    if (re.test(v)) return { chain, type: 'xpub' }
  }

  const chain = detectChain(v)
  if (chain) return { chain, type: 'address' }

  return null
}
```

- [ ] **Step 3: Commit**

```bash
git add src/utils/detectInput.js src/utils/convertXpub.js
git commit -m "feat(xpub): detectInput utility + ypub/zpub converter"
```

---

## Task 6: Frontend service — `blockchainApi.js` + `blockchain.js`

**Files:**
- Modify: `src/services/blockchainApi.js`
- Modify: `src/services/blockchain.js`

- [ ] **Step 1: Add xpub endpoint to `blockchainApi.js`**

```js
// Add after the existing balance line:
xpub: (chain) => `${BASE}/backend/api/xpub/${chain}`,
```

- [ ] **Step 2: Add `fetchXpubBalance` to `blockchain.js`**

```js
import { BLOCKCHAIN_API } from './blockchainApi'
import { toXpub } from '@/utils/convertXpub'

// Add after the existing fetchBalance function:

async function fetchXpubBalance(chain, xpub) {
  const normalised = await toXpub(xpub)

  let res
  try {
    res = await fetch(`${BLOCKCHAIN_API.xpub(chain)}?xpub=${encodeURIComponent(normalised)}`)
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

  if (!res.ok) throw new Error(data.error ?? `${chain.toUpperCase()} xPub API error`)
  return { tokens: data.tokens, addresses: data.addresses ?? [] }
}

export { fetchXpubBalance }
```

- [ ] **Step 3: Commit**

```bash
git add src/services/blockchainApi.js src/services/blockchain.js
git commit -m "feat(xpub): xpub endpoint + fetchXpubBalance service"
```

---

## Task 7: `useWallets.js` — xPub support

**Files:**
- Modify: `src/hooks/useWallets.js`

- [ ] **Step 1: Add xpub cache helper and import**

At the top of the file, after existing imports:

```js
import { fetchXpubBalance } from '@/services/blockchain'
```

Add helpers after `setCached`:

```js
function xpubKey(chain, xpub) { return `xpub:${chain}:${xpub}` }

function getCachedXpub(chain, xpub) {
  const key = xpubKey(chain, xpub)
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null }
  return entry
}

function setCachedXpub(chain, xpub, tokens, addresses) {
  cache.set(xpubKey(chain, xpub), { tokens, addresses, ts: Date.now() })
}
```

- [ ] **Step 2: Guard `allAddrKeys` against xPub entries**

The xPub placeholder key must always be included so `aggregateStatus` can see the loading/error state before derived addresses are known. Without it, a wallet with only an xPub entry immediately shows `status: 'ok'` while the fetch is still pending.

```js
// Replace:
function allAddrKeys(wallet) {
  return wallet.entries.flatMap(e => e.addresses.map(a => addrKey(e.chain, a)))
}

// With:
function allAddrKeys(wallet) {
  return wallet.entries.flatMap(e => {
    if (e.type === 'xpub') {
      const k = xpubKey(e.chain, e.xpub)
      const derived = wallet.derivedAddrs?.[k] ?? []
      // Always include the placeholder key so aggregateStatus sees loading/error state
      return [k, ...derived.map(a => addrKey(e.chain, a))]
    }
    return e.addresses.map(a => addrKey(e.chain, a))
  })
}
```

- [ ] **Step 3: Add `derivedAddrs` to `makeWallet`**

```js
// Replace:
return recompute({ id, label, entries, addrTokens, addrStatus, addrError })

// With:
return recompute({ id, label, entries, addrTokens, addrStatus, addrError, derivedAddrs: {} })
```

Also update the `for` loop in `makeWallet` to skip xPub entries:

```js
// Replace:
for (const { chain, addresses } of entries) {
  for (const addr of addresses) {
    addrStatus[addrKey(chain, addr)] = 'loading'
  }
}

// With:
for (const entry of entries) {
  if (entry.type === 'xpub') continue // loaded async via loadOneXpub
  for (const addr of entry.addresses) {
    addrStatus[addrKey(entry.chain, addr)] = 'loading'
  }
}
```

- [ ] **Step 4: Add `loadOneXpub` function**

Add after `loadOneAddress`:

```js
const loadOneXpub = useCallback(async (walletId, chain, xpub, force = false) => {
  const key = xpubKey(chain, xpub)

  if (!force) {
    const cached = getCachedXpub(chain, xpub)
    if (cached) {
      setWallets(prev => prev.map(w => {
        if (w.id !== walletId) return w
        const addrTokens = { ...w.addrTokens }
        const addrStatus = { ...w.addrStatus }
        const addrError  = { ...w.addrError }
        const derivedAddrs = { ...w.derivedAddrs, [key]: cached.addresses.map(a => a.address) }
        // Set placeholder key status so aggregateStatus resolves correctly
        addrTokens[key] = cached.tokens
        addrStatus[key] = 'ok'
        for (const { address, tokens } of cached.addresses) {
          addrTokens[addrKey(chain, address)] = tokens
          addrStatus[addrKey(chain, address)] = 'ok'
          delete addrError[addrKey(chain, address)]
        }
        return recompute({ ...w, addrTokens, addrStatus, addrError, derivedAddrs })
      }))
      return
    }
  }

  // Set loading state for this xpub entry (use key as placeholder)
  setWallets(prev => prev.map(w => {
    if (w.id !== walletId) return w
    return recompute({ ...w, addrStatus: { ...w.addrStatus, [key]: 'loading' } })
  }))

  try {
    const { tokens, addresses } = await fetchXpubBalance(chain, xpub)
    setCachedXpub(chain, xpub, tokens, addresses)
    setWallets(prev => prev.map(w => {
      if (w.id !== walletId) return w
      const addrTokens  = { ...w.addrTokens }
      const addrStatus  = { ...w.addrStatus }
      const addrError   = { ...w.addrError }
      const derivedList = addresses.map(a => a.address)
      const derivedAddrs = { ...w.derivedAddrs, [key]: derivedList }
      delete addrStatus[key] // remove placeholder
      for (const { address, tokens: t } of addresses) {
        addrTokens[addrKey(chain, address)] = t
        addrStatus[addrKey(chain, address)] = 'ok'
        delete addrError[addrKey(chain, address)]
      }
      // Also store aggregate tokens under xpub key for status tracking
      addrTokens[key] = tokens
      addrStatus[key] = 'ok'
      return recompute({ ...w, addrTokens, addrStatus, addrError, derivedAddrs })
    }))
  } catch (err) {
    setWallets(prev => prev.map(w => {
      if (w.id !== walletId) return w
      const addrStatus = { ...w.addrStatus, [key]: 'error' }
      const addrError  = { ...w.addrError, [key]: err instanceof Error ? err.message : 'Unknown error' }
      return recompute({ ...w, addrStatus, addrError })
    }))
  }
}, [])
```

- [ ] **Step 5: Update `loadBalances` to dispatch xPub entries**

```js
// Replace:
const loadBalances = useCallback((wallet, force = false) => {
  for (const { chain, addresses } of wallet.entries) {
    for (const address of addresses) {
      loadOneAddress(wallet.id, chain, address, force)
    }
  }
}, [loadOneAddress])

// With:
const loadBalances = useCallback((wallet, force = false) => {
  for (const entry of wallet.entries) {
    if (entry.type === 'xpub') {
      loadOneXpub(wallet.id, entry.chain, entry.xpub, force)
    } else {
      for (const address of entry.addresses) {
        loadOneAddress(wallet.id, entry.chain, address, force)
      }
    }
  }
}, [loadOneAddress, loadOneXpub])
```

- [ ] **Step 6: Update `updateWallet` to handle xPub entries**

In `updateWallet`, replace the inner loop that rebuilds `addrTokens`/`addrStatus`/`addrError`. Note: `existingKeys` (the address key Set computed earlier in the original function) must remain in scope around this block — only the loop body is replaced here, not the surrounding `updateWallet` logic.

```js
// Replace the loop:
for (const { chain, addresses } of newEntries) {
  for (const addr of addresses) {
    const k = addrKey(chain, addr)
    addrTokens[k] = w.addrTokens[k] ?? []
    addrStatus[k] = w.addrStatus[k] ?? 'loading'
    if (w.addrError[k]) addrError[k] = w.addrError[k]
  }
}

// With:
for (const entry of newEntries) {
  if (entry.type === 'xpub') {
    const k = xpubKey(entry.chain, entry.xpub)
    addrTokens[k] = w.addrTokens[k] ?? []
    addrStatus[k] = w.addrStatus[k] ?? 'loading'
    if (w.addrError[k]) addrError[k] = w.addrError[k]
  } else {
    for (const addr of entry.addresses) {
      const k = addrKey(entry.chain, addr)
      addrTokens[k] = w.addrTokens[k] ?? []
      addrStatus[k] = w.addrStatus[k] ?? 'loading'
      if (w.addrError[k]) addrError[k] = w.addrError[k]
    }
  }
}
```

Also update the "load new entries" block at the end of `updateWallet`:

```js
// Replace:
if (patch.entries) {
  for (const { chain, addresses } of newEntries) {
    for (const addr of addresses) {
      if (!existingKeys.has(addrKey(chain, addr))) {
        loadOneAddress(id, chain, addr, false)
      }
    }
  }
}

// With:
if (patch.entries) {
  const existingXpubKeys = new Set(
    currentWallet.entries
      .filter(e => e.type === 'xpub')
      .map(e => xpubKey(e.chain, e.xpub))
  )
  for (const entry of newEntries) {
    if (entry.type === 'xpub') {
      if (!existingXpubKeys.has(xpubKey(entry.chain, entry.xpub))) {
        // Evict the OLD xpub key for this chain (not the new one)
        const oldEntry = currentWallet.entries.find(
          e => e.type === 'xpub' && e.chain === entry.chain
        )
        if (oldEntry) cache.delete(xpubKey(oldEntry.chain, oldEntry.xpub))
        loadOneXpub(id, entry.chain, entry.xpub, false)
      }
    } else {
      for (const addr of entry.addresses) {
        if (!existingKeys.has(addrKey(entry.chain, addr))) {
          loadOneAddress(id, entry.chain, addr, false)
        }
      }
    }
  }
}
```

- [ ] **Step 7: Ensure `derivedAddrs` is preserved in `importWallets`**

`importWallets` calls `makeWallet` which now initialises `derivedAddrs: {}` — no change needed.

- [ ] **Step 8: Commit**

```bash
git add src/hooks/useWallets.js
git commit -m "feat(xpub): xPub entry support in useWallets"
```

---

## Task 8: `AddWalletForm.jsx` — xPub input support

**Files:**
- Modify: `src/components/ui/AddWalletForm.jsx`

- [ ] **Step 1: Replace `detectChain` with `detectInput`**

```js
// Replace import:
import { detectChain } from '@utils/detectChain'

// With:
import { detectInput } from '@utils/detectInput'
```

- [ ] **Step 2: Update state and detection logic**

```js
// Replace:
const firstTrimmed = firstAddr.trim()
const firstChain = detectChain(firstTrimmed)
const allAddedAddrs = firstChain ? [firstTrimmed, ...extraAddresses] : []

// With:
const firstTrimmed  = firstAddr.trim()
const firstDetected = detectInput(firstTrimmed)   // { chain, type } | null
const firstChain    = firstDetected?.chain ?? null
const firstIsXpub   = firstDetected?.type === 'xpub'
const allAddedAddrs = firstChain && !firstIsXpub ? [firstTrimmed, ...extraAddresses] : []
```

- [ ] **Step 3: Update `buildEntries`**

```js
function buildEntries(extra = extraAddresses) {
  if (!firstChain) return []
  if (firstIsXpub) {
    // xPub entry for first chain, then any address entries for other chains
    const map = new Map()
    for (const addr of extra) {
      const detected = detectInput(addr)
      if (!detected || detected.type !== 'address') continue
      if (!map.has(detected.chain)) map.set(detected.chain, [])
      map.get(detected.chain).push(addr)
    }
    return [
      { chain: firstChain, type: 'xpub', xpub: firstTrimmed },
      ...[...map.entries()].map(([chain, addresses]) => ({ chain, type: 'address', addresses })),
    ]
  }
  // Original address logic
  const map = new Map()
  map.set(firstChain, [firstTrimmed])
  for (const addr of extra) {
    const detected = detectInput(addr)
    if (!detected || detected.type !== 'address') continue
    if (!map.has(detected.chain)) map.set(detected.chain, [])
    map.get(detected.chain).push(addr)
  }
  return [...map.entries()].map(([chain, addresses]) => ({ chain, type: 'address', addresses }))
}
```

- [ ] **Step 4: Update `handleAddAddr`**

```js
function handleAddAddr() {
  const trimmed = newAddr.trim()
  if (!trimmed) return
  const detected = detectInput(trimmed)
  if (!detected) { setNewAddrError('Unknown format — please enter a valid address or xPub key'); return }
  if (detected.type === 'xpub') { setNewAddrError('Only one xPub per chain supported — use a separate wallet'); return }
  if (allAddedAddrs.includes(trimmed)) { setNewAddrError('Address already added'); return }
  // Prevent adding an address for the same chain as an xPub entry
  if (firstIsXpub && detected.chain === firstChain) {
    setNewAddrError(`${detected.chain.toUpperCase()} already tracked via xPub`)
    return
  }
  const chainCount = allAddedAddrs.filter(a => detectInput(a)?.chain === detected.chain).length
  if (chainCount >= MAX_ADDRESSES) {
    setNewAddrError(`Max ${MAX_ADDRESSES} addresses for ${detected.chain.toUpperCase()}`)
    return
  }
  setExtraAddresses(prev => [...prev, trimmed])
  setNewAddr('')
  setNewAddrError('')
}
```

- [ ] **Step 5: Define `allEntries` and update first-input icon and submit button label**

Ensure `allEntries` is explicitly defined in the component body (e.g. `const allEntries = buildEntries()`) — it is referenced in the submit button label below.

```jsx
// First input iconRight — add xPub label:
iconRight={
  firstAddr.length > 0 ? (
    firstDetected
      ? <span className="text-success text-xs font-semibold">
          {firstIsXpub ? `${firstChain?.toUpperCase()} xPub` : CHAIN_LABELS[firstChain]}
        </span>
      : <span className="text-danger text-xs font-semibold">Unknown</span>
  ) : null
}

// Submit button label:
{firstChain
  ? `Add wallet (${allEntries.length} chain${allEntries.length > 1 ? 's' : ''})`
  : 'Add wallet'}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/AddWalletForm.jsx
git commit -m "feat(xpub): AddWalletForm xPub detection and entry creation"
```

---

## Task 9: `WalletCard.jsx` — xPub display

**Files:**
- Modify: `src/components/ui/WalletCard.jsx`

- [ ] **Step 1: Guard `allKeys` and chain-section rendering**

Find the line:
```js
const allKeys = wallet.entries.flatMap(e => e.addresses.map(a => `${e.chain}:${a}`))
```

Replace with:
```js
const allKeys = wallet.entries.flatMap(e =>
  e.type === 'xpub'
    ? [`xpub:${e.chain}:${e.xpub}`]
    : e.addresses.map(a => `${e.chain}:${a}`)
)
```

- [ ] **Step 2: Update chain section header for xPub entries**

Find where chain header renders the address count (e.g. `addresses.length === 1 ? shorten(addresses[0]) : N addresses`).

The section maps over `wallet.entries` — add a branch for xPub:

```jsx
{entry.type === 'xpub' ? (
  <span className="font-mono text-caption text-text-subtle">
    {entry.xpub.slice(0, 10)}••••••
  </span>
) : (
  /* existing address count / shorten logic */
)}
```

- [ ] **Step 3: Update expand view for xPub entries**

When an xPub entry is expanded, show derived addresses from `wallet.derivedAddrs`:

```jsx
{entry.type === 'xpub' ? (
  (wallet.derivedAddrs?.[`xpub:${entry.chain}:${entry.xpub}`] ?? []).map(addr => (
    <tr key={addr}>
      <td><span className="text-label text-text-muted">{entry.chain.toUpperCase()}</span></td>
      <td>
        <div className="text-right font-mono text-caption">
          {fmtBalance(
            (wallet.addrTokens[`${entry.chain}:${addr}`]?.[0]?.balance ?? 0),
            entry.chain
          )}
        </div>
      </td>
      <td>
        <div className="text-right font-mono text-caption text-text-muted">
          ${fmt2(tokenUsd(
            { key: entry.chain, balance: wallet.addrTokens[`${entry.chain}:${addr}`]?.[0]?.balance ?? 0 },
            prices
          ))}
        </div>
      </td>
    </tr>
  ))
) : (
  /* existing address rows */
)}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/WalletCard.jsx
git commit -m "feat(xpub): WalletCard xPub masked display and expand view"
```

---

## Task 10: `EditWalletModal.jsx` — xPub entries

**Files:**
- Modify: `src/components/ui/EditWalletModal.jsx`

- [ ] **Step 1: Replace `detectChain` with `detectInput`**

```js
import { detectInput } from '@utils/detectInput'
```

- [ ] **Step 2: Update `useEffect` to preserve xPub entry type**

```js
setEntries(wallet.entries.map(e =>
  e.type === 'xpub'
    ? { chain: e.chain, type: 'xpub', xpub: e.xpub }
    : { chain: e.chain, type: 'address', addresses: [...e.addresses] }
))
```

- [ ] **Step 3: Render xPub entries as masked rows**

In the entries render loop, add a branch for xPub entries:

```jsx
{entry.type === 'xpub' ? (
  <div className="chain-entry">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={`chain-badge ${CHAIN_BADGE[entry.chain]}`}>{entry.chain.toUpperCase()}</span>
        <span className="font-mono text-caption text-text-muted">
          {entry.xpub.slice(0, 10)}••••••
        </span>
        <span className="text-label text-text-subtle">xPub</span>
      </div>
      {entries.length > 1 && (
        <button type="button" className="btn-icon text-danger"
          onClick={() => handleRemoveChainEntry(entry.chain)}>
          <X size={14} />
        </button>
      )}
    </div>
  </div>
) : (
  /* existing address entry render */
)}
```

- [ ] **Step 4: Update `handleAddChainEntry` to use `detectInput`**

```js
function handleAddChainEntry() {
  const trimmed = newChainAddr.trim()
  if (!trimmed) return
  const detected = detectInput(trimmed)
  if (!detected) { setNewChainError('Unknown format — please enter a valid address or xPub key'); return }
  if (usedChains.has(detected.chain)) {
    setNewChainError(`${CHAIN_LABELS[detected.chain] ?? detected.chain} already exists`)
    return
  }
  if (detected.type === 'xpub') {
    setEntries(prev => [...prev, { chain: detected.chain, type: 'xpub', xpub: trimmed }])
  } else {
    setEntries(prev => [...prev, { chain: detected.chain, type: 'address', addresses: [trimmed] }])
  }
  setNewChainAddr('')
  setNewChainError('')
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/EditWalletModal.jsx
git commit -m "feat(xpub): EditWalletModal xPub entry rendering and input"
```

---

## Task 11: End-to-end manual test

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test xPub detection in AddWalletForm**
  - Open "Add wallet"
  - Enter a valid BTC xpub string — confirm green "BTC xPub" label appears
  - Enter a LTC `Ltub...` string — confirm "LTC xPub" label appears
  - Enter garbage — confirm "Unknown" label appears

- [ ] **Step 3: Test wallet creation**
  - Add a wallet with a real BTC xpub
  - Confirm it appears in the wallet list with masked key
  - Confirm balances load and expand shows per-address breakdown

- [ ] **Step 4: Test EditWalletModal**
  - Open edit on an xPub wallet
  - Confirm xPub entry shows masked and has remove button
  - Add a new chain via address or xPub in the "Add another chain" input

- [ ] **Step 5: Test config export/import**
  - Export config
  - Verify the `.21s` file contains `"type":"xpub","xpub":"xpub..."` (not addresses)
  - Import it back and confirm wallet loads correctly

- [ ] **Final commit**

```bash
git add .
git commit -m "feat(xpub): complete xPub support for BTC, LTC, DOGE"
```
