# Analytics Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add privacy-friendly session-based analytics that tracks button interactions and app starts, stores events in MySQL, and shows key metrics in a protected PHP dashboard.

**Architecture:** A pure-JS `analytics.js` service generates a UUID session ID (localStorage) and sends events fire-and-forget via `sendBeacon`. A PHP `track.php` endpoint validates and writes to MySQL. A `stats-dashboard.php` renders aggregated metrics as HTML, protected by Apache Basic Auth.

**Tech Stack:** Vite + React (frontend), PHP 8+ with PDO (backend), MySQL/MariaDB, Apache `.htaccess`

---

> **Note:** This project has no automated test framework. Verification steps are manual (browser DevTools Network tab, direct URL checks).

---

## File Map

**Create:**
- `src/services/analytics.js` — session UUID + `track()` function
- `backend/api/track.php` — POST endpoint, writes to MySQL
- `backend/api/stats.php` — JSON aggregations with 60s file cache
- `backend/api/stats-dashboard.php` — HTML dashboard

**Modify:**
- `src/main.jsx` — call `initAnalytics()` before React renders
- `src/pages/DashboardPage.jsx` — `track('app_start')`
- `src/components/ui/AddWalletForm.jsx` — `track('wallet_added')`
- `src/components/ui/EditWalletModal.jsx` — `track('wallet_edited')`
- `src/components/ui/ConfigActions.jsx` — 5 events across 6 code paths
- `src/hooks/useInstallPrompt.js` — `track('pwa_installed')`
- `backend/config.example.php` — add DB credentials
- `backend/api/.htaccess` — add FilesMatch Basic Auth protection

---

## Task 1: Create `src/services/analytics.js`

**Files:**
- Create: `src/services/analytics.js`

Context: This is the only analytics file in the frontend. It must be a pure JS module (no React imports). The `VITE_API_URL` env var is the same one used by `src/lib/api.js` — use it the same way.

- [ ] **Step 1: Create the file**

```js
// src/services/analytics.js

const ENDPOINT = `${import.meta.env.VITE_API_URL || '/api'}/track`
const STORAGE_KEY = '21stealth_sid'

let sessionId = null

export function initAnalytics() {
  sessionId = localStorage.getItem(STORAGE_KEY)
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    localStorage.setItem(STORAGE_KEY, sessionId)
  }
}

export function track(event, properties) {
  if (!sessionId) return
  const body = JSON.stringify({
    session_id: sessionId,
    event,
    ...(properties !== undefined ? { properties } : {}),
  })
  try {
    if (typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }))
    } else {
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {})
    }
  } catch {
    // fire and forget — never throw
  }
}
```

- [ ] **Step 2: Verify the file exists and has no syntax errors**

Run: `node --input-type=module < src/services/analytics.js`

Expected: no output, no errors. (The module uses `import.meta.env` which won't resolve outside Vite, but Node won't throw on the module structure itself — if it does, check for syntax issues.)

- [ ] **Step 3: Commit**

```bash
git add src/services/analytics.js
git commit -m "feat: add analytics service with session UUID and track()"
```

---

## Task 2: Initialize analytics in `src/main.jsx`

**Files:**
- Modify: `src/main.jsx`

Context: `main.jsx` is 10 lines. `initAnalytics()` must run before React renders so the session ID is ready for any `track()` call that fires during mount.

Current file:
```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 1: Add import and call**

```jsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import App from './App.jsx'
import { initAnalytics } from '@/services/analytics.js'

initAnalytics()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
```

- [ ] **Step 2: Verify in browser**

Run `npm run dev`. Open http://localhost:5173. Open DevTools → Application → Local Storage → `http://localhost:5173`. Confirm `21stealth_sid` key exists with a UUID value (format: `xxxxxxxx-xxxx-4xxx-xxxx-xxxxxxxxxxxx`).

- [ ] **Step 3: Commit**

```bash
git add src/main.jsx
git commit -m "feat: initialize analytics at app bootstrap"
```

---

## Task 3: Track `app_start`, `wallet_added`, `wallet_edited`

**Files:**
- Modify: `src/pages/DashboardPage.jsx`
- Modify: `src/components/ui/AddWalletForm.jsx`
- Modify: `src/components/ui/EditWalletModal.jsx`

Context:
- `DashboardPage` mounts once — use a `useEffect` with empty deps.
- `AddWalletForm.handleSubmit` (line 61) calls `onAdd(label, allEntries)` then `reset()` and `onClose()`. Track after `onAdd`. Use `allEntries[0]?.chain` for the chain property.
- `EditWalletModal.handleSave` (line 68) calls `onSave(wallet.id, {...})`. Track after `onSave`.

