# Analytics Tracking — Design Spec

**Date:** 2026-04-01  
**Status:** Under Review

## Problem

Before investing in marketing, the product owner needs to know how many people are actively using the app. There is currently no usage data.

## Goal

A lightweight, privacy-friendly analytics system that tracks button interactions and app starts, stores events in MySQL, and presents key metrics (unique users, active users, event breakdown) in a protected backend dashboard.

## Architecture

### Frontend: `src/services/analytics.js`

Pure JS module — no React. Exported functions:

```
initAnalytics()        → generates or retrieves session UUID from localStorage
track(event, props?)   → sends event via sendBeacon (fetch fallback), fire-and-forget
```

**Session ID:** Generated once via `crypto.randomUUID()`, stored in `localStorage` under key `21stealth_sid`. No personal data, no fingerprinting, no IP.

**`track()` behaviour:**
- Sends `POST /api/track` with JSON body `{ session_id, event, properties? }`
- Uses `navigator.sendBeacon()` if available, falls back to `fetch` with `keepalive: true`
- Never throws — all errors caught and silently discarded
- No retry logic

**Events tracked:**

| Event | Trigger | Properties |
|---|---|---|
| `app_start` | DashboardPage mount | — |
| `wallet_added` | Add Wallet form submit | `{ chain }` (first chain of new wallet) |
| `wallet_edited` | EditWalletModal save | — |
| `config_imported` | Successful import in ConfigActions | `{ encrypted: bool }` |
| `config_exported` | Successful export in ConfigActions | `{ encrypted: bool }` |
| `config_saved` | Successful save in ConfigActions | `{ encrypted: bool }` |
| `refresh_all` | Refresh button click | — |
| `pwa_installed` | PWA install accepted via InstallBanner | — |

### Backend: `backend/api/track.php`

Accepts `POST` only. Validates:
- `session_id` matches UUID v4 regex
- `event` is in a server-side whitelist (same list as table above)

On success: writes one row to `events` table, responds `200 OK` with empty body.  
On validation failure: responds `400` (client never reads this).  
On DB error: responds `500` (client never reads this).

DB credentials come from `backend/config.php` (existing pattern).

### Backend: `backend/api/stats.php`

Returns JSON with aggregated metrics. Protected by the same Basic Auth as the dashboard.

```json
{
  "unique_sessions_total": 142,
  "active_today": 8,
  "active_7d": 31,
  "active_30d": 97,
  "returning": 44,
  "events_by_type": { "app_start": 312, "wallet_added": 89, ... },
  "events_by_day": [{ "date": "2026-04-01", "count": 23 }, ...]
}
```

`returning` = sessions with events on ≥ 2 distinct calendar days.  
`events_by_day` covers the last 30 days.

### Backend: `backend/api/stats-dashboard.php`

Plain PHP-rendered HTML page. No JS framework. Inline CSS matching 21stealth dark color palette for readability. Displays all metrics from `stats.php` output.

Sections:
1. **Overview cards** — Unique total, active today, active 7d, active 30d, returning
2. **Events breakdown** — table: event name → count
3. **Events per day** — table: date → count (last 30 days)

### Database

```sql
CREATE TABLE events (
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

No IP address stored. No user agent stored.

### Access Control

**`.htaccess`** Basic Auth protects `/api/stats-dashboard` and `/api/stats`.

```apache
AuthType Basic
AuthName "21stealth Stats"
AuthUserFile /path/to/.htpasswd
Require valid-user
```

Password set via `htpasswd` CLI. Can be replaced with a PHP session login later without touching the rest of the system.

## Integration Points

### `src/main.jsx` or `src/App.jsx`

`initAnalytics()` called once at app bootstrap — before any routing.

### `src/pages/DashboardPage.jsx`

`track('app_start')` in a `useEffect` with empty deps (fires once on mount).

### `src/components/ui/AddWalletForm.jsx`

`track('wallet_added', { chain })` after successful wallet creation.

### `src/components/ui/EditWalletModal.jsx`

`track('wallet_edited')` in `handleSave` after `onSave()` call.

### `src/components/ui/ConfigActions.jsx`

- `track('config_imported', { encrypted })` after successful import
- `track('config_exported', { encrypted })` after successful export  
- `track('config_saved', { encrypted })` after successful save
- `track('refresh_all')` in `onRefreshAll` handler

### `src/components/ui/InstallBanner.jsx`

`track('pwa_installed')` when user accepts the install prompt.

## Privacy

- No IP addresses stored
- No user agent stored
- Session ID is a random UUID with no link to personal data
- All data stays on own server — no third-party services
- Disclose in Datenschutzerklärung as "anonyme Nutzungsstatistik"

## Out of Scope (v1)

- Admin login UI (Basic Auth is sufficient for now)
- Event funnels or conversion tracking
- Charts / visualisations in dashboard (tables are sufficient)
- Data export / CSV download
- Retention analysis beyond "returning sessions"
- Real-time updates in dashboard
