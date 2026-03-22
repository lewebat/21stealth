import { useState, useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import Card from './Card'
import Button from './Button'
import { useCI } from '@hooks/useCI'
import { tokenUsd } from '@/utils/tokenUsd'

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

function calcUsd(balances, prices, volatileOnly = false) {
  let total = 0
  for (const [key, amount] of Object.entries(balances)) {
    if (STABLECOINS.has(key)) {
      if (!volatileOnly) total += amount
    } else {
      const priceKey = TOKEN_PRICE_KEYS[key]
      if (priceKey) total += amount * (prices[priceKey]?.usd ?? 0)
    }
  }
  return total
}

export function HistoryChart({ history, wallets, prices }) {
  const [selected, setSelected] = useState('total')
  const [volatileOnly, setVolatileOnly] = useState(false)
  const { colors } = useCI()

  const loadedWallets = wallets.filter((w) => w.status === 'ok')

  const chartData = useMemo(() => {
    if (!prices || history.length === 0) return []
    return history.map((snap) => {
      const point = { date: formatDate(snap.date) }
      if (selected === 'total') {
        let total = 0
        for (const wallet of loadedWallets) {
          const wb = snap.balances[wallet.id]
          if (wb) total += calcUsd(wb, prices, volatileOnly)
        }
        point.value = Math.round(total * 100) / 100
      } else {
        const wb = snap.balances[selected]
        point.value = wb ? Math.round(calcUsd(wb, prices, volatileOnly) * 100) / 100 : 0
      }
      return point
    })
  }, [history, prices, selected, volatileOnly, loadedWallets])

  if (history.length < 2 || !prices) return null

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
      <Card.Body>
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
            onClick={() => setSelected('total')}
            className={selected === 'total' ? 'btn-primary btn-sm' : 'btn-secondary btn-sm'}
          >
            Total
          </button>
          {loadedWallets.map((wallet) => (
            <button
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
