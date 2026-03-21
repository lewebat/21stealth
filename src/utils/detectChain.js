export function detectChain(address) {
  const a = address.trim()

  if (/^0x[0-9a-fA-F]{40}$/.test(a)) return 'eth'
  if (/^T[1-9A-HJ-NP-Za-km-z]{33}$/.test(a)) return 'trx'
  if (/^1[1-9A-HJ-NP-Za-km-z]{24,33}$/.test(a)) return 'btc'
  if (/^3[1-9A-HJ-NP-Za-km-z]{24,33}$/.test(a)) return 'btc'
  if (/^bc1[0-9a-z]{6,87}$/.test(a)) return 'btc'
  if (/^[LM][1-9A-HJ-NP-Za-km-z]{25,34}$/.test(a)) return 'ltc'
  if (/^ltc1[0-9a-z]{6,87}$/.test(a)) return 'ltc'
  if (/^D[1-9A-HJ-NP-Za-km-z]{25,34}$/.test(a)) return 'doge'
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(a)) return 'sol'

  return null
}
