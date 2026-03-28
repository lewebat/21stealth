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
      const balances = {}
      for (const wallet of loaded) {
        balances[wallet.id] = {}
        for (const token of wallet.tokens) {
          balances[wallet.id][`${token.chain}:${token.key}`] = token.balance
        }
      }

      // Only save if holdings changed compared to last snapshot (regardless of date)
      const last = prev.length > 0 ? prev[prev.length - 1] : null
      if (last) {
        const changed = loaded.some((wallet) =>
          wallet.tokens.some((token) => {
            const prevVal = last.balances[wallet.id]?.[`${token.chain}:${token.key}`]
            return prevVal === undefined || Math.abs(token.balance - prevVal) >= 0.000001
          })
        )
        if (!changed) return prev
      }

      const snapshot = { date: today(), balances }
      // Replace today's snapshot if it exists, otherwise append
      const base = last?.date === today() ? prev.slice(0, -1) : prev
      const updated = [...base, snapshot].sort((a, b) => a.date.localeCompare(b.date))
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
    const prev = wb[chainTokenKey]
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
