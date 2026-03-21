import { BLOCKCHAIN_API } from './blockchainApi'

let cachedPrices = null

export async function getPrices() {
  if (cachedPrices) return cachedPrices

  const res = await fetch(BLOCKCHAIN_API.prices)
  if (!res.ok) throw new Error('Failed to fetch prices')
  const d = await res.json()

  cachedPrices = {
    bitcoin:  d.bitcoin.usd,
    ethereum: d.ethereum.usd,
    solana:   d.solana.usd,
    litecoin: d.litecoin.usd,
    dogecoin: d.dogecoin.usd,
    tron:     d.tron.usd,
  }

  return cachedPrices
}
