import { BLOCKCHAIN_API } from './blockchainApi'

let cachedPrices = null

export function invalidatePrices() {
  cachedPrices = null
}

export async function getPrices() {
  if (cachedPrices) return cachedPrices

  const key = import.meta.env.VITE_APP_KEY
  const res = await fetch(BLOCKCHAIN_API.prices, {
    headers: key ? { 'X-App-Key': key } : {},
  })
  if (!res.ok) throw new Error('Failed to fetch prices')
  cachedPrices = await res.json()
  return cachedPrices
}
