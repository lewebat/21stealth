import { detectChain } from './detectChain'

const XPUB_PATTERNS = [
  { re: /^(xpub|ypub|zpub)[a-km-zA-HJ-NP-Z1-9]{107,113}$/, chain: 'btc' },
  { re: /^(Ltub|Mtub)[a-km-zA-HJ-NP-Z1-9]{107,113}$/,      chain: 'ltc' },
  { re: /^dgub[a-km-zA-HJ-NP-Z1-9]{103,109}$/,              chain: 'doge' },
]

/**
 * Detects whether input is an address or xPub key.
 * Returns { chain, type: 'address'|'xpub' } or null.
 */
export function detectInput(value) {
  const v = value.trim()
  if (!v) return null

  for (const { re, chain } of XPUB_PATTERNS) {
    if (re.test(v)) return { chain, type: 'xpub' }
  }

  const chain = detectChain(v)
  if (chain) return { chain, type: 'address' }

  return null
}