- [ ] **Step 1: Add `track('app_start')` to DashboardPage**

In `src/pages/DashboardPage.jsx`, add the import at the top (with existing imports):

```js
import { track } from '@/services/analytics'
```

Add a new `useEffect` after the existing price polling effect (around line 50):

```js
useEffect(() => { track('app_start') }, [])
```

- [ ] **Step 2: Add `track('wallet_added')` to AddWalletForm**

In `src/components/ui/AddWalletForm.jsx`, add import:

```js
import { track } from '@/services/analytics'
```

In `handleSubmit` (line 61), after the `onAdd(...)` call:

```js
function handleSubmit(e) {
  e.preventDefault()
  if (addresses.length === 0) return
  onAdd(label.trim() || CHAIN_LABELS[allEntries[0]?.chain] || 'Wallet', allEntries)
  track('wallet_added', { chain: allEntries[0]?.chain ?? null })
  reset()
  onClose()
}
```

- [ ] **Step 3: Add `track('wallet_edited')` to EditWalletModal**

In `src/components/ui/EditWalletModal.jsx`, add import:

```js
import { track } from '@/services/analytics'
```

In `handleSave` (line 68), after the `onSave(...)` call:

```js
function handleSave() {
  const firstEntry = entries[0]
  const fallbackLabel = firstEntry ? (CHAIN_LABELS[firstEntry.chain] ?? 'Wallet') : 'Wallet'
  onSave(wallet.id, { label: label.trim() || fallbackLabel, entries })
  track('wallet_edited')
}
```

- [ ] **Step 4: Verify in browser**

Open DevTools → Network → filter by `/track`. Open app → confirm `app_start` request fires. Add a wallet → confirm `wallet_added` request fires with `{ chain: "eth" }` (or whichever chain). Edit a wallet → confirm `wallet_edited` fires.

- [ ] **Step 5: Commit**

```bash
git add src/pages/DashboardPage.jsx src/components/ui/AddWalletForm.jsx src/components/ui/EditWalletModal.jsx
git commit -m "feat: track app_start, wallet_added, wallet_edited events"
```

---

## Task 4: Track events in `ConfigActions.jsx`

**Files:**
- Modify: `src/components/ui/ConfigActions.jsx`

Context: ConfigActions has multiple import/save/export paths. Read the current file carefully. The events and their exact locations:

| Event | Function | Where |
|---|---|---|
| `config_imported` (unencrypted, File Access API) | `handleImport` | after `onImport(imported, importedHistory, null)` line ~121 |
| `config_imported` (unencrypted, fallback input) | `handleFileChange` | after `onImport(imported, importedHistory, null)` line ~144 |
| `config_imported` (encrypted) | `handleImportSubmit` | after `onImport(imported, importedHistory, password)` line ~165 |
| `config_exported` | `handleExportSubmit` | after `exportConfig(...)` await, before `setIsDirty(false)` |
| `config_saved` (repeat save) | `handleSave` | after `flashSaved()` in the fileHandle branch line ~181 |
| `config_saved` (first save) | `handleSaveSubmit` | after `flashSaved()` line ~202 |
| `refresh_all` | Refresh `<Button>` onClick | inline on the button |

- [ ] **Step 1: Add import**

```js
import { track } from '@/services/analytics'
```

- [ ] **Step 2: Add `config_exported` in `handleExportSubmit`**

```js
async function handleExportSubmit(encrypted) {
  await exportConfig(wallets, history, encrypted ? password : undefined)
  track('config_exported', { encrypted })
  setIsDirty(false)
  closeModal()
}
```

- [ ] **Step 3: Add `config_imported` in `handleImport` (File Access API, unencrypted path)**

Inside the inner try block of `handleImport`, after `onImport(imported, importedHistory, null)`:

```js
markClean()
onImport(imported, importedHistory, null)
track('config_imported', { encrypted: false })
```

- [ ] **Step 4: Add `config_imported` in `handleFileChange` (fallback input, unencrypted)**

In `handleFileChange`, after `onImport(imported, importedHistory, null)`:

```js
markClean()
onImport(imported, importedHistory, null)
track('config_imported', { encrypted: false })
```

- [ ] **Step 5: Add `config_imported` in `handleImportSubmit` (encrypted)**

