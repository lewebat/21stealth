import { useState, useCallback, useRef } from 'react'
import { fetchEthBalances, fetchBtcBalances, fetchSolBalances, fetchLtcBalances, fetchDogeBalances, fetchTrxBalances } from '@/services/blockchain'

const CACHE_TTL = 60_000
const cache = new Map() // key: 'chain:address' → { tokens, ts }

function cacheKey(chain, address) { return `${chain}:${address}` }

function getCached(chain, address) {
  const entry = cache.get(cacheKey(chain, address))
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(cacheKey(chain, address)); return null }
  return entry
}

function setCached(chain, address, tokens) {
  cache.set(cacheKey(chain, address), { tokens, ts: Date.now() })
}

function fetchBalances(chain, address) {
  switch (chain) {
    case 'eth':  return fetchEthBalances(address)
    case 'btc':  return fetchBtcBalances(address)
    case 'sol':  return fetchSolBalances(address)
    case 'ltc':  return fetchLtcBalances(address)
    case 'doge': return fetchDogeBalances(address)
    case 'trx':  return fetchTrxBalances(address)
  }
}

function aggregateTokens(addrTokens, addresses) {
  const map = new Map()
  for (const addr of addresses) {
    const tokens = addrTokens[addr]
    if (!tokens) continue
    for (const t of tokens) {
      const existing = map.get(t.key)
      if (!existing) {
        map.set(t.key, { ...t })
      } else {
        existing.balance += t.balance
        existing.usd += t.usd
        // metadata from first entry is kept (same chain = identical metadata)
      }
    }
  }
  return [...map.values()]
}

function aggregateStatus(addrStatus, addresses) {
  const statuses = addresses.map(a => addrStatus[a] ?? 'loading')
  if (statuses.some(s => s === 'loading')) return 'loading'
  if (statuses.some(s => s === 'error')) return 'error'
  return 'ok'
}

function aggregateErrorMsg(addrStatus, addresses) {
  const errCount = addresses.filter(a => addrStatus[a] === 'error').length
  if (errCount === 0) return undefined
  return `${errCount} von ${addresses.length} Adressen konnten nicht geladen werden`
}

function recompute(wallet) {
  return {
    ...wallet,
    tokens: aggregateTokens(wallet.addrTokens, wallet.addresses),
    status: aggregateStatus(wallet.addrStatus, wallet.addresses),
    errorMsg: aggregateErrorMsg(wallet.addrStatus, wallet.addresses),
  }
}

function makeWallet(id, label, chain, addresses) {
  const addrStatus = Object.fromEntries(addresses.map(a => [a, 'loading']))
  const addrTokens = {}
  const addrError = {}
  return recompute({ id, label, chain, addresses, addrTokens, addrStatus, addrError })
}

export function useWallets() {
  const [wallets, setWallets] = useState([])
  // walletsRef gives loadOneAddress access to current wallets without stale closure
  const walletsRef = useRef(wallets)
  walletsRef.current = wallets

  const loadOneAddress = useCallback(async (walletId, chain, address, force = false) => {
    if (!force) {
      const cached = getCached(chain, address)
      if (cached) {
        setWallets(prev => prev.map(w => {
          if (w.id !== walletId || !w.addresses.includes(address)) return w
          const addrTokens = { ...w.addrTokens, [address]: cached.tokens }
          const addrStatus = { ...w.addrStatus, [address]: 'ok' }
          const addrError = { ...w.addrError }
          delete addrError[address]
          return recompute({ ...w, addrTokens, addrStatus, addrError })
        }))
        return
      }
    }

    setWallets(prev => prev.map(w => {
      if (w.id !== walletId || !w.addresses.includes(address)) return w
      return recompute({ ...w, addrStatus: { ...w.addrStatus, [address]: 'loading' } })
    }))

    try {
      const tokens = await fetchBalances(chain, address)
      setCached(chain, address, tokens)
      setWallets(prev => prev.map(w => {
        if (w.id !== walletId || !w.addresses.includes(address)) return w
        const addrTokens = { ...w.addrTokens, [address]: tokens }
        const addrStatus = { ...w.addrStatus, [address]: 'ok' }
        const addrError = { ...w.addrError }
        delete addrError[address]
        return recompute({ ...w, addrTokens, addrStatus, addrError })
      }))
    } catch (err) {
      setWallets(prev => prev.map(w => {
        if (w.id !== walletId || !w.addresses.includes(address)) return w
        const addrStatus = { ...w.addrStatus, [address]: 'error' }
        const addrError = { ...w.addrError, [address]: err instanceof Error ? err.message : 'Unknown error' }
        return recompute({ ...w, addrStatus, addrError })
      }))
    }
  }, [])

  const loadBalances = useCallback((wallet, force = false) => {
    for (const address of wallet.addresses) {
      loadOneAddress(wallet.id, wallet.chain, address, force)
    }
  }, [loadOneAddress])

  const addWallet = useCallback((label, chain, addresses) => {
    const wallet = makeWallet(crypto.randomUUID(), label, chain, addresses)
    setWallets(prev => [...prev, wallet])
    loadBalances(wallet)
  }, [loadBalances])

  const removeWallet = useCallback((id) => {
    setWallets(prev => prev.filter(w => w.id !== id))
  }, [])

  const updateWallet = useCallback((id, patch) => {
    // Capture current addresses before update to detect new ones
    const currentWallet = walletsRef.current.find(w => w.id === id)
    if (!currentWallet) return
    const existingAddrs = new Set(currentWallet.addresses)

    setWallets(prev => prev.map(w => {
      if (w.id !== id) return w
      const newAddresses = patch.addresses ? [...new Set(patch.addresses)] : w.addresses
      if (newAddresses.length === 0) throw new Error('At least one address required')
      const label = patch.label !== undefined ? patch.label : w.label

      const addrTokens = {}
      const addrStatus = {}
      const addrError = {}
      for (const addr of newAddresses) {
        addrTokens[addr] = w.addrTokens[addr] ?? []
        addrStatus[addr] = w.addrStatus[addr] ?? 'loading'
        if (w.addrError[addr]) addrError[addr] = w.addrError[addr]
      }

      return recompute({ ...w, label, addresses: newAddresses, addrTokens, addrStatus, addrError })
    }))

    // Load balances for newly added addresses only
    if (patch.addresses) {
      const newAddrs = patch.addresses.filter(a => !existingAddrs.has(a))
      for (const addr of newAddrs) {
        loadOneAddress(id, currentWallet.chain, addr, false)
      }
    }
  }, [loadOneAddress])

  const refreshWallet = useCallback((id) => {
    const wallet = walletsRef.current.find(w => w.id === id)
    if (wallet) loadBalances(wallet, true)
  }, [loadBalances])

  const refreshAll = useCallback(() => {
    walletsRef.current.forEach(w => loadBalances(w, true))
  }, [loadBalances])

  const importWallets = useCallback((imported) => {
    const newWallets = imported.map(w => makeWallet(w.id ?? crypto.randomUUID(), w.label, w.chain, w.addresses))
    setWallets(newWallets)
    newWallets.forEach(w => loadBalances(w))
  }, [loadBalances])

  return { wallets, addWallet, removeWallet, updateWallet, refreshWallet, refreshAll, importWallets }
}
