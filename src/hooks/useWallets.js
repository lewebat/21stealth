import { useState, useCallback } from 'react'
import { fetchEthBalances, fetchBtcBalances, fetchSolBalances, fetchLtcBalances, fetchDogeBalances, fetchTrxBalances } from '@/services/blockchain'

const CACHE_TTL = 60_000
const cache = new Map()

function cacheKey(wallet) {
  return `${wallet.chain}:${wallet.address}`
}

function getCached(wallet) {
  const entry = cache.get(cacheKey(wallet))
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL) {
    cache.delete(cacheKey(wallet))
    return null
  }
  return entry.tokens
}

function setCached(wallet, tokens) {
  cache.set(cacheKey(wallet), { tokens, ts: Date.now() })
}

function fetchBalances(wallet) {
  switch (wallet.chain) {
    case 'eth':  return fetchEthBalances(wallet.address)
    case 'btc':  return fetchBtcBalances(wallet.address)
    case 'sol':  return fetchSolBalances(wallet.address)
    case 'ltc':  return fetchLtcBalances(wallet.address)
    case 'doge': return fetchDogeBalances(wallet.address)
    case 'trx':  return fetchTrxBalances(wallet.address)
  }
}

export function useWallets() {
  const [wallets, setWallets] = useState([])

  const loadBalances = useCallback(async (wallet, force = false) => {
    if (!force) {
      const cached = getCached(wallet)
      if (cached) {
        setWallets((prev) => prev.map((w) => w.id === wallet.id ? { ...w, tokens: cached, status: 'ok' } : w))
        return
      }
    }

    setWallets((prev) => prev.map((w) => w.id === wallet.id ? { ...w, status: 'loading' } : w))
    try {
      const tokens = await fetchBalances(wallet)
      setCached(wallet, tokens)
      setWallets((prev) => prev.map((w) => w.id === wallet.id ? { ...w, tokens, status: 'ok' } : w))
    } catch (err) {
      setWallets((prev) => prev.map((w) =>
        w.id === wallet.id
          ? { ...w, status: 'error', errorMsg: err instanceof Error ? err.message : 'Unknown error' }
          : w
      ))
    }
  }, [])

  const addWallet = useCallback((label, chain, address) => {
    const wallet = { id: crypto.randomUUID(), label, chain, address, tokens: [], status: 'loading' }
    setWallets((prev) => [...prev, wallet])
    loadBalances(wallet)
  }, [loadBalances])

  const removeWallet = useCallback((id) => {
    setWallets((prev) => prev.filter((w) => w.id !== id))
  }, [])

  const refreshWallet = useCallback((id) => {
    const wallet = wallets.find((w) => w.id === id)
    if (wallet) loadBalances(wallet, true)
  }, [wallets, loadBalances])

  const refreshAll = useCallback(() => {
    wallets.forEach((w) => loadBalances(w, true))
  }, [wallets, loadBalances])

  const importWallets = useCallback((imported) => {
    const newWallets = imported.map((w) => ({ ...w, tokens: [], status: 'loading' }))
    setWallets(newWallets)
    newWallets.forEach((w) => loadBalances(w))
  }, [loadBalances])

  return { wallets, addWallet, removeWallet, refreshWallet, refreshAll, importWallets }
}
