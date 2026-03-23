import { useState, useCallback, useMemo } from 'react'

const MAX_HISTORY = 365

function today() {
  return new Date().toISOString().split('T')[0]
}

export function useHistory(initialHistory = []) {
  const [history, setHistory] = useState(initialHistory)

  const saveSnapshot = useCallback((wallets) => {
    const loaded = wallets.filter((w) => w.status === 'ok')
    if (loaded.length === 0) return

    setHistory((prev) => {
      if (prev.some((s) => s.date === today())) return prev

      const balances = {}
      for (const wallet of loaded) {
        balances[wallet.id] = {}
        for (const token of wallet.tokens) {
          balances[wallet.id][`${token.chain}:${token.key}`] = token.balance
        }
      }

      const last = prev.length > 0 ? prev[prev.length - 1] : null
      if (last) {
        const changed = loaded.some((wallet) =>
          wallet.tokens.some((token) => {
            const prevVal = last.balances[wallet.id]?.[token.key]
            return prevVal === undefined || Math.abs(token.balance - prevVal) >= 0.000001
          })
        )
        if (!changed) return prev
      }

      const snapshot = { date: today(), balances }
      const updated = [...prev, snapshot].sort((a, b) => a.date.localeCompare(b.date))
      return updated.slice(-MAX_HISTORY)
    })
  }, [])

  const previousSnapshot = useMemo(() => {
    const filtered = history.filter((s) => s.date < today())
    return filtered.length > 0 ? filtered[filtered.length - 1] : null
  }, [history])

  const getDelta = useCallback((walletId, chainTokenKey, currentBalance) => {
    if (!previousSnapshot) return null
    const wb = previousSnapshot.balances[walletId]
    if (!wb) return null
    // Try new chain:key format first, fall back to legacy key-only format
    const [chain, tokenKey] = chainTokenKey.includes(':') ? chainTokenKey.split(':') : [null, chainTokenKey]
    const prev = wb[chainTokenKey] ?? (chain ? undefined : wb[tokenKey])
    if (prev === undefined) return null
    const delta = currentBalance - prev
    if (Math.abs(delta) < 0.000001) return null
    return delta
  }, [previousSnapshot])

  const loadHistory = useCallback((imported) => {
    setHistory(imported.slice(-MAX_HISTORY))
  }, [])

  return { history, saveSnapshot, loadHistory, previousSnapshot, getDelta }
}
