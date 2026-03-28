import { BLOCKCHAIN_API } from './blockchainApi'

const TTL = 60 * 60 * 1000 // 1 hour
let cached = null
let cachedAt = 0

export async function getPriceHistory() {
  if (cached && Date.now() - cachedAt < TTL) return cached
  const res = await fetch(BLOCKCHAIN_API.priceHistory)
  if (!res.ok) throw new Error('Failed to fetch price history')
  cached = await res.json()
  cachedAt = Date.now()
  return cached
}
