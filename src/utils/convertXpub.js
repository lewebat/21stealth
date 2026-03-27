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
