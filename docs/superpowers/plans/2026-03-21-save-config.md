# Save / Auto-Save Config Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Save button next to Import/Export. In Chrome/Edge (File System Access API), saves directly to a file the user picks; subsequent saves and auto-saves are silent. In Firefox/Safari, Save triggers a download (same as Export).

**Architecture:** `walletConfig.js` gains a shared `buildConfigBlob()` helper and a new `saveToHandle()` export. `ConfigActions.jsx` gets three new RAM-only state values (`fileHandle`, `savedPassword`, `isEncrypted`) plus a Save button, a `handleSave`/`handleSaveSubmit` flow, and an auto-save `useEffect`. No localStorage, no cookies.

**Tech Stack:** React, File System Access API (`window.showSaveFilePicker`), Web Crypto API (existing), no test framework in this project.

---

## File Map

| Action | File | Change |
|--------|------|--------|
| Modify | `src/services/walletConfig.js` | Extract `buildConfigBlob()` private helper, add `saveToHandle()` export, refactor `exportConfig` to use helper |
| Modify | `src/components/ui/ConfigActions.jsx` | Save button, fileHandle/savedPassword/isEncrypted state, handleSave, handleSaveSubmit, auto-save useEffect |

---

### Task 1: Refactor `walletConfig.js` — extract `buildConfigBlob`, add `saveToHandle`

**Files:**
- Modify: `src/services/walletConfig.js`

**Context:** Currently `exportConfig` builds the blob inline. Extract that logic into a private `buildConfigBlob(wallets, history, password)` that returns a `Blob`. Both `exportConfig` (download) and the new `saveToHandle` (file handle write) call this helper. This avoids duplicating the encryption logic.

The `saveToHandle` export takes a `FileSystemFileHandle` (from `showSaveFilePicker`), writes the blob, and closes the writable stream. If it throws, the caller handles the error.

- [ ] **Step 1: Rewrite walletConfig.js**

```js
function toBase64(buf) {
  let binary = ''
  const bytes = new Uint8Array(buf)
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}

function fromBase64(s) {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0))
}

async function deriveKey(password, salt) {
  const enc = new TextEncoder()
  const raw = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    raw,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

// Normalise any wallet shape to { id, label, entries }
// Handles: new shape (entries), old shape (chain + addresses), older shape (chain + address)
function normalise(w) {
  if (w.entries) return { id: w.id, label: w.label, entries: w.entries }
  const addresses = w.addresses ?? (w.address ? [w.address] : [])
  return { id: w.id, label: w.label, entries: [{ chain: w.chain, addresses }] }
}

// Private helper — returns a Blob (plain JSON or AES-GCM encrypted)
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

export async function exportConfig(wallets, history, password) {
  const blob = await buildConfigBlob(wallets, history, password)
  const filename = password ? '21stealth-config.encrypted.json' : '21stealth-config.json'
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export async function saveToHandle(fileHandle, wallets, history, password) {
  const blob = await buildConfigBlob(wallets, history, password)
  const writable = await fileHandle.createWritable()
  await writable.write(blob)
  await writable.close()
}

export async function importConfig(file, password) {
  const text = await file.text()
  const parsed = JSON.parse(text)

  if (parsed['21stealth'] === true) {
    if (!password) throw new NeedsPasswordError()
    const { salt, iv, data } = parsed
    const key = await deriveKey(password, fromBase64(salt))
    let plaintext
    try {
      plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromBase64(iv) }, key, fromBase64(data))
    } catch {
      throw new Error('Wrong password')
    }
    const config = JSON.parse(new TextDecoder().decode(plaintext))
    if (config.version !== '1' || !Array.isArray(config.wallets)) throw new Error('Invalid config format')
    const wallets = config.wallets.map(normalise)
    return { wallets, history: config.history }
  }

  if (parsed.version !== '1' || !Array.isArray(parsed.wallets)) throw new Error('Invalid config format')
  const wallets = parsed.wallets.map(normalise)
  return { wallets, history: parsed.history }
}

export class NeedsPasswordError extends Error {
  constructor() { super('Password required') }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/walletConfig.js
git commit -m "feat: walletConfig extracts buildConfigBlob helper, adds saveToHandle export"
```

---

### Task 2: Add Save button and file handle logic to `ConfigActions.jsx`

**Files:**
- Modify: `src/components/ui/ConfigActions.jsx`

**Context:** Three new RAM-only state values: `fileHandle` (FileSystemFileHandle | null), `savedPassword` (string), `isEncrypted` (bool). A Save button sits in the button cluster alongside Import/Export, disabled when `wallets.length === 0`.

`handleSave` logic:
- If `!supportsFileAccess` (Firefox/Safari): open export modal → download
- If `fileHandle` set: write directly via `saveToHandle`, clear `fileHandle` on error
- If no handle: open save modal (type: `'save'`) → password prompt

`handleSaveSubmit`: shows the file picker (`showSaveFilePicker`), writes, stores handle. User cancel is caught silently.

Auto-save `useEffect`: watches `wallets`, `history`, `fileHandle`. Debounced 1 second. Only runs when `fileHandle` set, wallets not loading, and at least one wallet. Clears `fileHandle` on write error.

The Save modal reuses the existing Export modal UI — same password prompt. No new modal component needed; just add `type: 'save'` branch.

