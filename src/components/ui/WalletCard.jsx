import { useMemo } from 'react'
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table'
import Card from './Card'

const CHAIN_BADGE = {
  eth:  'bg-primary text-text-inverted',
  btc:  'bg-accent text-text-inverted',
  sol:  'bg-info text-text-inverted',
  ltc:  'bg-info text-text-inverted',
  doge: 'bg-warning text-text-inverted',
  trx:  'bg-danger text-text-inverted',
}

const fmt4 = (n) => n.toLocaleString('en-US', { maximumFractionDigits: 4 })
const fmt2 = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function WalletCard({ wallet, onRefresh, onRemove, getDelta, className = '' }) {
  const totalUsd = wallet.tokens.reduce((s, t) => s + t.usd, 0)
  const isEmpty  = wallet.status === 'ok' && totalUsd === 0

  const columns = useMemo(() => [
    {
      id: 'token',
      header: 'Token',
      accessorKey: 'key',
      cell: ({ getValue }) => <span className="text-label text-text-muted">{getValue().toUpperCase()}</span>,
    },
    {
      id: 'balance',
      header: () => <span className="block text-right">Balance</span>,
      accessorKey: 'balance',
      cell: ({ getValue, row }) => {
        const delta = getDelta(wallet.id, row.original.key, getValue())
        const positive = delta !== null && delta > 0
        return (
          <div className="text-right">
            <span className="font-mono text-caption">{fmt4(getValue())}</span>
            {delta !== null && (
              <span className={`text-caption font-mono ml-1 ${positive ? 'text-success' : 'text-danger'}`}>
                {positive ? '+' : ''}{fmt4(delta)}
              </span>
            )}
          </div>
        )
      },
    },
    {
      id: 'usd',
      header: () => <span className="block text-right">USD</span>,
      accessorKey: 'usd',
      cell: ({ getValue }) => (
        <div className="text-right font-mono text-caption text-text-muted">${fmt2(getValue())}</div>
      ),
    },
  ], [wallet.id, getDelta])

  const table = useReactTable({ data: wallet.tokens, columns, getCoreRowModel: getCoreRowModel(), autoResetPageIndex: false })

  return (
    <Card className={`h-full flex flex-col ${isEmpty ? 'opacity-50' : ''}`}>
      {/* Header */}
      <Card.Header>
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 ${CHAIN_BADGE[wallet.chain]}`}>
            {wallet.chain.toUpperCase()}
          </span>
          <span className="text-body font-semibold truncate">{wallet.label}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onRefresh}
            disabled={wallet.status === 'loading'}
            title="Refresh"
            className="btn-icon text-text-muted hover:text-text disabled:opacity-40"
          >
            {wallet.status === 'loading' ? '…' : '↻'}
          </button>
          <button onClick={onRemove} title="Remove" className="btn-icon text-text-subtle hover:text-danger">
            ✕
          </button>
        </div>
      </Card.Header>

      {/* Address */}
      <Card.Body className="py-1.5">
        <span className="text-caption font-mono text-text-subtle break-all">
          {wallet.address}
        </span>
      </Card.Body>

      {/* States */}
      {wallet.status === 'loading' && (
        <div className="p-3"><div className="skeleton h-4 w-24" /></div>
      )}
      {wallet.status === 'error' && (
        <div className="p-3 form-error">{wallet.errorMsg ?? 'Error'}</div>
      )}
      {wallet.status === 'ok' && (
        wallet.tokens.length === 0 ? (
          <div className="p-3 text-caption text-text-subtle">No balance</div>
        ) : (
          <>
            <Card.Body>
          <div className="table-wrapper">
              <table className="table table-compact">
                <thead>
                  {table.getHeaderGroups().map((hg) => (
                    <tr key={hg.id}>
                      {hg.headers.map((h) => (
                        <th key={h.id}>{flexRender(h.column.columnDef.header, h.getContext())}</th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr key={row.id}>
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card.Body>
            <Card.Footer className="mt-auto">
              <span className="text-caption text-text-subtle">Total</span>
              <span className="text-caption font-semibold">${fmt2(totalUsd)}</span>
            </Card.Footer>
          </>
        )
      )}
    </Card>
  )
}
