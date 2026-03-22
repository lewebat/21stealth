import { useMemo } from 'react'
import { useReactTable, getCoreRowModel, getSortedRowModel, flexRender } from '@tanstack/react-table'
import Card from './Card'
import { tokenUsd } from '@/utils/tokenUsd'

const TOKEN_LABELS = { btc: 'Bitcoin', eth: 'Ethereum', sol: 'Solana', ltc: 'Litecoin', doge: 'Dogecoin', trx: 'Tron', usdt: 'Tether USD', usdc: 'USD Coin' }

const TOKEN_COLORS = {
  btc:  { text: 'text-accent',   bar: 'bg-accent' },
  eth:  { text: 'text-primary',  bar: 'bg-primary' },
  sol:  { text: 'text-info',     bar: 'bg-info' },
  ltc:  { text: 'text-info',     bar: 'bg-info' },
  doge: { text: 'text-warning',  bar: 'bg-warning' },
  trx:  { text: 'text-danger',   bar: 'bg-danger' },
  usdt: { text: 'text-success',  bar: 'bg-success' },
  usdc: { text: 'text-info',     bar: 'bg-info' },
}

const fmt = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function PortfolioSummary({ wallets, getDelta, prices }) {
  const loadedWallets = wallets.filter((w) => w.status === 'ok')

  const { data, totalUsd } = useMemo(() => {
    const map = new Map()
    for (const wallet of loadedWallets) {
      for (const token of wallet.tokens) {
        const usd = tokenUsd(token, prices)
        const unitPrice = token.balance > 0 ? usd / token.balance : 0
        const delta = getDelta(wallet.id, token.key, token.balance)
        const mapKey = `${token.chain}:${token.key}`
        const existing = map.get(mapKey)
        if (existing) {
          existing.usd += usd
          if (delta !== null)
            existing.deltaUsd = (existing.deltaUsd ?? 0) + delta * unitPrice
        } else {
          map.set(mapKey, {
            key: token.key,
            chain: token.chain,
            label: TOKEN_LABELS[token.key] ?? token.key,
            usd,
            deltaUsd: delta !== null ? delta * unitPrice : null,
          })
        }
      }
    }
    const rows = Array.from(map.values()).sort((a, b) => b.usd - a.usd)
    const total = rows.reduce((s, t) => s + t.usd, 0)
    return { data: rows, totalUsd: total }
  }, [loadedWallets, getDelta, prices])

  const columns = useMemo(() => [
    {
      id: 'token',
      header: 'Token',
      accessorKey: 'key',
      cell: ({ row }) => {
        const colors = TOKEN_COLORS[row.original.key] ?? { text: 'text-text-muted' }
        return (
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold w-10 ${colors.text}`}>{row.original.key.toUpperCase()}</span>
            <span className="text-caption text-text-muted">{row.original.label}</span>
            {row.original.chain && (
              <span className="chain-badge bg-surface-elevated text-text-subtle border border-border">{row.original.chain.toUpperCase()}</span>
            )}
          </div>
        )
      },
    },
    {
      id: 'usd',
      header: () => <span className="block text-right">Value (USD)</span>,
      accessorKey: 'usd',
      cell: ({ getValue, row }) => {
        const positive = row.original.deltaUsd !== null && row.original.deltaUsd > 0
        return (
          <div className="text-right">
            <span className="font-semibold">${fmt(getValue())}</span>
            {row.original.deltaUsd !== null && Math.abs(row.original.deltaUsd) >= 0.01 && (
              <span className={`text-caption font-mono ml-1.5 ${positive ? 'text-success' : 'text-danger'}`}>
                {positive ? '+' : ''}${fmt(row.original.deltaUsd)}
              </span>
            )}
          </div>
        )
      },
    },
    {
      id: 'share',
      header: () => <span className="block text-right">Share</span>,
      accessorKey: 'usd',
      enableSorting: false,
      cell: ({ row }) => {
        const pct = totalUsd > 0 ? (row.original.usd / totalUsd) * 100 : 0
        const colors = TOKEN_COLORS[row.original.key] ?? { bar: 'bg-text-muted' }
        return (
          <div className="flex items-center justify-end gap-2 min-w-[80px]">
            <span className="text-caption text-text-muted w-10 text-right">{pct.toFixed(1)}%</span>
            <div className="w-16 h-1 bg-border rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${colors.bar}`} style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      },
    },
  ], [totalUsd])

  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(), autoResetPageIndex: false })

  if (data.length === 0) return null

  return (
    <Card>
      <Card.Header>
        <span className="h5">Breakdown</span>
      </Card.Header>
      <Card.Body>
      <div className="table-wrapper">
        <table className="table table-compact">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </Card.Body>
    </Card>
  )
}
