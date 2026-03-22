import { useState, useMemo, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import Card from './Card'
import Button from './Button'
import { useCI } from '@hooks/useCI'
import { tokenUsd } from '@/utils/tokenUsd'
import { getPriceHistory } from '@/services/priceHistory'

const TOKEN_PRICE_KEYS = { eth: 'ethereum', btc: 'bitcoin', sol: 'solana', ltc: 'litecoin', doge: 'dogecoin', trx: 'tron' }
const STABLECOINS = new Set(['usdt', 'usdc'])

function formatUsd(value) {
  if (value >= 1_000_000) return '$' + (value / 1_000_000).toFixed(2) + 'M'
  if (value >= 1_000)     return '$' + (value / 1_000).toFixed(1) + 'K'
  return '$' + value.toFixed(2)
}

function formatDate(dateStr) {
  const [, month, day] = dateStr.split('-')
  return `${day}.${month}`
}

// pricesForDate: { bitcoin: 85000, ethereum: 3200, ... } (historical or current fallback)
function calcUsd(balances, pricesForDate, volatileOnly = false) {
  let total = 0
  for (const [key, amount] of Object.entries(balances)) {
    if (STABLECOINS.has(key)) {
      if (!volatileOnly) total += amount
    } else {
      const priceKey = TOKEN_PRICE_KEYS[key]
      if (priceKey) total += amount * (pricesForDate[priceKey] ?? 0)
    }
  }
  return total
}

export function HistoryChart({ history, wallets, prices }) {
  const [selected, setSelected] = useState('total')
  const [volatileOnly, setVolatileOnly] = useState(false)
  const [priceHistory, setPriceHistory] = useState(null)
  const { colors } = useCI()

  useEffect(() => {
    getPriceHistory().then(setPriceHistory).catch(() => {})
  }, [])

  const loadedWallets = wallets.filter((w) => w.status === 'ok')

  const chartData = useMemo(() => {
    if (!prices || history.length === 0) return []
    const loaded = wallets.filter((w) => w.status === 'ok')
    return history.map((snap) => {
      // Build a price lookup for this date using historical data, fall back to current price
      const pricesForDate = {}
      for (const [coin, dailyMap] of Object.entries(priceHistory ?? {})) {
        pricesForDate[coin] = dailyMap[snap.date] ?? prices[coin]?.usd ?? 0
      }
      // Coins not in priceHistory yet: fall back to current prices
      for (const [coin, data] of Object.entries(prices ?? {})) {
        if (!(coin in pricesForDate)) pricesForDate[coin] = data.usd ?? 0
      }

      const point = { date: formatDate(snap.date) }
      if (selected === 'total') {
        let total = 0
        for (const wallet of loaded) {
          const wb = snap.balances[wallet.id]
          if (wb) total += calcUsd(wb, pricesForDate, volatileOnly)
        }
        point.value = Math.round(total * 100) / 100
      } else {
        const wb = snap.balances[selected]
        point.value = wb ? Math.round(calcUsd(wb, pricesForDate, volatileOnly) * 100) / 100 : 0
      }
      return point
    })
  }, [history, prices, priceHistory, selected, volatileOnly, wallets])

  if (history.length < 2 || !prices) return (
    <Card>
      <Card.Body className="card-body-auto">
        <div className="flex items-center gap-3 py-6 text-text-subtle">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
          <span className="text-caption">Portfolio history will appear here once balance changes have been recorded on at least two different days.</span>
        </div>
      </Card.Body>
    </Card>
  )

  const values = chartData.map((d) => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const isPositive = values[values.length - 1] >= values[0]
  const color = isPositive ? colors.success : colors.danger

  const selectedWallet = loadedWallets.find((w) => w.id === selected)
  const currentValue = selected === 'total'
    ? loadedWallets.reduce((s, w) => s + w.tokens.reduce((t, tk) => volatileOnly && STABLECOINS.has(tk.key) ? t : t + tokenUsd(tk, prices), 0), 0)
    : (selectedWallet?.tokens.reduce((t, tk) => volatileOnly && STABLECOINS.has(tk.key) ? t : t + tokenUsd(tk, prices), 0) ?? 0)

  const firstValue = chartData[0]?.value ?? 0
  const totalDelta = currentValue - firstValue
  const totalDeltaPct = firstValue > 0 ? (totalDelta / firstValue) * 100 : 0

  return (
    <Card>
      <Card.Header>
        <div>
          <div className="h2">{formatUsd(currentValue)}</div>
          <div className={`text-caption font-mono mt-0.5 ${totalDelta >= 0 ? 'text-success' : 'text-danger'}`}>
            {totalDelta >= 0 ? '+' : ''}{formatUsd(totalDelta)}
            <span className="ml-1 text-xs">
              ({totalDeltaPct >= 0 ? '+' : ''}{totalDeltaPct.toFixed(2)}%)
            </span>
            <span className="text-text-subtle ml-1 font-sans">since {history[0].date}</span>
          </div>
        </div>
        <Button
          variant={volatileOnly ? 'accent' : 'ghost'}
          size="sm"
          onClick={() => setVolatileOnly((v) => !v)}
        >
          {volatileOnly ? 'Include stablecoins' : 'Exclude stablecoins'}
        </Button>
      </Card.Header>
      <Card.Body className="card-body-auto">
        <div className="h-40 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                  <stop offset="100%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fill: colors['text-subtle'], fontSize: 10 }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis domain={[min * 0.998, max * 1.002]} tick={{ fill: colors['text-subtle'], fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatUsd} width={60} />
              <Tooltip
                contentStyle={{ backgroundColor: colors['surface-elevated'], border: `1px solid ${colors.border}`, borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: colors['text-muted'] }}
                itemStyle={{ color }}
                formatter={(value) => [formatUsd(Number(value)), 'Value']}
              />
              <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2} fill="url(#chartGradient)" dot={false} activeDot={{ r: 4, fill: color, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-wrap gap-2 pt-4">
          <button
            type="button"
            onClick={() => setSelected('total')}
            className={selected === 'total' ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
          >
            Total
          </button>
          {loadedWallets.map((wallet) => (
            <button
              type="button"
              key={wallet.id}
              onClick={() => setSelected(wallet.id)}
              className={selected === wallet.id ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
            >
              {wallet.label}
            </button>
          ))}
        </div>
      </Card.Body>
    </Card>
  )
}
