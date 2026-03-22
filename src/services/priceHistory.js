import { BLOCKCHAIN_API } from './blockchainApi'

// { bitcoin: { '2026-03-01': 85000, ... }, ethereum: { ... }, ... }
let cached = null

export async function getPriceHistory() {
  if (cached) return cached
  const res = await fetch(BLOCKCHAIN_API.priceHistory)
  if (!res.ok) throw new Error('Failed to fetch price history')
  cached = await res.json()
  return cached
}
