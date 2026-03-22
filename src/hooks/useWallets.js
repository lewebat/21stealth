import { useState, useCallback, useRef } from 'react'
import { fetchEthBalances, fetchBtcBalances, fetchSolBalances, fetchLtcBalances, fetchDogeBalances, fetchTrxBalances } from '@/services/blockchain'

const CACHE_TTL = 60_000
const cache = new Map() // key: 'chain:address' → { tokens, ts }

function addrKey(chain, address) { return `${chain}:${address}` }

function getCached(chain, address) {
  const key = addrKey(chain, address)
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null }
  return entry
}

function setCached(chain, address, tokens) {
  cache.set(addrKey(chain, address), { tokens, ts: Date.now() })
}

function fetchBalances(chain, address) {
  switch (chain) {
    case 'eth':  return fetchEthBalances(address)
    case 'btc':  return fetchBtcBalances(address)
    case 'sol':  return fetchSolBalances(address)
    case 'ltc':  return fetchLtcBalances(address)
    case 'doge': return fetchDogeBalances(address)
    case 'trx':  return fetchTrxBalances(address)
    default: throw new Error(`Unsupported chain: ${chain}`)
  }
}

function allAddrKeys(wallet) {
  return wallet.entries.flatMap(e => e.addresses.map(a => addrKey(e.chain, a)))
}

function aggregateTokens(addrTokens, keys) {
  const map = new Map()
  for (const addrKey of keys) {
    const chain = addrKey.split(':')[0]
    const tokens = addrTokens[addrKey]
    if (!tokens) continue
    for (const t of tokens) {
      const mapKey = `${chain}:${t.key}`
      const existing = map.get(mapKey)
      if (!existing) {
        map.set(mapKey, { ...t, chain })
      } else {
        existing.balance += t.balance
        // metadata from first entry is kept
      }
    }
  }
  return [...map.values()]
}

function aggregateStatus(addrStatus, keys) {
  const statuses = keys.map(k => addrStatus[k] ?? 'loading')
  if (statuses.some(s => s === 'loading')) return 'loading'
  if (statuses.some(s => s === 'error')) return 'error'
  return 'ok'
}

function aggregateErrorMsg(addrStatus, keys) {
  const errCount = keys.filter(k => addrStatus[k] === 'error').length
  if (errCount === 0) return undefined
  return `${errCount} of ${keys.length} addresses failed to load`
}

function recompute(wallet) {
  const keys = allAddrKeys(wallet)
  return {
    ...wallet,
    tokens: aggregateTokens(wallet.addrTokens, keys),
    status: aggregateStatus(wallet.addrStatus, keys),
    errorMsg: aggregateErrorMsg(wallet.addrStatus, keys),
  }
}

function makeWallet(id, label, entries) {
  const addrStatus = {}
  const addrTokens = {}
  // consumed by WalletCard ChainSection per-chain error display
  const addrError = {}
  for (const { chain, addresses } of entries) {
    for (const addr of addresses) {
      addrStatus[addrKey(chain, addr)] = 'loading'
    }
  }
  return recompute({ id, label, entries, addrTokens, addrStatus, addrError })
}

export function useWallets() {
  const [wallets, setWallets] = useState([])
  const walletsRef = useRef(wallets)
  walletsRef.current = wallets

  const loadOneAddress = useCallback(async (walletId, chain, address, force = false) => {
    const key = addrKey(chain, address)
    if (!force) {
      const cached = getCached(chain, address)
      if (cached) {
        setWallets(prev => prev.map(w => {
          if (w.id !== walletId) return w
          if (!w.entries.some(e => e.chain === chain && e.addresses.includes(address))) return w
          const addrTokens = { ...w.addrTokens, [key]: cached.tokens }
          const addrStatus = { ...w.addrStatus, [key]: 'ok' }
          const addrError = { ...w.addrError }
          delete addrError[key]
          return recompute({ ...w, addrTokens, addrStatus, addrError })
        }))
        return
      }
    }

    setWallets(prev => prev.map(w => {
      if (w.id !== walletId) return w
      if (!w.entries.some(e => e.chain === chain && e.addresses.includes(address))) return w
      return recompute({ ...w, addrStatus: { ...w.addrStatus, [key]: 'loading' } })
    }))

    try {
      const tokens = await fetchBalances(chain, address)
      setCached(chain, address, tokens)
      setWallets(prev => prev.map(w => {
        if (w.id !== walletId) return w
        if (!w.entries.some(e => e.chain === chain && e.addresses.includes(address))) return w
        const addrTokens = { ...w.addrTokens, [key]: tokens }
        const addrStatus = { ...w.addrStatus, [key]: 'ok' }
        const addrError = { ...w.addrError }
        delete addrError[key]
        return recompute({ ...w, addrTokens, addrStatus, addrError })
      }))
    } catch (err) {
      setWallets(prev => prev.map(w => {
        if (w.id !== walletId) return w
        if (!w.entries.some(e => e.chain === chain && e.addresses.includes(address))) return w
        const addrStatus = { ...w.addrStatus, [key]: 'error' }
        const addrError = { ...w.addrError, [key]: err instanceof Error ? err.message : 'Unknown error' }
        return recompute({ ...w, addrStatus, addrError })
      }))
    }
  }, [])

  const loadBalances = useCallback((wallet, force = false) => {
    for (const { chain, addresses } of wallet.entries) {
      for (const address of addresses) {
        loadOneAddress(wallet.id, chain, address, force)
      }
    }
  }, [loadOneAddress])

  const addWallet = useCallback((label, entries) => {
    const wallet = makeWallet(crypto.randomUUID(), label, entries)
    setWallets(prev => [...prev, wallet])
    loadBalances(wallet)
  }, [loadBalances])

  const removeWallet = useCallback((id) => {
    setWallets(prev => prev.filter(w => w.id !== id))
  }, [])

  const updateWallet = useCallback((id, patch) => {
    const currentWallet = walletsRef.current.find(w => w.id === id)
    if (!currentWallet) return

    const existingKeys = new Set(allAddrKeys(currentWallet))
    const newEntries = patch.entries ?? currentWallet.entries

    setWallets(prev => prev.map(w => {
      if (w.id !== id) return w
      const label = patch.label !== undefined ? patch.label : w.label

      const addrTokens = {}
      const addrStatus = {}
      const addrError = {}
      for (const { chain, addresses } of newEntries) {
        for (const addr of addresses) {
          const k = addrKey(chain, addr)
          addrTokens[k] = w.addrTokens[k] ?? []
          addrStatus[k] = w.addrStatus[k] ?? 'loading'
          if (w.addrError[k]) addrError[k] = w.addrError[k]
        }
      }

      return recompute({ ...w, label, entries: newEntries, addrTokens, addrStatus, addrError })
    }))

    if (patch.entries) {
      for (const { chain, addresses } of newEntries) {
        for (const addr of addresses) {
          if (!existingKeys.has(addrKey(chain, addr))) {
            loadOneAddress(id, chain, addr, false)
          }
        }
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
    const newWallets = imported.map(w => makeWallet(w.id ?? crypto.randomUUID(), w.label, w.entries))
    setWallets(newWallets)
    newWallets.forEach(w => loadBalances(w))
  }, [loadBalances])

  return { wallets, addWallet, removeWallet, updateWallet, refreshWallet, refreshAll, importWallets }
}
