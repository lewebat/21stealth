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

export const fetchEthBalances  = (address) => fetchBalance('eth',  address)
export const fetchBtcBalances  = (address) => fetchBalance('btc',  address)
export const fetchSolBalances  = (address) => fetchBalance('sol',  address)
export const fetchLtcBalances  = (address) => fetchBalance('ltc',  address)
export const fetchDogeBalances = (address) => fetchBalance('doge', address)
export const fetchTrxBalances  = (address) => fetchBalance('trx',  address)
