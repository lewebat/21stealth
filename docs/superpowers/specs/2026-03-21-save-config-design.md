# Save / Auto-Save Config — Design Spec

**Date:** 2026-03-21
**Status:** Approved

## Goal

Add a "Save" button next to Import/Export. In Chrome/Edge (File System Access API), the button writes directly to a file the user picks — subsequent saves and auto-saves are silent. In Firefox, Save triggers a download (same as Export today). Nothing is ever stored in localStorage, cookies, or any persistent browser storage.

## Constraints

- **Zero persistent storage** — no localStorage, no IndexedDB, no cookies. The file handle lives only in RAM for the current tab session.
- **Firefox fallback** — File System Access API is not supported in Firefox. Save = download.
- **Encryption preserved** — Save respects the user's password choice. The password is held in RAM for the session (never written anywhere).

## File System Access API Availability

```js
const supportsFileAccess = typeof window.showSaveFilePicker === 'function'
```

When `false` (Firefox, Safari): Save always downloads. Auto-save is not available.

## Save Flow

### First Save (no handle yet)

1. User clicks "Save"
2. If `supportsFileAccess`: `showSaveFilePicker({ suggestedName: '21stealth-config.json' })` → user picks location → write → store `fileHandle` + `isEncrypted` + `password` in component state (RAM only)
3. If `!supportsFileAccess`: show Export modal → download

### Subsequent Saves (handle stored)

- Write directly to `fileHandle` via `handle.createWritable()` — no dialog, no download
- Uses stored `isEncrypted` + `password`

### Auto-Save

Triggers automatically after any wallet change, when:
- `fileHandle` is set (user has saved at least once this session)
- All wallets have finished loading (`wallets.every(w => w.status !== 'loading')`)
- `supportsFileAccess` is true

Implemented as a `useEffect` in `ConfigActions` watching `wallets` + `history`. Debounced 1 second to avoid saving mid-edit.

## `walletConfig.js`

New function:
```js
export async function saveToHandle(fileHandle, wallets, history, password) {
  // Same serialisation as exportConfig, but writes to fileHandle instead of downloading
  const json = JSON.stringify(buildConfig(wallets, history, password), null, 2)
  // If password: encrypt first (same AES-GCM as exportConfig)
  const writable = await fileHandle.createWritable()
  await writable.write(blob)
  await writable.close()
}
```

Extract the shared config-building + encryption logic from `exportConfig` into a private `buildConfigBlob(wallets, history, password)` helper. Both `exportConfig` and `saveToHandle` call it.

## `ConfigActions.jsx`

New state:
```js
const [fileHandle, setFileHandle] = useState(null)       // FileSystemFileHandle | null
const [savedPassword, setSavedPassword] = useState('')   // '' = unencrypted
const [isEncrypted, setIsEncrypted] = useState(false)
```

**Save button** added to the button cluster, disabled when `wallets.length === 0`:
- Label: "Save"
- If `!supportsFileAccess`: opens Export modal (existing flow)
- If `supportsFileAccess && !fileHandle`: opens Save modal (same as Export modal, user picks encryption), then calls `showSaveFilePicker` + `saveToHandle`, stores handle
- If `supportsFileAccess && fileHandle`: calls `saveToHandle` directly, no modal

**Auto-save `useEffect`**:
```js
useEffect(() => {
  if (!fileHandle) return
  if (wallets.length === 0) return
  if (wallets.some(w => w.status === 'loading')) return
  const timer = setTimeout(() => {
    saveToHandle(fileHandle, wallets, history, savedPassword ? savedPassword : undefined)
  }, 1000)
  return () => clearTimeout(timer)
}, [wallets, history, fileHandle, savedPassword])
```

**Save modal** — reuses the existing Export modal UI. No new modal needed.

## UX Details

- Save button is always visible (not just after first save)
- In Firefox: Save button works exactly like Export (download) — users understand it
- Auto-save gives no visual feedback (silent) — this is intentional to avoid distraction
- If `showSaveFilePicker` is cancelled by the user, no handle is stored, no error shown
- The handle is per-session only — closing and reopening the tab resets it

## Files Changed

| Action | File | Purpose |
|--------|------|---------|
| Modify | `src/services/walletConfig.js` | Extract buildConfigBlob helper, add saveToHandle |
| Modify | `src/components/ui/ConfigActions.jsx` | Save button, fileHandle state, auto-save effect |
| No change | `src/pages/DashboardPage.jsx` | Already passes wallets + history to ConfigActions |
