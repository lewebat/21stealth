import { useState } from 'react'
import { X } from 'lucide-react'
import { detectInput } from '@utils/detectInput'
import { FloatInput } from './Form'
import Button from './Button'
import { Modal } from './Modal'
import { HelpLink } from '@ui'
import { CHAIN_LABELS, CHAIN_BADGE } from '@utils/chains'

const MAX_ADDRESSES = 10

export function AddWalletForm({ isOpen, onClose, onAdd }) {
  const [label, setLabel] = useState('')
  const [firstAddr, setFirstAddr] = useState('')
  const [extraAddresses, setExtraAddresses] = useState([])
  const [newAddr, setNewAddr] = useState('')
  const [newAddrError, setNewAddrError] = useState('')

  const firstTrimmed  = firstAddr.trim()
  const firstDetected = detectInput(firstTrimmed)   // { chain, type } | null
  const firstChain    = firstDetected?.chain ?? null
  const firstIsXpub   = firstDetected?.type === 'xpub'
  const allAddedAddrs = firstChain && !firstIsXpub ? [firstTrimmed, ...extraAddresses] : [...extraAddresses]

  // Group all addresses by chain, preserving insertion order
  function buildEntries(extra = extraAddresses) {
    if (!firstChain) return []
    if (firstIsXpub) {
      // xPub entry for first chain, then any address entries for other chains
      const map = new Map()
      for (const addr of extra) {
        const detected = detectInput(addr)
        if (!detected || detected.type !== 'address') continue
        if (!map.has(detected.chain)) map.set(detected.chain, [])
        map.get(detected.chain).push(addr)
      }
      return [
        { chain: firstChain, type: 'xpub', xpub: firstTrimmed },
        ...[...map.entries()].map(([chain, addresses]) => ({ chain, type: 'address', addresses })),
      ]
    }
    // Original address logic
    const map = new Map()
    map.set(firstChain, [firstTrimmed])
    for (const addr of extra) {
      const detected = detectInput(addr)
      if (!detected || detected.type !== 'address') continue
      if (!map.has(detected.chain)) map.set(detected.chain, [])
      map.get(detected.chain).push(addr)
    }
    return [...map.entries()].map(([chain, addresses]) => ({ chain, type: 'address', addresses }))
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
    const detected = detectInput(trimmed)
    if (!detected) { setNewAddrError('Unknown format — please enter a valid address or xPub key'); return }
    if (detected.type === 'xpub') { setNewAddrError('Only one xPub per chain supported — use a separate wallet'); return }
    if (allAddedAddrs.includes(trimmed)) { setNewAddrError('Address already added'); return }
    // Prevent adding an address for the same chain as an xPub entry
    if (firstIsXpub && detected.chain === firstChain) {
      setNewAddrError(`${detected.chain.toUpperCase()} already tracked via xPub`)
      return
    }
    const chainCount = allAddedAddrs.filter(a => detectInput(a)?.chain === detected.chain).length
    if (chainCount >= MAX_ADDRESSES) {
      setNewAddrError(`Max ${MAX_ADDRESSES} addresses for ${detected.chain.toUpperCase()}`)
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
              label="Address or xPub key"
              type="text"
              value={firstAddr}
              onChange={e => { setFirstAddr(e.target.value); setExtraAddresses([]); setNewAddrError('') }}
              required
              className="font-mono"
              iconRight={
                firstAddr.length > 0 ? (
                  firstDetected
                    ? <span className="text-success text-xs font-semibold">
                        {firstIsXpub ? `${firstChain?.toUpperCase()} xPub` : CHAIN_LABELS[firstChain]}
                      </span>
                    : <span className="text-danger text-xs font-semibold">Unknown</span>
                ) : null
              }
            />
            <p className="text-caption text-text-subtle mt-1">
              Enter a wallet address or xPub key.{' '}
              <HelpLink articleKey="xpub-explained">Learn more about xPub</HelpLink>
              {' · '}
              <HelpLink articleKey="add-wallet">How to add a wallet</HelpLink>
            </p>

            {/* Added addresses grouped by chain */}
            {firstChain && extraAddresses.length > 0 && (
              <div className="stack stack-sm">
                {allEntries.filter(e => e.type === 'address').map(({ chain, addresses }) => (
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
                            ><X size={14} /></button>
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
