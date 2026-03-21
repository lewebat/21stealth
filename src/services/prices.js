import { BLOCKCHAIN_API } from './blockchainApi'

let cachedPrices = null

export function invalidatePrices() {
  cachedPrices = null
}

export async function getPrices() {
  if (cachedPrices) return cachedPrices

  const res = await fetch(BLOCKCHAIN_API.prices)
  if (!res.ok) throw new Error('Failed to fetch prices')
  cachedPrices = await res.json()
  return cachedPrices
}
