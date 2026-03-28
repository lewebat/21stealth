import { useEffect, useRef, useState } from 'react'
import { Eye, EyeOff, RefreshCw } from 'lucide-react'
import { exportConfig, importConfig, NeedsPasswordError, saveToHandle } from '@/services/walletConfig'
import Button from './Button'
import { FormGroup, Input } from './Form'
import { Modal } from './Modal'
import useUIStore from '@store/useUIStore'

const supportsFileAccess = typeof window.showSaveFilePicker === 'function'

export function ConfigActions({ wallets, history, onImport, onRefreshAll }) {
  const fileInputRef = useRef(null)
  const [modal, setModal] = useState(null) // { type: 'export' } | { type: 'import', file } | { type: 'save' }
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [fileHandle, setFileHandle] = useState(null)
  const [savedPassword, setSavedPassword] = useState('')
  const [isEncrypted, setIsEncrypted] = useState(false)
  const [savedFlash, setSavedFlash] = useState(false)
  const savedFlashRef = useRef(null)
  const addAppNotification    = useUIStore((s) => s.addAppNotification)
  const dismissAppNotification = useUIStore((s) => s.dismissAppNotification)

  const closeModal = () => { setModal(null); setPassword(''); setPasswordConfirm(''); setError(''); setShowPassword(false) }

  function flashSaved() {
    if (savedFlashRef.current) clearTimeout(savedFlashRef.current)
    setSavedFlash(true)
    dismissAppNotification('auto-save-failed')
    savedFlashRef.current = setTimeout(() => setSavedFlash(false), 2000)
  }

  useEffect(() => {
    if (!supportsFileAccess || !fileHandle || wallets.length === 0) return
    if (wallets.some(w => w.status === 'loading')) return
    const timer = setTimeout(async () => {
      try {
        await saveToHandle(fileHandle, wallets, history, isEncrypted ? savedPassword : undefined)
      } catch {
        setFileHandle(null)
        addAppNotification({ id: 'auto-save-failed', type: 'warning', message: 'Auto-save failed — click Save to reconnect your file.' })
      }
    }, 1000)
    return () => clearTimeout(timer)
  }, [wallets, history, fileHandle, savedPassword, isEncrypted, addAppNotification])

  async function handleExportSubmit(encrypted) {
    await exportConfig(wallets, history, encrypted ? password : undefined)
    closeModal()
  }

  async function handleImport() {
    if (supportsFileAccess) {
      try {
        const [handle] = await window.showOpenFilePicker({
          types: [{ description: '21stealth Config', accept: { 'application/json': ['.21s'] } }]
        })
        const file = await handle.getFile()
        try {
          const { wallets: imported, history: importedHistory } = await importConfig(file)
          setFileHandle(handle)
          setIsEncrypted(false)
          setSavedPassword('')
          onImport(imported, importedHistory)
        } catch (err) {
          if (err instanceof NeedsPasswordError) {
            setModal({ type: 'import', file, handle })
          } else {
            alert(err instanceof Error ? err.message : 'Import failed')
          }
        }
      } catch {
        // user cancelled
      }
    } else {
      fileInputRef.current?.click()
    }
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
      if (modal.handle) {
        setFileHandle(modal.handle)
        setIsEncrypted(true)
        setSavedPassword(password)
      }
      onImport(imported, importedHistory)
      closeModal()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
    }
  }

  async function handleSave() {
    if (!supportsFileAccess) {
      setModal({ type: 'export' })
      return
    }
    if (fileHandle) {
      try {
        await saveToHandle(fileHandle, wallets, history, isEncrypted ? savedPassword : undefined)
        flashSaved()
      } catch {
        setFileHandle(null)
      }
      return
    }
    setModal({ type: 'save' })
  }

  async function handleSaveSubmit(usePassword) {
    const pwd = usePassword ? password : undefined
    try {
      const handle = await window.showSaveFilePicker({ suggestedName: '21stealth-config.21s' })
      await saveToHandle(handle, wallets, history, pwd)
      setFileHandle(handle)
      setIsEncrypted(usePassword)
      setSavedPassword(pwd ?? '')
      closeModal()
      flashSaved()
    } catch {
      closeModal()
    }
  }

  return (
    <>
      <div className="cluster cluster-sm">
        <Button variant="secondary" size="sm" onClick={onRefreshAll} aria-label="Refresh all">
          <RefreshCw size={14} />
        </Button>
        <Button variant="secondary" size="sm" onClick={handleImport}>
          Import
        </Button>
        <Button variant="secondary" size="sm" onClick={() => setModal({ type: 'export' })} disabled={wallets.length === 0}>
          Export
        </Button>
        <Button variant="secondary" size="sm" onClick={handleSave} disabled={wallets.length === 0}>
          {savedFlash ? 'Saved ✓' : 'Save'}
        </Button>
        <input ref={fileInputRef} type="file" accept=".21s" onChange={handleFileChange} className="visually-hidden" />
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
                type={showPassword ? 'text' : 'password'}
                placeholder="Password (optional)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                iconRight={<button type="button" onClick={() => setShowPassword(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex' }}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>}
              />
            </FormGroup>
            {password.length > 0 && (
              <FormGroup label="Confirm password" htmlFor="export-password-confirm" error={passwordConfirm.length > 0 && password !== passwordConfirm ? 'Passwords do not match' : undefined}>
                <Input
                  id="export-password-confirm"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Repeat password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  state={passwordConfirm.length > 0 && password !== passwordConfirm ? 'error' : undefined}
                  iconRight={<button type="button" onClick={() => setShowPassword(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex' }}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>}
                />
              </FormGroup>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeModal}>Cancel</Button>
          <Button variant="primary" onClick={() => handleExportSubmit(password.length > 0)} disabled={password.length > 0 && password !== passwordConfirm}>
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
                type={showPassword ? 'text' : 'password'}
                placeholder="Password (optional)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                iconRight={<button type="button" onClick={() => setShowPassword(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex' }}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>}
              />
            </FormGroup>
            {password.length > 0 && (
              <FormGroup label="Confirm password" htmlFor="save-password-confirm" error={passwordConfirm.length > 0 && password !== passwordConfirm ? 'Passwords do not match' : undefined}>
                <Input
                  id="save-password-confirm"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Repeat password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  state={passwordConfirm.length > 0 && password !== passwordConfirm ? 'error' : undefined}
                  iconRight={<button type="button" onClick={() => setShowPassword(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex' }}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>}
                />
              </FormGroup>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeModal}>Cancel</Button>
          <Button variant="primary" onClick={() => handleSaveSubmit(password.length > 0)} disabled={password.length > 0 && password !== passwordConfirm}>
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
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError('') }}
                onKeyDown={(e) => e.key === 'Enter' && handleImportSubmit()}
                autoFocus
                state={error ? 'error' : undefined}
                iconRight={<button type="button" onClick={() => setShowPassword(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', display: 'flex' }}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button>}
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