In `handleImportSubmit`, after `onImport(imported, importedHistory, password)`:

```js
markClean()
onImport(imported, importedHistory, password)
track('config_imported', { encrypted: true })
closeModal()
```

- [ ] **Step 6: Add `config_saved` in `handleSave` (fileHandle branch — repeat saves)**

In `handleSave`, inside the `if (fileHandle)` branch, after `flashSaved()`:

```js
await saveToHandle(fileHandle, wallets, history, isEncrypted ? savedPassword : undefined)
flashSaved()
track('config_saved', { encrypted: isEncrypted })
```

- [ ] **Step 7: Add `config_saved` in `handleSaveSubmit` (first save via file picker)**

In `handleSaveSubmit`, after `flashSaved()`:

```js
flashSaved()
track('config_saved', { encrypted: usePassword })
onSessionPasswordChange(pwd ?? null)
```

- [ ] **Step 8: Add `refresh_all` on Refresh button onClick**

Find the Refresh `<Button>` in the JSX (the one with `onClick={onRefreshAll}`). Wrap the handler:

```jsx
<Button variant="secondary" size="sm" onClick={() => { track('refresh_all'); onRefreshAll() }} aria-label="Refresh all">
```

- [ ] **Step 9: Verify in browser**

Open DevTools → Network → filter by `/track`. Test each action: Import (encrypted + unencrypted), Export, Save, Refresh. Confirm events fire with correct `encrypted` property where expected. Confirm auto-save does NOT fire a `config_saved` event (wait 2s after changing a wallet label — no track request should appear).

- [ ] **Step 10: Commit**

```bash
git add src/components/ui/ConfigActions.jsx
git commit -m "feat: track config_imported, config_exported, config_saved, refresh_all"
```

---

## Task 5: Track `pwa_installed` in `useInstallPrompt.js`

**Files:**
- Modify: `src/hooks/useInstallPrompt.js`

Context: `triggerInstall()` already awaits `promptEvent.userChoice`. Track after `outcome === 'accepted'`.

- [ ] **Step 1: Add import and track call**

```js
import { track } from '@/services/analytics'
```

In `triggerInstall`:

```js
async function triggerInstall() {
  if (!promptEvent) return
  promptEvent.prompt()
  const { outcome } = await promptEvent.userChoice
  if (outcome === 'accepted') {
    setIsInstalled(true)
    track('pwa_installed')
  }
  setPromptEvent(null)
}
```

- [ ] **Step 2: Verify**

This can only be tested on a device/browser that supports PWA install. If testing in Chrome desktop: open DevTools → Application → Manifest → click "Add to homescreen". Confirm `pwa_installed` event fires in Network tab.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useInstallPrompt.js
git commit -m "feat: track pwa_installed on PWA install acceptance"
```

---

## Task 6: Backend — MySQL table + `track.php`

**Files:**
- Create: `backend/api/track.php`
- Modify: `backend/config.example.php`

Context: The existing pattern is one PHP file per endpoint. DB credentials go in `backend/config.php` (gitignored). `config.example.php` documents the structure. The existing `.htaccess` strips `.php` extensions via rewrite. All existing endpoints include `Access-Control-Allow-Origin: *`.

- [ ] **Step 1: Add DB credentials to `backend/config.example.php`**

```php
<?php
// Copy this file to config.php and fill in your API keys.
// config.php must NEVER be committed to Git.

return [
    'coingecko_api_key'  => '',   // https://coingecko.com/api
    'trongrid_api_key'   => '',   // https://trongrid.io
    'alchemy_api_key'    => '',   // https://alchemy.com
    'blockchair_api_key' => '',   // https://blockchair.com/api
    'db_host'            => 'localhost',
    'db_name'            => '',   // MySQL database name
    'db_user'            => '',   // MySQL user
    'db_pass'            => '',   // MySQL password
];
```

- [ ] **Step 2: Create the MySQL table on the server**

Run this SQL on your MySQL server (via phpMyAdmin, CLI, or Adminer):

```sql
CREATE TABLE IF NOT EXISTS events (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  session_id CHAR(36)     NOT NULL,
  event      VARCHAR(50)  NOT NULL,
  properties JSON,
  created_at DATETIME     DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_session (session_id),
  INDEX idx_event   (event),
  INDEX idx_created (created_at)
);
```

- [ ] **Step 3: Create `backend/api/track.php`**

```php
<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit;
}

