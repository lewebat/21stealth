# Save / Auto-Save Config — Design Spec

**Date:** 2026-03-21
**Status:** Approved

## Goal

Add a "Save" button next to Import/Export. In Chrome/Edge (File System Access API), the button writes directly to a file the user picks — subsequent saves and auto-saves are silent. In Firefox/Safari, Save triggers a download (same as Export today). Nothing is ever stored in localStorage, cookies, or any persistent browser storage.

## Constraints

- **Zero persistent storage** — no localStorage, no IndexedDB, no cookies. The file handle lives only in RAM for the current tab session.
- **Firefox/Safari fallback** — File System Access API is not supported in Firefox or Safari. Save = download.
- **Encryption preserved** — Save respects the user's password choice. The password is held in RAM for the session (never written anywhere).

## File System Access API Availability

```js
const supportsFileAccess = typeof window.showSaveFilePicker === 'function'
```

When `false` (Firefox, Safari): Save always downloads. Auto-save is not available.

## Save Flow

### First Save (no handle yet)

1. User clicks "Save"
2. **If `!supportsFileAccess`** (Firefox/Safari): show Export modal → download (existing flow)
3. **If `supportsFileAccess`**: show Save modal (same UI as Export modal — password prompt) → on confirm:
   - Call `showSaveFilePicker({ suggestedName: '21stealth-config.json' })` — always `.json`, not `.encrypted.json` (the encrypted variant is only used by the existing download export)
   - Write file via `saveToHandle`
   - Store `fileHandle`, `isEncrypted`, `savedPassword` in component state (RAM only)
4. If `showSaveFilePicker` is cancelled by the user → no handle stored, no error shown

### Subsequent Saves (handle stored)

- Call `saveToHandle(fileHandle, wallets, history, isEncrypted ? savedPassword : undefined)` directly — no modal, no dialog
- If write fails (file moved, permissions changed): clear `fileHandle` state → next Save click prompts for file picker again

### Auto-Save

Triggers automatically after any wallet change, when:
- `fileHandle` is set (user has saved at least once this session)
- `supportsFileAccess` is true
- All wallets have finished loading (`wallets.every(w => w.status !== 'loading')`)
- `wallets.length > 0`

If `saveToHandle` throws during auto-save: clear `fileHandle` (same error handling as manual save).

## `walletConfig.js`

Extract shared config-building logic from `exportConfig` into a private `buildConfigBlob(wallets, history, password)` helper that returns a `Blob`. Both `exportConfig` (download) and `saveToHandle` (file handle write) call this helper.

```js
// Private helper — returns a Blob (plain JSON or encrypted)
async function buildConfigBlob(wallets, history, password) {
  const config = {
    version: '1',
    exportedAt: new Date().toISOString(),
    wallets: wallets.map(({ addrTokens, addrStatus, addrError, tokens, status, errorMsg, ...w }) => w),
    history: history.length > 0 ? history : undefined,
  }
  const json = JSON.stringify(config, null, 2)
  if (password) {
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const iv   = crypto.getRandomValues(new Uint8Array(12))
    const key  = await deriveKey(password, salt)
    const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(json))
    const file = { '21stealth': true, v: 1, salt: toBase64(salt), iv: toBase64(iv), data: toBase64(ciphertext) }
    return new Blob([JSON.stringify(file)], { type: 'application/json' })
  }
  return new Blob([json], { type: 'application/json' })
}

// New export
export async function saveToHandle(fileHandle, wallets, history, password) {
  const blob = await buildConfigBlob(wallets, history, password)
  const writable = await fileHandle.createWritable()
  await writable.write(blob)
  await writable.close()
}
```

`exportConfig` is updated to call `buildConfigBlob` internally instead of duplicating the logic.

## `ConfigActions.jsx`

New state:
```js
const [fileHandle, setFileHandle] = useState(null)     // FileSystemFileHandle | null
const [savedPassword, setSavedPassword] = useState('') // '' = unencrypted
const [isEncrypted, setIsEncrypted] = useState(false)
```

**Save button** added to the button cluster, disabled when `wallets.length === 0`:

```js
async function handleSave() {
  if (!supportsFileAccess) {
    // Firefox/Safari: fall back to download export
    setModal({ type: 'export' })
    return
  }
  if (fileHandle) {
    // Subsequent save: write directly
    try {
      await saveToHandle(fileHandle, wallets, history, isEncrypted ? savedPassword : undefined)
    } catch {
      setFileHandle(null) // prompt again next time
    }
    return
  }
  // First save: show modal to pick password, then file picker
  setModal({ type: 'save' })
}
```

When the Save modal is confirmed:
```js
async function handleSaveSubmit(usePassword) {
  const pwd = usePassword ? password : undefined
  try {
    const handle = await window.showSaveFilePicker({ suggestedName: '21stealth-config.json' })
    await saveToHandle(handle, wallets, history, pwd)
    setFileHandle(handle)
    setIsEncrypted(usePassword)
    setSavedPassword(pwd ?? '')
    closeModal()
  } catch {
    // User cancelled picker or write failed — no handle stored
    closeModal()
  }
}
```

**Auto-save `useEffect`**:
```js
useEffect(() => {
  if (!fileHandle || wallets.length === 0) return
  if (wallets.some(w => w.status === 'loading')) return
  const timer = setTimeout(async () => {
    try {
      await saveToHandle(fileHandle, wallets, history, isEncrypted ? savedPassword : undefined)
    } catch {
      setFileHandle(null) // prompt again next time
    }
  }, 1000)
  return () => clearTimeout(timer)
}, [wallets, history, fileHandle, savedPassword, isEncrypted])
```

**Save modal** — reuses the existing Export modal UI. No new modal component needed. Add `type: 'save'` to the existing modal state.

## UX Details

- Save button is always visible (not just after first save)
- In Firefox/Safari: Save button opens the Export modal → download — users get a functional Save, just with a download
- Auto-save gives no visual feedback (silent) — intentional to avoid distraction
- Errors during auto-save clear the file handle silently — user is prompted again on next manual Save click
- The handle is per-session only — closing and reopening the tab resets it

## Files Changed

| Action | File | Purpose |
|--------|------|---------|
| Modify | `src/services/walletConfig.js` | Extract buildConfigBlob helper, add saveToHandle export |
| Modify | `src/components/ui/ConfigActions.jsx` | Save button, fileHandle state, auto-save effect |
| No change | `src/pages/DashboardPage.jsx` | Already passes wallets + history to ConfigActions |