`supportsFileAccess` is derived once at module level (not per-render) since the API is available or not for the entire browser session.

- [ ] **Step 1: Rewrite ConfigActions.jsx**

```jsx
import { useEffect, useRef, useState } from 'react'
import { exportConfig, importConfig, saveToHandle, NeedsPasswordError } from '@/services/walletConfig'
import Button from './Button'
import { FormGroup, Input } from './Form'
import { Modal } from './Modal'

const supportsFileAccess = typeof window.showSaveFilePicker === 'function'

export function ConfigActions({ wallets, history, onImport }) {
  const fileInputRef = useRef(null)
  const [modal, setModal] = useState(null) // { type: 'export' } | { type: 'import', file } | { type: 'save' }
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  // RAM-only save state — lost on tab close/reload (intentional)
  const [fileHandle, setFileHandle] = useState(null)
  const [savedPassword, setSavedPassword] = useState('')
  const [isEncrypted, setIsEncrypted] = useState(false)

  const closeModal = () => { setModal(null); setPassword(''); setError('') }

  // Auto-save: triggers 1s after wallets/history change when a handle is stored
  useEffect(() => {
    if (!supportsFileAccess || !fileHandle || wallets.length === 0) return
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

  async function handleExportSubmit(encrypted) {
    await exportConfig(wallets, history, encrypted ? password : undefined)
    closeModal()
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    try {
      const { wallets: imported, history: importedHistory } = await importConfig(file)
      onImport(imported, importedHistory)
    } catch (err) {
      if (err instanceof NeedsPasswordError) {
        setModal({ type: 'import', file })
      } else {
        alert(err instanceof Error ? err.message : 'Import failed')
      }
    }
  }

  async function handleImportSubmit() {
    if (modal?.type !== 'import') return
    setError('')
    try {
      const { wallets: imported, history: importedHistory } = await importConfig(modal.file, password)
      onImport(imported, importedHistory)
      closeModal()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    }
  }

  return (
    <>
      <div className="cluster cluster-sm">
        <Button variant="secondary" size="sm" onClick={() => fileInputRef.current?.click()}>
          Import
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setModal({ type: 'export' })} disabled={wallets.length === 0}>
          Export
        </Button>
        <Button variant="secondary" size="sm" onClick={handleSave} disabled={wallets.length === 0}>
          Save
        </Button>
        <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileChange} className="visually-hidden" />
      </div>

      {/* Export Modal */}
      <Modal isOpen={modal?.type === 'export'} onClose={closeModal} title="Export config" size="sm">
        <Modal.Body>
          <div className="stack stack-md">
            <p className="text-body text-text-muted">
              Encrypt the file with a password — without a password it will be stored in plain text.
            </p>
            <FormGroup label="Password" htmlFor="export-password" helper="Leave empty for unencrypted export">
              <Input
                id="export-password"
                type="password"
                placeholder="Password (optional)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </FormGroup>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeModal}>Cancel</Button>
          <Button variant="primary" onClick={() => handleExportSubmit(password.length > 0)}>
            {password.length > 0 ? 'Export encrypted' : 'Export unencrypted'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Save Modal (Chrome/Edge first save — reuses Export UI) */}
      <Modal isOpen={modal?.type === 'save'} onClose={closeModal} title="Save config" size="sm">
        <Modal.Body>
          <div className="stack stack-md">
            <p className="text-body text-text-muted">
              Choose a file to save your config to. Subsequent saves will update this file automatically.
              Encrypt the file with a password — without a password it will be stored in plain text.
            </p>
            <FormGroup label="Password" htmlFor="save-password" helper="Leave empty for unencrypted save">
              <Input
                id="save-password"
                type="password"
                placeholder="Password (optional)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </FormGroup>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeModal}>Cancel</Button>
          <Button variant="primary" onClick={() => handleSaveSubmit(password.length > 0)}>
            {password.length > 0 ? 'Choose file & save encrypted' : 'Choose file & save'}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Import Modal */}
      <Modal isOpen={modal?.type === 'import'} onClose={closeModal} title="Encrypted config" size="sm">
        <Modal.Body>
          <div className="stack stack-md">
            <p className="text-body text-text-muted">Enter the password to decrypt this file.</p>
            <FormGroup label="Password" htmlFor="import-password" error={error}>
              <Input
                id="import-password"
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError('') }}
                onKeyDown={(e) => e.key === 'Enter' && handleImportSubmit()}
                autoFocus
                state={error ? 'error' : undefined}
              />
            </FormGroup>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeModal}>Cancel</Button>
          <Button variant="primary" onClick={handleImportSubmit}>Decrypt & Import</Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}
```

- [ ] **Step 2: Manual verification (Chrome/Edge)**

Start `npm run dev`. In Chrome:
1. Add a wallet, wait for it to load
2. Click "Save" → password modal appears → click "Choose file & save" without a password → file picker opens → pick a location → file is written
3. Edit the wallet label → after ~1 second the file updates silently (open it to verify)
4. Click "Save" again → file updates directly (no modal)
5. Manually move/delete the saved file → click "Save" → modal reappears asking for a new file

- [ ] **Step 3: Manual verification (Firefox)**

In Firefox:
1. Click "Save" → Export modal appears (same as clicking Export) → download triggered

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/ConfigActions.jsx
git commit -m "feat: ConfigActions adds Save button with File System Access API and auto-save"
```
