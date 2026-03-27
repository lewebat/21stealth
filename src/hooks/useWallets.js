import { useState, useCallback, useRef } from 'react'
import { fetchEthBalances, fetchBtcBalances, fetchSolBalances, fetchLtcBalances, fetchDogeBalances, fetchTrxBalances } from '@/services/blockchain'
import { fetchXpubBalance } from '@/services/blockchain'

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

function xpubKey(chain, xpub) { return `xpub:${chain}:${xpub}` }

function getCachedXpub(chain, xpub) {
  const key = xpubKey(chain, xpub)
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null }
  return entry
}

function setCachedXpub(chain, xpub, tokens, addresses) {
  cache.set(xpubKey(chain, xpub), { tokens, addresses, ts: Date.now() })
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
  return wallet.entries.flatMap(e => {
    if (e.type === 'xpub') {
      const k = xpubKey(e.chain, e.xpub)
      const derived = wallet.derivedAddrs?.[k] ?? []
      // Always include the placeholder key so aggregateStatus sees loading/error state
      return [k, ...derived.map(a => addrKey(e.chain, a))]
    }
    return e.addresses.map(a => addrKey(e.chain, a))
  })
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
  for (const entry of entries) {
    if (entry.type === 'xpub') continue // loaded async via loadOneXpub
    for (const addr of entry.addresses) {
      addrStatus[addrKey(entry.chain, addr)] = 'loading'
    }
  }
  return recompute({ id, label, entries, addrTokens, addrStatus, addrError, derivedAddrs: {} })
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

  const loadOneXpub = useCallback(async (walletId, chain, xpub, force = false) => {
    const key = xpubKey(chain, xpub)

    if (!force) {
      const cached = getCachedXpub(chain, xpub)
      if (cached) {
        setWallets(prev => prev.map(w => {
          if (w.id !== walletId) return w
          const addrTokens = { ...w.addrTokens }
          const addrStatus = { ...w.addrStatus }
          const addrError  = { ...w.addrError }
          const derivedAddrs = { ...w.derivedAddrs, [key]: cached.addresses.map(a => a.address) }
          // Set placeholder key status so aggregateStatus resolves correctly
          addrTokens[key] = cached.tokens
          addrStatus[key] = 'ok'
          for (const { address, tokens } of cached.addresses) {
            addrTokens[addrKey(chain, address)] = tokens
            addrStatus[addrKey(chain, address)] = 'ok'
            delete addrError[addrKey(chain, address)]
          }
          return recompute({ ...w, addrTokens, addrStatus, addrError, derivedAddrs })
        }))
        return
      }
    }

    // Set loading state for this xpub entry (use key as placeholder)
    setWallets(prev => prev.map(w => {
      if (w.id !== walletId) return w
      return recompute({ ...w, addrStatus: { ...w.addrStatus, [key]: 'loading' } })
    }))

    try {
      const { tokens, addresses } = await fetchXpubBalance(chain, xpub)
      setCachedXpub(chain, xpub, tokens, addresses)
      setWallets(prev => prev.map(w => {
        if (w.id !== walletId) return w
        const addrTokens  = { ...w.addrTokens }
        const addrStatus  = { ...w.addrStatus }
        const addrError   = { ...w.addrError }
        const derivedList = addresses.map(a => a.address)
        const derivedAddrs = { ...w.derivedAddrs, [key]: derivedList }
        delete addrStatus[key] // remove placeholder
        for (const { address, tokens: t } of addresses) {
          addrTokens[addrKey(chain, address)] = t
          addrStatus[addrKey(chain, address)] = 'ok'
          delete addrError[addrKey(chain, address)]
        }
        // Also store aggregate tokens under xpub key for status tracking
        addrTokens[key] = tokens
        addrStatus[key] = 'ok'
        return recompute({ ...w, addrTokens, addrStatus, addrError, derivedAddrs })
      }))
    } catch (err) {
      setWallets(prev => prev.map(w => {
        if (w.id !== walletId) return w
        const addrStatus = { ...w.addrStatus, [key]: 'error' }
        const addrError  = { ...w.addrError, [key]: err instanceof Error ? err.message : 'Unknown error' }
        return recompute({ ...w, addrStatus, addrError })
      }))
    }
  }, [])

  const loadBalances = useCallback((wallet, force = false) => {
    for (const entry of wallet.entries) {
      if (entry.type === 'xpub') {
        loadOneXpub(wallet.id, entry.chain, entry.xpub, force)
      } else {
        for (const address of entry.addresses) {
          loadOneAddress(wallet.id, entry.chain, address, force)
        }
      }
    }
  }, [loadOneAddress, loadOneXpub])

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
      for (const entry of newEntries) {
        if (entry.type === 'xpub') {
          const k = xpubKey(entry.chain, entry.xpub)
          addrTokens[k] = w.addrTokens[k] ?? []
          addrStatus[k] = w.addrStatus[k] ?? 'loading'
          if (w.addrError[k]) addrError[k] = w.addrError[k]
        } else {
          for (const addr of entry.addresses) {
            const k = addrKey(entry.chain, addr)
            addrTokens[k] = w.addrTokens[k] ?? []
            addrStatus[k] = w.addrStatus[k] ?? 'loading'
            if (w.addrError[k]) addrError[k] = w.addrError[k]
          }
        }
      }

      return recompute({ ...w, label, entries: newEntries, addrTokens, addrStatus, addrError })
    }))

    if (patch.entries) {
      const existingXpubKeys = new Set(
        currentWallet.entries
          .filter(e => e.type === 'xpub')
          .map(e => xpubKey(e.chain, e.xpub))
      )
      for (const entry of newEntries) {
        if (entry.type === 'xpub') {
          if (!existingXpubKeys.has(xpubKey(entry.chain, entry.xpub))) {
            // Evict the OLD xpub key for this chain (not the new one)
            const oldEntry = currentWallet.entries.find(
              e => e.type === 'xpub' && e.chain === entry.chain
            )
            if (oldEntry) cache.delete(xpubKey(oldEntry.chain, oldEntry.xpub))
            loadOneXpub(id, entry.chain, entry.xpub, false)
          }
        } else {
          for (const addr of entry.addresses) {
            if (!existingKeys.has(addrKey(entry.chain, addr))) {
              loadOneAddress(id, entry.chain, addr, false)
            }
          }
        }
      }
    }
  }, [loadOneAddress, loadOneXpub])

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
