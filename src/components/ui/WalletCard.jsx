import { Fragment, useMemo, useState } from 'react'
import { Pencil, RefreshCw, X, Info, ChevronUp, ChevronDown } from 'lucide-react'
import Card from './Card'
import { ChainBadge } from './ChainBadge'
import { tokenUsd, tokensWithUsd } from '@/utils/tokenUsd'
import { formatCurrency, formatBalance } from '@lib/utils'
import { STABLECOINS } from '@utils/tokenMetadata'

const fmtBalance = (n, key) => formatBalance(n, { isStablecoin: STABLECOINS.has(key) })
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
  const allKeys = wallet.entries.flatMap(e =>
    e.type === 'xpub'
      ? [`xpub:${e.chain}:${e.xpub}`]
      : e.addresses.map(a => `${e.chain}:${a}`)
  )
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
      .map((entry) => {
        const { chain, type, xpub } = entry
        const addresses = type === 'xpub'
          ? (wallet.derivedAddrs?.[`xpub:${chain}:${xpub}`] ?? [])
          : entry.addresses
        const statuses = addresses.map(a => wallet.addrStatus[`${chain}:${a}`] ?? 'loading')
        const status = addresses.length === 0
          ? (type === 'xpub' ? (wallet.addrStatus[`xpub:${chain}:${xpub}`] ?? 'loading') : 'loading')
          : statuses.some(s => s === 'loading') ? 'loading'
          : statuses.every(s => s === 'error') ? 'error'
          : 'ok'
        const firstError = addresses.map(a => wallet.addrError[`${chain}:${a}`]).find(Boolean)
        const rawTokens = aggregateTokens(addresses, chain, wallet.addrTokens)
        const tokens = tokensWithUsd(rawTokens, prices)
          .filter(t => !hideSmall || t.usd >= 1)
          .sort((a, b) => b.usd - a.usd)
        return { chain, type, xpub, addresses, status, firstError, tokens }
      })
      .filter(c => !hideSmall || c.status !== 'ok' || c.tokens.length > 0)
  }, [wallet.entries, wallet.tokens, wallet.addrTokens, wallet.addrStatus, wallet.addrError, wallet.derivedAddrs, prices, hideSmall])

  const allHidden = hideSmall && chains.length === 0
  const [expandedChains, setExpandedChains] = useState(new Set())
  const toggleExpand = (chain) => setExpandedChains(prev => {
    const next = new Set(prev)
    next.has(chain) ? next.delete(chain) : next.add(chain)
    return next
  })

  const [confirmRemove, setConfirmRemove] = useState(false)

  return (
    <Card className="h-full flex flex-col">
      <Card.Header>
        <div className="flex items-center gap-1.5 min-w-0">
          {chainCount === 1 ? (
            <ChainBadge chain={wallet.entries[0].chain} />
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
          {confirmRemove ? (
            <>
              <button
                type="button"
                onClick={onRemove}
                className="btn-icon text-danger"
                title="Confirm remove"
              ><X size={14} /></button>
              <button
                type="button"
                onClick={() => setConfirmRemove(false)}
                className="text-caption text-text-subtle hover:text-text px-1"
                title="Cancel"
              >Cancel</button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmRemove(true)}
              title="Remove wallet"
              className="btn-icon text-text-subtle hover:text-danger"
            ><X size={14} /></button>
          )}
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
                {chains.map(({ chain, type, xpub, addresses, status, firstError, tokens }) => {
                  const isXpub = type === 'xpub'
                  const addrLabel = isXpub
                    ? null
                    : addresses.length === 1
                      ? (fullAddresses ? addresses[0] : shorten(addresses[0]))
                      : `${addresses.length} addresses`
                  return (
                  <Fragment key={chain}>
                    <tr key={`${chain}-header`} className="chain-header-row">
                      <td colSpan={3} className="pb-0 pt-0">
                        <div className="flex items-center gap-2">
                          <ChainBadge chain={chain} />
                          {isXpub ? (
                            <>
                              <span className="font-mono text-caption text-text-subtle">
                                {xpub.slice(0, 10)}••••••
                              </span>
                              <span className="text-label text-text-subtle">xPub</span>
                              {addresses.length > 0 && (
                                <button
                                  type="button"
                                  onClick={() => toggleExpand(chain)}
                                  className="btn-icon btn-icon-xs text-text-subtle hover:text-text"
                                  title={expandedChains.has(chain) ? 'Hide addresses' : 'Show addresses'}
                                >
                                  {expandedChains.has(chain) ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                </button>
                              )}
                            </>
                          ) : (
                            <>
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
                            </>
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
                              <span className="font-mono text-caption">{fmtBalance(token.balance, token.key)}</span>
                              {delta !== null && (
                                <span className={`text-caption font-mono ml-1 ${positive ? 'text-success' : 'text-danger'}`}>
                                  {positive ? '+' : ''}{fmtBalance(delta, token.key)}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="text-right font-mono text-caption text-text-muted">{formatCurrency(token.usd)}</div>
                          </td>
                        </tr>
                      )
                    })}
                    {status === 'ok' && expandedChains.has(chain) && (isXpub
                      ? addresses.map(addr => {
                          const addrTokensRaw = tokensWithUsd(wallet.addrTokens[`${chain}:${addr}`] ?? [], prices)
                            .filter(t => !hideSmall || t.usd >= 1)
                            .sort((a, b) => b.usd - a.usd)
                          return (
                            <Fragment key={`${chain}-${addr}`}>
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
                                    <div className="text-right font-mono text-caption">{fmtBalance(token.balance, token.key)}</div>
                                  </td>
                                  <td>
                                    <div className="text-right font-mono text-caption text-text-muted">{formatCurrency(token.usd)}</div>
                                  </td>
                                </tr>
                              ))}
                            </Fragment>
                          )
                        })
                      : addresses.map(addr => {
                          const addrTokensRaw = tokensWithUsd(wallet.addrTokens[`${chain}:${addr}`] ?? [], prices)
                            .filter(t => !hideSmall || t.usd >= 1)
                            .sort((a, b) => b.usd - a.usd)
                          return (
                            <Fragment key={`${chain}-${addr}`}>
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
                                    <div className="text-right font-mono text-caption">{fmtBalance(token.balance, token.key)}</div>
                                  </td>
                                  <td>
                                    <div className="text-right font-mono text-caption text-text-muted">{formatCurrency(token.usd)}</div>
                                  </td>
                                </tr>
                              ))}
                            </Fragment>
                          )
                        })
                    )}
                  </Fragment>
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
          {formatCurrency(totalUsd)}{isPartialError ? ' *' : ''}
        </span>
      </Card.Footer>
    </Card>
  )
}
