import { useMemo, useState } from 'react'
import { useReactTable, getCoreRowModel, getSortedRowModel, flexRender } from '@tanstack/react-table'
import Card from './Card'
import { ChainBadge } from './ChainBadge'
import { tokenUsd } from '@/utils/tokenUsd'
import { formatCurrency, formatBalance } from '@lib/utils'
import { TOKEN_LABELS, TOKEN_COLORS, STABLECOINS } from '@utils/tokenMetadata'
const fmtHoldings = (n, key) => formatBalance(n, { isStablecoin: STABLECOINS.has(key), maxDecimals: 8 })

function TokenCell({ row }) {
  const colors = TOKEN_COLORS[row.original.key] ?? { text: 'text-text-muted' }
  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs font-bold w-10 ${colors.text}`}>{row.original.key.toUpperCase()}</span>
      <span className="text-caption text-text-muted">{row.original.label}</span>
      {row.original.chain && (
        <ChainBadge chain={row.original.chain} className="bg-surface-elevated text-text-subtle border border-border" />
      )}
    </div>
  )
}

export function PortfolioSummary({ wallets, getDelta, prices }) {
  const [tab, setTab] = useState('value')

  const { data, totalUsd } = useMemo(() => {
    const map = new Map()
    for (const wallet of wallets.filter((w) => w.tokens.length > 0)) {
      for (const token of wallet.tokens) {
        const usd = tokenUsd(token, prices)
        const unitPrice = tokenUsd({ ...token, balance: 1 }, prices)
        const delta = getDelta(wallet.id, `${token.chain}:${token.key}`, token.balance)
        const mapKey = `${token.chain}:${token.key}`
        const existing = map.get(mapKey)
        if (existing) {
          existing.usd += usd
          existing.balance += token.balance
          if (delta !== null)
            existing.deltaUsd = (existing.deltaUsd ?? 0) + delta * unitPrice
        } else {
          map.set(mapKey, {
            key: token.key,
            chain: token.chain,
            label: TOKEN_LABELS[token.key] ?? token.key,
            usd,
            balance: token.balance,
            deltaUsd: delta !== null ? delta * unitPrice : null,
          })
        }
      }
    }
    const rows = Array.from(map.values()).sort((a, b) => b.usd - a.usd)
    const total = rows.reduce((s, t) => s + t.usd, 0)
    return { data: rows, totalUsd: total }
  }, [wallets, getDelta, prices])

  const valueColumns = useMemo(() => [
    {
      id: 'token',
      header: 'Token',
      accessorKey: 'key',
      cell: ({ row }) => <TokenCell row={row} />,
    },
    {
      id: 'usd',
      header: () => <span className="block text-right">Value (USD)</span>,
      accessorKey: 'usd',
      cell: ({ getValue, row }) => {
        const positive = row.original.deltaUsd !== null && row.original.deltaUsd > 0
        return (
          <div className="text-right">
            <span className="font-semibold">{formatCurrency(getValue())}</span>
            {row.original.deltaUsd !== null && Math.abs(row.original.deltaUsd) >= 0.01 && (
              <span className={`text-caption font-mono ml-1.5 ${positive ? 'text-success' : 'text-danger'}`}>
                {formatCurrency(row.original.deltaUsd, { sign: true })}
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

  const holdingsColumns = useMemo(() => [
    {
      id: 'token',
      header: 'Token',
      accessorKey: 'key',
      cell: ({ row }) => <TokenCell row={row} />,
    },
    {
      id: 'balance',
      header: () => <span className="block text-right">Balance</span>,
      accessorKey: 'balance',
      cell: ({ getValue, row }) => (
        <div className="text-right font-mono text-caption">
          {fmtHoldings(getValue(), row.original.key)} <span className="text-text-subtle">{row.original.key.toUpperCase()}</span>
        </div>
      ),
    },
  ], [])

  const columns = tab === 'value' ? valueColumns : holdingsColumns
  const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(), autoResetPageIndex: false })

  if (data.length === 0) return null

  return (
    <Card className="h-full">
      <Card.Header>
        <span className="h5">Breakdown</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setTab('value')}
            className={`btn-tab${tab === 'value' ? ' active' : ''}`}
          >
            Value
          </button>
          <button
            type="button"
            onClick={() => setTab('holdings')}
            className={`btn-tab${tab === 'holdings' ? ' active' : ''}`}
          >
            Holdings
          </button>
        </div>
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
