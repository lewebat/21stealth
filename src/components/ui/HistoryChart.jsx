import { useState, useMemo, useEffect } from 'react'
import { Info } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import Card from './Card'
import Button from './Button'
import { useCI } from '@hooks/useCI'
import { tokenUsd } from '@/utils/tokenUsd'
import { getPriceHistory } from '@/services/priceHistory'

function today() { return new Date().toISOString().split('T')[0] }

const TOKEN_PRICE_KEYS = { eth: 'ethereum', btc: 'bitcoin', sol: 'solana', ltc: 'litecoin', doge: 'dogecoin', trx: 'tron' }
const STABLECOINS = new Set(['usdt', 'usdc'])
const BACKFILL_DAYS = 14

function formatUsd(value) {
  if (value >= 1_000_000) return '$' + (value / 1_000_000).toFixed(2) + 'M'
  if (value >= 1_000)     return '$' + (value / 1_000).toFixed(1) + 'K'
  return '$' + value.toFixed(2)
}

function formatDate(dateStr) {
  const [, month, day] = dateStr.split('-')
  return `${day}.${month}`
}

// Handles both legacy flat keys ('usdt') and new chain:key format ('trx:usdt')
function calcUsd(balances, pricesForDate, volatileOnly = false) {
  let total = 0
  for (const [rawKey, amount] of Object.entries(balances)) {
    const key = rawKey.includes(':') ? rawKey.split(':')[1] : rawKey
    if (STABLECOINS.has(key)) {
      if (!volatileOnly) total += amount
    } else {
      const priceKey = TOKEN_PRICE_KEYS[key]
      if (priceKey) total += amount * (pricesForDate[priceKey] ?? 0)
    }
  }
  return total
}

function buildPricesForDate(dateStr, priceHistory, prices) {
  const pricesForDate = {}
  for (const [coin, dailyMap] of Object.entries(priceHistory ?? {})) {
    pricesForDate[coin] = dailyMap[dateStr] ?? prices?.[coin]?.usd ?? 0
  }
  for (const [coin, data] of Object.entries(prices ?? {})) {
    if (!(coin in pricesForDate)) pricesForDate[coin] = data.usd ?? 0
  }
  return pricesForDate
}

export function HistoryChart({ history, wallets, prices }) {
  const [selected, setSelected] = useState('total')
  const [volatileOnly, setVolatileOnly] = useState(false)
  const [priceHistory, setPriceHistory] = useState(null)
  const { colors } = useCI()

  useEffect(() => {
    getPriceHistory().then(setPriceHistory).catch(() => {})
  }, [])

  const loadedWallets = useMemo(() => wallets.filter((w) => w.tokens.length > 0), [wallets])

  // Forward-filled chart data: generate one point per day from first snapshot to today.
  // Days without a new snapshot reuse the last known balances with that day's prices.
  const chartData = useMemo(() => {
    if (!prices || !priceHistory || history.length === 0) return []

    const start = new Date(history[0].date + 'T00:00:00')
    const end   = new Date(today() + 'T00:00:00')
    const points = []
    let snapIdx = 0

    for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0]
      while (snapIdx + 1 < history.length && history[snapIdx + 1].date <= dateStr) snapIdx++
      const snap = history[snapIdx]
      const pricesForDate = buildPricesForDate(dateStr, priceHistory, prices)
      const point = { date: formatDate(dateStr) }
      if (selected === 'total') {
        let total = 0
        for (const wallet of loadedWallets) {
          const wb = snap.balances[wallet.id]
          if (wb) total += calcUsd(wb, pricesForDate, volatileOnly)
        }
        point.value = Math.round(total * 100) / 100
      } else {
        const wb = snap.balances[selected]
        point.value = wb ? Math.round(calcUsd(wb, pricesForDate, volatileOnly) * 100) / 100 : 0
      }
      points.push(point)
    }
    return points
  }, [history, prices, priceHistory, selected, volatileOnly, loadedWallets])

  // Synthetic backfill: 14 days before first snapshot using historical prices
  const syntheticData = useMemo(() => {
    if (!priceHistory || history.length === 0 || !prices) return []
    const firstSnap = history[0]
    const firstDate = new Date(firstSnap.date + 'T00:00:00')
    const points = []

    for (let i = BACKFILL_DAYS; i >= 1; i--) {
      const d = new Date(firstDate)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]

      const pricesForDate = buildPricesForDate(dateStr, priceHistory, prices)
      // Skip days where we have no historical price data at all
      const hasData = Object.values(pricesForDate).some((v) => v > 0)
      if (!hasData) continue

      const point = { date: formatDate(dateStr), synthetic: true }
      if (selected === 'total') {
        let total = 0
        for (const wallet of loadedWallets) {
          const wb = firstSnap.balances[wallet.id]
          if (wb) total += calcUsd(wb, pricesForDate, volatileOnly)
        }
        point.value = Math.round(total * 100) / 100
      } else {
        const wb = firstSnap.balances[selected]
        point.value = wb ? Math.round(calcUsd(wb, pricesForDate, volatileOnly) * 100) / 100 : 0
      }
      points.push(point)
    }
    return points
  }, [priceHistory, history, prices, selected, volatileOnly, loadedWallets])

  const allChartData = [...syntheticData, ...chartData]

  if (history.length === 0 || !prices) return (
    <Card>
      <Card.Body className="card-body-auto">
        <div className="flex items-center gap-3 py-6 text-text-subtle">
          <Info size={16} />
          <span className="text-caption">Portfolio history will appear here once your first wallet has loaded.</span>
        </div>
      </Card.Body>
    </Card>
  )

  // Wait for priceHistory before rendering synthetic chart
  if (allChartData.length < 2) return (
    <Card>
      <Card.Body className="card-body-auto">
        <div className="flex items-center gap-3 py-6 text-text-subtle">
          <Info size={16} />
          <span className="text-caption">Loading price history…</span>
        </div>
      </Card.Body>
    </Card>
  )

  const values = allChartData.map((d) => d.value)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const isPositive = values[values.length - 1] >= values[0]
  const color = isPositive ? colors.success : colors.danger

  const selectedWallet = loadedWallets.find((w) => w.id === selected)
  const currentValue = selected === 'total'
    ? loadedWallets.reduce((s, w) => s + w.tokens.reduce((t, tk) => volatileOnly && STABLECOINS.has(tk.key) ? t : t + tokenUsd(tk, prices), 0), 0)
    : (selectedWallet?.tokens.reduce((t, tk) => volatileOnly && STABLECOINS.has(tk.key) ? t : t + tokenUsd(tk, prices), 0) ?? 0)

  const firstValue = allChartData[0]?.value ?? 0
  const totalDelta = currentValue - firstValue
  const totalDeltaPct = firstValue > 0 ? (totalDelta / firstValue) * 100 : 0
  const sinceLabel = syntheticData.length > 0 ? `~${BACKFILL_DAYS}d ago` : history[0].date

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
            <span className="text-text-subtle ml-1 font-sans">since {sinceLabel}</span>
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
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <AreaChart data={allChartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
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
        <div className="flex flex-wrap gap-1 pt-4 justify-center">
          <button
            type="button"
            onClick={() => setSelected('total')}
            className={`btn-tab${selected === 'total' ? ' active' : ''}`}
          >
            Total
          </button>
          {loadedWallets.map((wallet) => (
            <button
              type="button"
              key={wallet.id}
              onClick={() => setSelected(wallet.id)}
              className={`btn-tab${selected === wallet.id ? ' active' : ''}`}
            >
              {wallet.label}
            </button>
          ))}
        </div>
      </Card.Body>
    </Card>
  )
}
