import { BLOCKCHAIN_API } from './blockchainApi'

const COINGECKO_URL =
  'https://api.coingecko.com/api/v3/simple/price' +
  '?ids=bitcoin,ethereum,solana,litecoin,dogecoin,tron' +
  '&vs_currencies=usd&include_24hr_change=true'

const COIN_IDS = ['bitcoin', 'ethereum', 'solana', 'litecoin', 'dogecoin', 'tron']

let cachedPrices = null

export function invalidatePrices() {
  cachedPrices = null
}

export async function getPrices() {
  if (cachedPrices) return cachedPrices

  // Fetch both in parallel: backend for USD prices, CoinGecko for 24h change
  const [backendRes, geckoRes] = await Promise.all([
    fetch(BLOCKCHAIN_API.prices),
    fetch(COINGECKO_URL),
  ])

  if (!backendRes.ok) throw new Error('Failed to fetch prices')
  const backend = await backendRes.json()
  const gecko = geckoRes.ok ? await geckoRes.json() : {}

  cachedPrices = Object.fromEntries(
    COIN_IDS.map(id => [
      id,
      {
        usd: backend[id]?.usd ?? 0,
        change24h: gecko[id]?.usd_24h_change ?? 0,
      },
    ])
  )

  return cachedPrices
}
