import { useMemo } from 'react'
import { RefreshCw } from 'lucide-react'
import { PieChart, Pie, Cell, Sector, ResponsiveContainer } from 'recharts'
import Card from './Card'
import Button from './Button'
import { tokenUsd } from '@/utils/tokenUsd'

const TOKEN_CHART_COLORS = {
  'btc:btc':   '#d4f042',
  'eth:eth':   '#3b82f6',
  'sol:sol':   '#8b5cf6',
  'ltc:ltc':   '#06b6d4',
  'doge:doge': '#f59e0b',
  'trx:trx':   '#ef4444',
  'eth:usdt':  '#22c55e',
  'trx:usdt':  '#16a34a',
  'eth:usdc':  '#10b981',
  'trx:usdc':  '#0d9488',
}
const FALLBACK_COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#22c55e', '#d4f042', '#10b981']

const MIN_THICKNESS = 4
const MAX_THICKNESS = 18

function VariableSlice({ cx, cy, innerRadius, startAngle, endAngle, fill, percent }) {
  const thickness = MIN_THICKNESS + (MAX_THICKNESS - MIN_THICKNESS) * percent
  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius}
      outerRadius={innerRadius + thickness}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
    />
  )
}

const fmtFull  = (n) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtShort = (n) => {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000)     return '$' + (n / 1_000).toFixed(2) + 'K'
  return fmtFull(n)
}

export function TotalBar({ wallets, prices, onRefreshAll }) {
  const { segments, total } = useMemo(() => {
    const map = new Map()
    for (const wallet of wallets) {
      for (const token of wallet.tokens) {
        const usd = tokenUsd(token, prices)
        if (usd > 0) {
          const mapKey = `${token.chain}:${token.key}`
          map.set(mapKey, (map.get(mapKey) ?? 0) + usd)
        }
      }
    }
    const entries = Array.from(map.entries()).sort((a, b) => b[1] - a[1])
    const totalVal = entries.reduce((s, [, usd]) => s + usd, 0)
    return {
      segments: entries.map(([mapKey, usd], i) => {
        const [chain, key] = mapKey.split(':')
        const label = chain === key ? key.toUpperCase() : `${key.toUpperCase()} ${chain.toUpperCase()}`
        return {
          mapKey,
          key,
          chain,
          label,
          usd,
          color: TOKEN_CHART_COLORS[mapKey] ?? FALLBACK_COLORS[i % FALLBACK_COLORS.length],
        }
      }),
      total: totalVal,
    }
  }, [wallets, prices])

  return (
    <Card className="h-full flex flex-col">
      <Card.Header>
        <span className="h5">Total Portfolio</span>
        <Button variant="ghost" size="xs" onClick={onRefreshAll} aria-label="Refresh all">
          <RefreshCw size={14} />
        </Button>
      </Card.Header>
      <Card.Body className="card-body-auto flex-1 flex items-center justify-center">
        {segments.length === 0 ? (
          <div className="h2">{fmtFull(0)}</div>
        ) : (
          <div className="flex flex-col items-center gap-3 w-full">
            {/* Donut chart */}
            <div className="relative flex-shrink-0" style={{ width: 210, height: 210, marginTop: '-35px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Pie
                    data={segments}
                    cx="50%"
                    cy="50%"
                    innerRadius={68}
                    outerRadius={102}
                    paddingAngle={2}
                    dataKey="usd"
                    strokeWidth={0}
                    startAngle={90}
                    endAngle={-270}
                    shape={<VariableSlice />}
                  >
                    {segments.map((seg) => (
                      <Cell key={seg.mapKey} fill={seg.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              {/* Betrag in der Mitte */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-0.5">
                <span className="text-caption text-text-muted">Total</span>
                <span className="font-mono font-bold text-text leading-none" style={{ fontSize: total >= 100_000 ? '0.75rem' : '0.875rem' }}>
                  {fmtShort(total)}
                </span>
              </div>
            </div>

            {/* Legende – Marquee */}
            <div className="overflow-hidden w-full">
              <div className="ticker-track flex w-max gap-5">
                {[...segments, ...segments].map((seg, i) => {
                  const pct = total > 0 ? (seg.usd / total) * 100 : 0
                  return (
                    <div key={i} className="flex items-baseline gap-1 shrink-0">
                      <span className="font-bold leading-none" style={{ color: seg.color, fontSize: '0.78rem' }}>{seg.label}</span>
                      <span className="text-text-muted leading-none" style={{ fontSize: '0.65rem' }}>{pct.toFixed(0)}%</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  )
}
