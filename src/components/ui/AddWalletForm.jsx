import { useState } from 'react'
import { detectChain } from '@utils/detectChain'
import { FloatInput } from './Form'
import Button from './Button'
import { Modal } from './Modal'

const CHAIN_LABELS = { eth: 'Ethereum', btc: 'Bitcoin', sol: 'Solana', ltc: 'Litecoin', doge: 'Dogecoin', trx: 'Tron' }
const CHAIN_BADGE = {
  eth: 'bg-primary text-text-inverted', btc: 'bg-accent text-text-inverted',
  sol: 'bg-info text-text-inverted',    ltc: 'bg-info text-text-inverted',
  doge: 'bg-warning text-text-inverted', trx: 'bg-danger text-text-inverted',
}
const MAX_ADDRESSES = 10

export function AddWalletForm({ isOpen, onClose, onAdd }) {
  const [label, setLabel] = useState('')
  const [firstAddr, setFirstAddr] = useState('')
  const [extraAddresses, setExtraAddresses] = useState([])
  const [newAddr, setNewAddr] = useState('')
  const [newAddrError, setNewAddrError] = useState('')

  const firstTrimmed = firstAddr.trim()
  const firstChain = detectChain(firstTrimmed)
  const allAddedAddrs = firstChain ? [firstTrimmed, ...extraAddresses] : []

  // Group all addresses by chain, preserving insertion order
  function buildEntries(extra = extraAddresses) {
    if (!firstChain) return []
    const map = new Map()
    map.set(firstChain, [firstTrimmed])
    for (const addr of extra) {
      const chain = detectChain(addr)
      if (!chain) continue
      if (!map.has(chain)) map.set(chain, [])
      map.get(chain).push(addr)
    }
    return [...map.entries()].map(([chain, addresses]) => ({ chain, addresses }))
  }

  const allEntries = buildEntries()

  function reset() {
    setLabel(''); setFirstAddr(''); setExtraAddresses([])
    setNewAddr(''); setNewAddrError('')
  }

  function handleClose() { reset(); onClose() }

  function handleAddAddr() {
    const trimmed = newAddr.trim()
    if (!trimmed) return
    const chain = detectChain(trimmed)
    if (!chain) { setNewAddrError('Unknown address'); return }
    if (allAddedAddrs.includes(trimmed)) { setNewAddrError('Address already added'); return }
    const chainCount = allAddedAddrs.filter(a => detectChain(a) === chain).length
    if (chainCount >= MAX_ADDRESSES) {
      setNewAddrError(`Max ${MAX_ADDRESSES} addresses reached for ${chain.toUpperCase()}`)
      return
    }
    setExtraAddresses(prev => [...prev, trimmed])
    setNewAddr('')
    setNewAddrError('')
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!firstTrimmed || !firstChain) return
    onAdd(label.trim() || CHAIN_LABELS[firstChain] || 'Wallet', allEntries)
    reset()
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add wallet" size="sm">
      <form onSubmit={handleSubmit}>
        <Modal.Body>
          <div className="stack stack-md">

            <FloatInput
              id="wallet-label"
              label="Label (optional)"
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              autoFocus
            />

            <FloatInput
              id="wallet-address"
              label="Wallet address — chain auto-detected"
              type="text"
              value={firstAddr}
              onChange={e => { setFirstAddr(e.target.value); setExtraAddresses([]); setNewAddrError('') }}
              required
              className="font-mono"
              iconRight={
                firstAddr.length > 0 ? (
                  firstChain
                    ? <span className="text-success text-xs font-semibold">{CHAIN_LABELS[firstChain]}</span>
                    : <span className="text-danger text-xs font-semibold">Unknown</span>
                ) : null
              }
            />

            {/* Added addresses grouped by chain */}
            {firstChain && extraAddresses.length > 0 && (
              <div className="stack stack-sm">
                {allEntries.map(({ chain, addresses }) => (
                  <div key={chain}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`chain-badge ${CHAIN_BADGE[chain]}`}>{chain.toUpperCase()}</span>
                      <span className="text-caption text-text-muted">{CHAIN_LABELS[chain]}</span>
                    </div>
                    <div className="stack stack-xs">
                      {addresses.map((addr, i) => (
                        <div key={addr} className="flex items-center gap-2">
                          <span className="flex-1 font-mono text-caption text-text-muted truncate">{addr}</span>
                          {!(chain === firstChain && i === 0) && (
                            <button
                              type="button"
                              onClick={() => setExtraAddresses(prev => prev.filter(a => a !== addr))}
                              className="btn-icon text-danger"
                            >✕</button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Unified add address input — routes automatically by auto-detect */}
            {firstChain && (
              <div>
                <div className="flex gap-2">
                  <FloatInput
                    label="Add another address or chain"
                    type="text"
                    value={newAddr}
                    onChange={e => { setNewAddr(e.target.value); setNewAddrError('') }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddAddr() } }}
                    className="font-mono flex-1"
                  />
                  <Button type="button" variant="secondary" onClick={handleAddAddr}>+</Button>
                </div>
                {newAddrError && <p className="form-error mt-1">{newAddrError}</p>}
              </div>
            )}

          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" type="button" onClick={handleClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!firstChain}>
            {firstChain
              ? `Add wallet (${allEntries.length} chain${allEntries.length > 1 ? 's' : ''})`
              : 'Add wallet'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  )
}
