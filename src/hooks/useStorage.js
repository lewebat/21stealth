import { useState, useCallback, useRef, useEffect } from 'react'
import { getStorageMeta, saveConfig, loadConfig } from '@/services/storage'

/**
 * Manages IndexedDB persistence lifecycle.
 *
 * On mount:
 *   - No data → storageReady immediately, autoLoadData = null
 *   - Unencrypted data → loads it, sets autoLoadData, then storageReady
 *   - Encrypted data → sets isLocked = true (caller must show unlock modal)
 *
 * Exposes:
 *   autoLoadData         { wallets, history } | null  — data loaded on mount (unencrypted case)
 *   isLocked             bool                          — encrypted data waiting for password
 *   storageReady         bool                          — mount check complete, safe to render
 *   unlock(pw)           async → { wallets, history }  — decrypts and returns data, throws on wrong pw
 *   save(w, h)           debounced 500ms write
 *   saveImmediate(w, h)  immediate write, cancels pending debounce
 *   setSessionPassword(pw | null)  — sync encryption state after import/save-modal changes
 */
export function useStorage() {
  const [isLocked, setIsLocked] = useState(false)
  const [storageReady, setStorageReady] = useState(false)
  const [autoLoadData, setAutoLoadData] = useState(null)
  const sessionPasswordRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    getStorageMeta()
      .then(async (meta) => {
        if (meta.hasData && meta.isEncrypted) {
          setIsLocked(true)
          // storageReady stays false until unlock() is called
        } else if (meta.hasData && !meta.isEncrypted) {
          try {
            const data = await loadConfig(null)
            setAutoLoadData(data)
          } catch {
            // Corrupt data — clearConfig() was already called inside loadConfig
          }
          setStorageReady(true)
        } else {
          setStorageReady(true)
        }
      })
      .catch(() => setStorageReady(true)) // IndexedDB unavailable — start empty
  }, [])

  /** Decrypt encrypted IndexedDB data. Throws Error('Wrong password') on failure. */
  const unlock = useCallback(async (password) => {
    const data = await loadConfig(password) // throws on wrong password
    sessionPasswordRef.current = password
    setIsLocked(false)
    setStorageReady(true)
    return data
  }, [])

  /** Update session password after file save/import changes encryption settings. */
  const setSessionPassword = useCallback((password) => {
    sessionPasswordRef.current = password ?? null
  }, [])

  /** Debounced 500ms auto-save. Resets timer on every call. */
  const save = useCallback((wallets, history) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      saveConfig(wallets, history, sessionPasswordRef.current).catch(() => {})
    }, 500)
  }, [])

  /** Immediate save. Cancels any pending debounced save first. */
  const saveImmediate = useCallback((wallets, history) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    saveConfig(wallets, history, sessionPasswordRef.current).catch(() => {})
  }, [])

  return { isLocked, storageReady, autoLoadData, unlock, save, saveImmediate, setSessionPassword }
}