const ALLOWED_EVENTS = [
    'app_start', 'wallet_added', 'wallet_edited',
    'config_imported', 'config_exported', 'config_saved',
    'refresh_all', 'pwa_installed',
];

$body = json_decode(file_get_contents('php://input'), true);
if (!is_array($body)) {
    http_response_code(400);
    exit;
}

$session_id = $body['session_id'] ?? '';
$event      = $body['event'] ?? '';
$properties = $body['properties'] ?? null;

// Validate UUID v4
if (!preg_match(
    '/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/',
    $session_id
)) {
    http_response_code(400);
    exit;
}

if (!in_array($event, ALLOWED_EVENTS, true)) {
    http_response_code(400);
    exit;
}

$config = require __DIR__ . '/../config.php';

try {
    $pdo = new PDO(
        "mysql:host={$config['db_host']};dbname={$config['db_name']};charset=utf8mb4",
        $config['db_user'],
        $config['db_pass'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    $stmt = $pdo->prepare(
        'INSERT INTO events (session_id, event, properties) VALUES (?, ?, ?)'
    );
    $stmt->execute([
        $session_id,
        $event,
        $properties !== null ? json_encode($properties) : null,
    ]);
    http_response_code(200);
    echo '{}';
} catch (Exception $e) {
    http_response_code(500);
    exit;
}
```

- [ ] **Step 4: Fill in `config.php` on the server with real DB credentials**

(This step is done on the server, not in the repo.)

- [ ] **Step 5: Verify endpoint**

After deploying, run:

```bash
curl -X POST https://your-domain.com/api/track \
  -H 'Content-Type: application/json' \
  -d '{"session_id":"12345678-1234-4234-a234-123456789012","event":"app_start"}'
```

Expected: `{}` with HTTP 200. Check MySQL: `SELECT * FROM events LIMIT 5;` — row should appear.

Test validation rejection:

```bash
curl -X POST https://your-domain.com/api/track \
  -H 'Content-Type: application/json' \
  -d '{"session_id":"not-a-uuid","event":"app_start"}'
```

Expected: HTTP 400.

- [ ] **Step 6: Commit**

```bash
git add backend/api/track.php backend/config.example.php
git commit -m "feat: add track.php endpoint and DB credentials to config.example"
```

---

## Task 7: Backend — `stats.php`

**Files:**
- Create: `backend/api/stats.php`

Context: Uses 60-second file cache (same pattern as `prices.php`). Returns JSON. Protected by Basic Auth (added in Task 8 — the file itself needs no auth logic).

- [ ] **Step 1: Create `backend/api/stats.php`**

```php
<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$cache_file = sys_get_temp_dir() . '/21stealth_stats.json';
$cache_ttl  = 60;

if (file_exists($cache_file) && time() - filemtime($cache_file) < $cache_ttl) {
    echo file_get_contents($cache_file);
    exit;
}

$config = require __DIR__ . '/../config.php';

try {
    $pdo = new PDO(
        "mysql:host={$config['db_host']};dbname={$config['db_name']};charset=utf8mb4",
        $config['db_user'],
        $config['db_pass'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    $unique_total = (int) $pdo->query(
        'SELECT COUNT(DISTINCT session_id) FROM events'
    )->fetchColumn();

    $active_today = (int) $pdo->query(
        "SELECT COUNT(DISTINCT session_id) FROM events WHERE DATE(created_at) = CURDATE()"
    )->fetchColumn();

    $active_7d = (int) $pdo->query(
        "SELECT COUNT(DISTINCT session_id) FROM events WHERE created_at >= NOW() - INTERVAL 7 DAY"
    )->fetchColumn();

    $active_30d = (int) $pdo->query(
        "SELECT COUNT(DISTINCT session_id) FROM events WHERE created_at >= NOW() - INTERVAL 30 DAY"
    )->fetchColumn();

    $returning = (int) $pdo->query(
        "SELECT COUNT(*) FROM (
            SELECT session_id FROM events
            GROUP BY session_id
            HAVING COUNT(DISTINCT DATE(created_at)) >= 2
         ) t"
    )->fetchColumn();

    $event_rows = $pdo->query(
        "SELECT event, COUNT(*) as cnt FROM events GROUP BY event ORDER BY cnt DESC"
    )->fetchAll(PDO::FETCH_ASSOC);
    $events_by_type = [];
    foreach ($event_rows as $row) {
        $events_by_type[$row['event']] = (int) $row['cnt'];
    }

    $day_rows = $pdo->query(
        "SELECT DATE(created_at) as date, COUNT(*) as cnt
         FROM events
         WHERE created_at >= NOW() - INTERVAL 30 DAY
         GROUP BY DATE(created_at)
         ORDER BY date DESC"
    )->fetchAll(PDO::FETCH_ASSOC);
    $events_by_day = array_map(
        fn($r) => ['date' => $r['date'], 'count' => (int) $r['cnt']],
        $day_rows
    );

    $result = json_encode([
        'unique_sessions_total' => $unique_total,
        'active_today'          => $active_today,
        'active_7d'             => $active_7d,
        'active_30d'            => $active_30d,
        'returning'             => $returning,
        'events_by_type'        => $events_by_type,
        'events_by_day'         => $events_by_day,
    ]);

    file_put_contents($cache_file, $result);
    echo $result;

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database error']);
}
```

- [ ] **Step 2: Verify (after deploying with Basic Auth in place)**

```bash
curl -u admin:yourpassword https://your-domain.com/api/stats
```

Expected: JSON with all keys. `unique_sessions_total` should be ≥ 1 if you tested Task 6.

- [ ] **Step 3: Commit**

```bash
git add backend/api/stats.php
git commit -m "feat: add stats.php with aggregated analytics metrics"
```

---

## Task 8: Backend — `stats-dashboard.php` + `.htaccess` protection

**Files:**
- Create: `backend/api/stats-dashboard.php`
- Modify: `backend/api/.htaccess`

Context: The dashboard is plain PHP-rendered HTML — no JS framework, no fetch calls. It queries the DB directly (reuses the stats query logic inline). The `.htaccess` currently only has URL rewrite rules; add a `<FilesMatch>` block below the existing rules.

- [ ] **Step 1: Update `backend/api/.htaccess`**

Add the FilesMatch block at the bottom of the existing file:

```apache
RewriteEngine On

# Strip .php extension: if the file without .php doesn't exist but with .php does, rewrite
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME}.php -f
RewriteRule ^(.+)$ $1.php [L]

<FilesMatch "^stats(-dashboard)?\.php$">
  AuthType Basic
  AuthName "21stealth Stats"
  AuthUserFile /var/www/.htpasswd
  Require valid-user
</FilesMatch>
```

Replace `/var/www/.htpasswd` with the actual absolute path on your server. Create the file with:

```bash
htpasswd -c /var/www/.htpasswd admin
```

(Enter your chosen password when prompted.)

- [ ] **Step 2: Create `backend/api/stats-dashboard.php`**

```php
<?php
$config = require __DIR__ . '/../config.php';

$stats = null;
$error = null;

try {
    $pdo = new PDO(
        "mysql:host={$config['db_host']};dbname={$config['db_name']};charset=utf8mb4",
        $config['db_user'],
        $config['db_pass'],
        [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );

    $unique_total = (int) $pdo->query('SELECT COUNT(DISTINCT session_id) FROM events')->fetchColumn();
    $active_today = (int) $pdo->query("SELECT COUNT(DISTINCT session_id) FROM events WHERE DATE(created_at) = CURDATE()")->fetchColumn();
    $active_7d    = (int) $pdo->query("SELECT COUNT(DISTINCT session_id) FROM events WHERE created_at >= NOW() - INTERVAL 7 DAY")->fetchColumn();
    $active_30d   = (int) $pdo->query("SELECT COUNT(DISTINCT session_id) FROM events WHERE created_at >= NOW() - INTERVAL 30 DAY")->fetchColumn();
    $returning    = (int) $pdo->query("SELECT COUNT(*) FROM (SELECT session_id FROM events GROUP BY session_id HAVING COUNT(DISTINCT DATE(created_at)) >= 2) t")->fetchColumn();

    $event_rows = $pdo->query("SELECT event, COUNT(*) as cnt FROM events GROUP BY event ORDER BY cnt DESC")->fetchAll(PDO::FETCH_ASSOC);

    $day_rows = $pdo->query("SELECT DATE(created_at) as date, COUNT(*) as cnt FROM events WHERE created_at >= NOW() - INTERVAL 30 DAY GROUP BY DATE(created_at) ORDER BY date DESC")->fetchAll(PDO::FETCH_ASSOC);

    $stats = compact('unique_total','active_today','active_7d','active_30d','returning','event_rows','day_rows');
} catch (Exception $e) {
    $error = $e->getMessage();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>21 Stealth — Analytics</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, sans-serif; background: #0d0d0d; color: #e2e2e2; padding: 2rem; }
  h1 { font-size: 1.5rem; font-weight: 700; margin-bottom: 2rem; color: #fff; }
  h2 { font-size: 1rem; font-weight: 600; margin: 2rem 0 1rem; color: #aaa; text-transform: uppercase; letter-spacing: 0.05em; }
  .cards { display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem; }
  .card { background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; padding: 1.25rem 1.5rem; min-width: 140px; }
  .card .value { font-size: 2rem; font-weight: 700; color: #fff; }
  .card .label { font-size: 0.75rem; color: #888; margin-top: 0.25rem; }
  table { width: 100%; border-collapse: collapse; background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 8px; overflow: hidden; }
  th, td { padding: 0.6rem 1rem; text-align: left; font-size: 0.875rem; }
  th { color: #888; font-weight: 500; border-bottom: 1px solid #2a2a2a; }
  tr + tr td { border-top: 1px solid #1e1e1e; }
  td:last-child { text-align: right; color: #ccc; }
  .error { color: #f87171; background: #2a1212; border: 1px solid #7f1d1d; border-radius: 8px; padding: 1rem; }
  .updated { font-size: 0.75rem; color: #555; margin-top: 2rem; }
</style>
</head>
<body>
<h1>21 Stealth — Analytics</h1>

<?php if ($error): ?>
  <p class="error">Database error: <?= htmlspecialchars($error) ?></p>
<?php else: ?>

<h2>Overview</h2>
<div class="cards">
  <div class="card"><div class="value"><?= $stats['unique_total'] ?></div><div class="label">Unique sessions (all time)</div></div>
  <div class="card"><div class="value"><?= $stats['active_today'] ?></div><div class="label">Active today</div></div>
  <div class="card"><div class="value"><?= $stats['active_7d'] ?></div><div class="label">Active last 7 days</div></div>
  <div class="card"><div class="value"><?= $stats['active_30d'] ?></div><div class="label">Active last 30 days</div></div>
  <div class="card"><div class="value"><?= $stats['returning'] ?></div><div class="label">Returning sessions</div></div>
</div>

<h2>Events by type</h2>
<table>
  <thead><tr><th>Event</th><th>Count</th></tr></thead>
  <tbody>
  <?php foreach ($stats['event_rows'] as $row): ?>
    <tr><td><?= htmlspecialchars($row['event']) ?></td><td><?= (int)$row['cnt'] ?></td></tr>
  <?php endforeach; ?>
  </tbody>
</table>

<h2>Events per day (last 30 days)</h2>
<table>
  <thead><tr><th>Date</th><th>Events</th></tr></thead>
  <tbody>
  <?php foreach ($stats['day_rows'] as $row): ?>
    <tr><td><?= htmlspecialchars($row['date']) ?></td><td><?= (int)$row['cnt'] ?></td></tr>
  <?php endforeach; ?>
  </tbody>
</table>

<p class="updated">Generated at <?= date('Y-m-d H:i:s') ?> UTC</p>

<?php endif; ?>
</body>
</html>
```

- [ ] **Step 3: Verify protection**

After deploying, open `https://your-domain.com/api/stats-dashboard` in browser. Expected: browser shows username/password dialog. Enter credentials → dashboard displays. Try without credentials → 401 Unauthorized.

Verify `track.php` is NOT protected (no auth dialog):

```bash
curl -I https://your-domain.com/api/track
```

Expected: 405 (POST required), no auth challenge.

- [ ] **Step 4: Commit**

```bash
git add backend/api/stats-dashboard.php backend/api/.htaccess
git commit -m "feat: add stats dashboard and Basic Auth protection"
```

---

## Task 9: End-to-end verification

- [ ] **Step 1: Open the app in browser with DevTools Network tab open**

Navigate through: add a wallet, edit it, import a config, export, save, click refresh. Confirm each action fires exactly one `track` request to `/api/track` with correct event name and properties.

- [ ] **Step 2: Check MySQL**

```sql
SELECT event, COUNT(*) as cnt FROM events GROUP BY event;
```

Expected: rows for each event you triggered.

- [ ] **Step 3: Open stats dashboard**

Navigate to `https://your-domain.com/api/stats-dashboard`. Confirm numbers match what you inserted.

- [ ] **Step 4: Confirm no events fire for auto-save**

Edit a wallet label. Wait 2 seconds. Confirm no `config_saved` track request appears in Network tab during the auto-save debounce period.

- [ ] **Step 5: Push**

```bash
git push
```
