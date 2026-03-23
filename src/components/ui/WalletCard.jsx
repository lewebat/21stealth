import { useMemo, useState } from 'react'
import { Pencil, RefreshCw, X, Info, ChevronUp, ChevronDown } from 'lucide-react'
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

export function WalletCard({ wallet, onRefresh, onRemove, onEdit, getDelta, prices, hideSmall, fullAddresses }) {
  const totalUsd = wallet.tokens.reduce((s, t) => s + tokenUsd(t, prices), 0)
  const allKeys = wallet.entries.flatMap(e => e.addresses.map(a => `${e.chain}:${a}`))
  const isPartialError = wallet.status === 'error' &&
    allKeys.some(k => wallet.addrStatus[k] === 'ok')
  const chainCount = wallet.entries.length

  // Sort entries by total chain USD descending, build unified row list
  const chains = useMemo(() => {
    const chainUsd = new Map()
    for (const t of wallet.tokens) {
      chainUsd.set(t.chain, (chainUsd.get(t.chain) ?? 0) + tokenUsd(t, prices))
    }
    return [...wallet.entries]
      .sort((a, b) => (chainUsd.get(b.chain) ?? 0) - (chainUsd.get(a.chain) ?? 0))
      .map(({ chain, addresses }) => {
        const statuses = addresses.map(a => wallet.addrStatus[`${chain}:${a}`] ?? 'loading')
        const status = statuses.some(s => s === 'loading') ? 'loading'
          : statuses.every(s => s === 'error') ? 'error'
          : 'ok'
        const firstError = addresses.map(a => wallet.addrError[`${chain}:${a}`]).find(Boolean)
        const rawTokens = aggregateTokens(addresses, chain, wallet.addrTokens)
        const tokens = tokensWithUsd(rawTokens, prices)
          .filter(t => !hideSmall || t.usd >= 1)
          .sort((a, b) => b.usd - a.usd)
        return { chain, addresses, status, firstError, tokens }
      })
      .filter(c => !hideSmall || c.status !== 'ok' || c.tokens.length > 0)
  }, [wallet.entries, wallet.tokens, wallet.addrTokens, wallet.addrStatus, wallet.addrError, prices, hideSmall])

  const allHidden = hideSmall && chains.length === 0
  const [expandedChains, setExpandedChains] = useState(new Set())
  const toggleExpand = (chain) => setExpandedChains(prev => {
    const next = new Set(prev)
    next.has(chain) ? next.delete(chain) : next.add(chain)
    return next
  })

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
          <button type="button" onClick={onEdit} title="Edit" className="btn-icon text-text-muted hover:text-text"><Pencil size={14} /></button>
          <button type="button" onClick={onRefresh} disabled={wallet.status === 'loading'} title="Refresh" className="btn-icon text-text-muted hover:text-text disabled:opacity-40">
            <RefreshCw size={14} />
          </button>
          <button type="button" onClick={onRemove} title="Remove" className="btn-icon text-text-subtle hover:text-danger"><X size={14} /></button>
        </div>
      </Card.Header>

      <Card.Body>
        {allHidden ? (
          <div className="text-caption text-text-subtle py-2 flex items-center gap-1.5">
            <Info size={13} />
            All values below $1
          </div>
        ) : (
          <div className="table-wrapper">
            <table className="table table-compact">
              <tbody>
                {chains.map(({ chain, addresses, status, firstError, tokens }) => {
                  const addrLabel = addresses.length === 1
                    ? (fullAddresses ? addresses[0] : shorten(addresses[0]))
                    : `${addresses.length} addresses`
                  return (
                  <>
                    <tr key={`${chain}-header`} className="chain-header-row">
                      <td colSpan={3} className="pb-0 pt-0">
                        <div className="flex items-center gap-2">
                          <span className={`chain-badge ${CHAIN_BADGE[chain]}`}>{chain.toUpperCase()}</span>
                          <span className="text-caption font-mono text-text-subtle truncate">{addrLabel}</span>
                          {addresses.length > 1 && (
                            <button
                              type="button"
                              onClick={() => toggleExpand(chain)}
                              className="btn-icon btn-icon-xs text-text-subtle hover:text-text"
                              title={expandedChains.has(chain) ? 'Hide addresses' : 'Show addresses'}
                            >
                              {expandedChains.has(chain) ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {status === 'loading' && (
                      <tr key={`${chain}-loading`}>
                        <td colSpan={3}><div className="skeleton h-4 w-24" /></td>
                      </tr>
                    )}
                    {status === 'error' && (
                      <tr key={`${chain}-error`}>
                        <td colSpan={3}><div className="form-error">{firstError ?? 'Error'}</div></td>
                      </tr>
                    )}
                    {status === 'ok' && !expandedChains.has(chain) && tokens.length === 0 && (
                      <tr key={`${chain}-empty`}>
                        <td colSpan={3}><span className="text-caption text-text-subtle">No balance</span></td>
                      </tr>
                    )}
                    {status === 'ok' && !expandedChains.has(chain) && tokens.map(token => {
                      const delta = getDelta(wallet.id, `${chain}:${token.key}`, token.balance)
                      const positive = delta !== null && delta > 0
                      return (
                        <tr key={`${chain}-${token.key}`}>
                          <td><span className="text-label text-text-muted">{token.key.toUpperCase()}</span></td>
                          <td>
                            <div className="text-right">
                              <span className="font-mono text-caption">{fmt4(token.balance)}</span>
                              {delta !== null && (
                                <span className={`text-caption font-mono ml-1 ${positive ? 'text-success' : 'text-danger'}`}>
                                  {positive ? '+' : ''}{fmt4(delta)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="text-right font-mono text-caption text-text-muted">${fmt2(token.usd)}</div>
                          </td>
                        </tr>
                      )
                    })}
                    {status === 'ok' && expandedChains.has(chain) && addresses.map(addr => {
                      const addrTokensRaw = tokensWithUsd(wallet.addrTokens[`${chain}:${addr}`] ?? [], prices)
                        .filter(t => !hideSmall || t.usd >= 1)
                        .sort((a, b) => b.usd - a.usd)
                      return (
                        <>
                          <tr key={`${chain}-${addr}-header`} className="chain-header-row">
                            <td colSpan={3} className="pb-0 pt-0">
                              <span className="text-caption font-mono text-text-subtle">{fullAddresses ? addr : shorten(addr)}</span>
                            </td>
                          </tr>
                          {addrTokensRaw.length === 0 ? (
                            <tr key={`${chain}-${addr}-empty`}>
                              <td colSpan={3}><span className="text-caption text-text-subtle">No balance</span></td>
                            </tr>
                          ) : addrTokensRaw.map(token => (
                            <tr key={`${chain}-${addr}-${token.key}`}>
                              <td><span className="text-label text-text-muted">{token.key.toUpperCase()}</span></td>
                              <td>
                                <div className="text-right font-mono text-caption">{fmt4(token.balance)}</div>
                              </td>
                              <td>
                                <div className="text-right font-mono text-caption text-text-muted">${fmt2(token.usd)}</div>
                              </td>
                            </tr>
                          ))}
                        </>
                      )
                    })}
                  </>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
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
