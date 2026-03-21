import { BLOCKCHAIN_API } from './blockchainApi'

const COIN_IDS = ['bitcoin', 'ethereum', 'solana', 'litecoin', 'dogecoin', 'tron']

let cachedPrices = null

export function invalidatePrices() {
  cachedPrices = null
}

export async function getPrices() {
  if (cachedPrices) return cachedPrices

  const res = await fetch(BLOCKCHAIN_API.prices)
  if (!res.ok) throw new Error('Failed to fetch prices')
  const data = await res.json()

  cachedPrices = Object.fromEntries(
    COIN_IDS.map(id => [
      id,
      {
        usd: data[id]?.usd ?? 0,
        change24h: data[id]?.usd_24h_change ?? null,
      },
    ])
  )

  return cachedPrices
}
