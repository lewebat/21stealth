// IndexedDB: db '21stealth', store 'config', key 'main'
const DB_NAME = '21stealth'
const STORE_NAME = 'config'
const RECORD_KEY = 'main'

// --- Crypto helpers (mirrors walletConfig.js) ---
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

// --- IndexedDB helpers ---
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = (e) => e.target.result.createObjectStore(STORE_NAME)
    req.onsuccess = (e) => resolve(e.target.result)
    req.onerror = () => reject(req.error)
  })
}

async function getRecord() {
  let db
  try {
    db = await openDB()
  } catch {
    return null  // IndexedDB unavailable — treat as no data
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).get(RECORD_KEY)
    req.onsuccess = () => { db.close(); resolve(req.result ?? null) }
    req.onerror = () => { db.close(); reject(req.error) }
  })
}

async function putRecord(value) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(value, RECORD_KEY)
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror    = () => { db.close(); reject(tx.error) }
    tx.onabort    = () => { db.close(); reject(tx.error) }
  })
}

async function deleteRecord() {
  let db
  try {
    db = await openDB()
  } catch {
    return  // IndexedDB unavailable — nothing to delete
  }
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).delete(RECORD_KEY)
    tx.oncomplete = () => { db.close(); resolve() }
    tx.onerror    = () => { db.close(); reject(tx.error) }
    tx.onabort    = () => { db.close(); reject(tx.error) }
  })
}

function stripWallet({ addrTokens, addrStatus, addrError, tokens, status, errorMsg, derivedAddrs, ...clean }) {
  return clean
}

// --- Public API ---

/**
 * Returns { hasData, isEncrypted } without decrypting.
 * Reads only the envelope marker — safe to call without a password.
 * Returns { hasData: false } if IndexedDB is unavailable.
 */
export async function getStorageMeta() {
  try {
    const record = await getRecord()
    if (!record) return { hasData: false, isEncrypted: false }
    if (record['21stealth'] === true) return { hasData: true, isEncrypted: true }
    return { hasData: true, isEncrypted: false }
  } catch {
    return { hasData: false, isEncrypted: false }
  }
}

/**
 * Saves wallets + history to IndexedDB.
 * Encrypts if password is provided, stores plain JSON otherwise.
 * Strips runtime state (tokens, status, etc.) before saving.
 */
export async function saveConfig(wallets, history, password) {
  const config = {
    version: '1',
    wallets: wallets.map(stripWallet),
    history: history.length > 0 ? history : undefined,
  }
  const json = JSON.stringify(config)

  if (password) {
    const salt = crypto.getRandomValues(new Uint8Array(16))
    const iv = crypto.getRandomValues(new Uint8Array(12))
    const key = await deriveKey(password, salt)
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      new TextEncoder().encode(json)
    )
    await putRecord({ '21stealth': true, v: 1, salt: toBase64(salt), iv: toBase64(iv), data: toBase64(ciphertext) })
  } else {
    await putRecord(config)
  }
}

/**
 * Loads and decrypts config from IndexedDB.
 * Throws Error('Wrong password') on decryption failure.
 * Throws Error('Corrupt config') + clears IndexedDB on invalid structure.
 * Normalises missing history to [].
 */
export async function loadConfig(password) {
  const record = await getRecord()
  if (!record) throw new Error('No saved config')

  let config
  if (record['21stealth'] === true) {
    if (!password) throw new Error('Wrong password')
    const key = await deriveKey(password, fromBase64(record.salt))
    let plaintext
    try {
      plaintext = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: fromBase64(record.iv) },
        key,
        fromBase64(record.data)
      )
    } catch {
      throw new Error('Wrong password')
    }
    config = JSON.parse(new TextDecoder().decode(plaintext))
  } else {
    config = record
  }

  if (config.version !== '1' || !Array.isArray(config.wallets)) {
    await clearConfig()
    throw new Error('Corrupt config')
  }

  return { wallets: config.wallets, history: config.history ?? [] }
}

/** Removes the stored config from IndexedDB. */
export async function clearConfig() {
  await deleteRecord()
}
