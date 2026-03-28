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
    wallets: wallets.map(({ addrTokens, addrStatus, addrError, tokens, status, errorMsg, derivedAddrs, ...w }) => w),
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
