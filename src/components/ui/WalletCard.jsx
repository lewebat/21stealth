import { useMemo } from 'react'
import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table'
import Card from './Card'
import { tokenUsd, tokensWithUsd } from '@/utils/tokenUsd'

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
const shorten = (addr) => addr.length > 20 ? `${addr.slice(0, 10)}…${addr.slice(-6)}` : addr

// Aggregate tokens from multiple addrTokens entries into one list (sum balance+usd by key)
function aggregateTokens(addresses, chain, addrTokens) {
  const map = new Map()
  for (const addr of addresses) {
    const tokens = addrTokens[`${chain}:${addr}`] ?? []
    for (const t of tokens) {
      if (map.has(t.key)) {
        const existing = map.get(t.key)
        map.set(t.key, { ...existing, balance: existing.balance + t.balance })
      } else {
        map.set(t.key, { ...t })
      }
    }
  }
  return [...map.values()]
}

function ChainSection({ chain, addresses, addrTokens, addrStatus, addrError, walletId, getDelta, prices, hideSmall }) {
  // Derive chain-level status: loading if any loading, error if all errored, else ok
  const statuses = addresses.map(a => addrStatus[`${chain}:${a}`] ?? 'loading')
  const chainStatus = statuses.some(s => s === 'loading') ? 'loading'
    : statuses.every(s => s === 'error') ? 'error'
    : 'ok'
  const firstError = addresses.map(a => addrError[`${chain}:${a}`]).find(Boolean)
  const rawTokens = useMemo(
    () => aggregateTokens(addresses, chain, addrTokens),
    [addresses, chain, addrTokens]
  )
  const chainTokens = useMemo(() => {
    const tokens = tokensWithUsd(rawTokens, prices)
      .filter(t => !hideSmall || t.usd >= 1)
      .sort((a, b) => b.usd - a.usd)
    return tokens
  }, [rawTokens, prices, hideSmall])

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
        const delta = getDelta(walletId, row.original.key, getValue())
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
  ], [walletId, getDelta])

  const table = useReactTable({
    data: chainTokens,
    columns,
    getCoreRowModel: getCoreRowModel(),
    autoResetPageIndex: false,
  })

  const addrLabel = addresses.length === 1
    ? shorten(addresses[0])
    : `${addresses.length} addresses`

  if (hideSmall && chainStatus === 'ok' && chainTokens.length === 0) return null

  return (
    <div className="card-section">
      <div className="flex items-center gap-2 mb-1">
        <span className={`chain-badge ${CHAIN_BADGE[chain]}`}>
          {chain.toUpperCase()}
        </span>
        <span className="text-caption font-mono text-text-subtle truncate">{addrLabel}</span>
      </div>
      {chainStatus === 'loading' && <div className="skeleton h-4 w-24" />}
      {chainStatus === 'error' && <div className="form-error">{firstError ?? 'Error'}</div>}
      {chainStatus === 'ok' && (
        chainTokens.length === 0 ? (
          <div className="text-caption text-text-subtle">No balance</div>
        ) : (
          <div className="table-wrapper">
            <table className="table table-compact">
              <tbody>
                {table.getRowModel().rows.map(row => (
                  <tr key={row.id}>
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}

export function WalletCard({ wallet, onRefresh, onRemove, onEdit, getDelta, prices, hideSmall }) {
  // wallet.tokens is pre-aggregated by recompute() in useWallets — reflects all loaded addresses
  const totalUsd = wallet.tokens.reduce((s, t) => s + tokenUsd(t, prices), 0)
  const allKeys = wallet.entries.flatMap(e => e.addresses.map(a => `${e.chain}:${a}`))
  const isPartialError = wallet.status === 'error' &&
    allKeys.some(k => wallet.addrStatus[k] === 'ok')
  const chainCount = wallet.entries.length

  // Sort entries by total chain USD descending
  const sortedEntries = useMemo(() => {
    const chainUsd = new Map()
    for (const t of wallet.tokens) {
      chainUsd.set(t.chain, (chainUsd.get(t.chain) ?? 0) + tokenUsd(t, prices))
    }
    return [...wallet.entries].sort((a, b) => (chainUsd.get(b.chain) ?? 0) - (chainUsd.get(a.chain) ?? 0))
  }, [wallet.entries, wallet.tokens, prices])

  return (
    <Card className="h-full flex flex-col">
      <Card.Header>
        <div className="flex items-center gap-1.5 min-w-0">
          {chainCount === 1 ? (
            <span className={`chain-badge ${CHAIN_BADGE[wallet.entries[0].chain]}`}>
              {wallet.entries[0].chain.toUpperCase()}
            </span>
          ) : (
            <span className="chain-badge bg-primary text-text-inverted">
              {chainCount} Chains
            </span>
          )}
          <span className="text-body font-semibold truncate">{wallet.label}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onEdit}
            title="Edit"
            className="btn-icon text-text-muted hover:text-text"
          >
            ✎
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={wallet.status === 'loading'}
            title="Refresh"
            className="btn-icon text-text-muted hover:text-text disabled:opacity-40"
          >
            {wallet.status === 'loading' ? '…' : '↻'}
          </button>
          <button type="button" onClick={onRemove} title="Remove" className="btn-icon text-text-subtle hover:text-danger">
            ✕
          </button>
        </div>
      </Card.Header>

      <Card.Body>
        {hideSmall && sortedEntries.every(({ chain }) =>
          wallet.tokens.filter(t => t.chain === chain).every(t => tokenUsd(t, prices) < 1)
        ) && (
          <div className="text-caption text-text-subtle py-2 flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>
            All values below $1
          </div>
        )}
        {sortedEntries.map(({ chain, addresses }) => (
          <ChainSection
            key={chain}
            chain={chain}
            addresses={addresses}
            addrTokens={wallet.addrTokens}
            addrStatus={wallet.addrStatus}
            addrError={wallet.addrError}
            walletId={wallet.id}
            getDelta={getDelta}
            prices={prices}
            hideSmall={hideSmall}
          />
        ))}
      </Card.Body>

      <Card.Footer className="mt-auto">
        <span className="text-caption text-text-subtle">Total</span>
        <span className="text-caption font-semibold">
          ${fmt2(totalUsd)}{isPartialError ? ' *' : ''}
        </span>
      </Card.Footer>
    </Card>
  )
}
