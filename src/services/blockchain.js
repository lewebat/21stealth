import { getPrices } from './prices'
import { BLOCKCHAIN_API } from './blockchainApi'

async function fetchBalance(chain, address) {
  let res
  try {
    res = await fetch(`${BLOCKCHAIN_API.balance(chain)}?address=${encodeURIComponent(address)}`)
  } catch {
    throw new Error('Backend not reachable')
  }

  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    throw new Error('Backend not configured (no JSON)')
  }

  if (!res.ok) throw new Error(data.error ?? `${chain.toUpperCase()} API error`)
  return data.tokens
}

async function withPrices(chain, address, priceMap) {
  const [rawTokens, prices] = await Promise.all([fetchBalance(chain, address), getPrices()])
  const map = priceMap(prices)
  return rawTokens.map((t) => ({ ...t, usd: t.balance * (map[t.key] ?? 1) }))
}

export const fetchEthBalances  = (address) => withPrices('eth',  address, (p) => ({ eth: p.ethereum.usd, usdt: 1, usdc: 1 }))
export const fetchBtcBalances  = (address) => withPrices('btc',  address, (p) => ({ btc: p.bitcoin.usd }))
export const fetchSolBalances  = (address) => withPrices('sol',  address, (p) => ({ sol: p.solana.usd }))
export const fetchLtcBalances  = (address) => withPrices('ltc',  address, (p) => ({ ltc: p.litecoin.usd }))
export const fetchDogeBalances = (address) => withPrices('doge', address, (p) => ({ doge: p.dogecoin.usd }))
export const fetchTrxBalances  = (address) => withPrices('trx',  address, (p) => ({ trx: p.tron.usd, usdt: 1, usdc: 1 }))
