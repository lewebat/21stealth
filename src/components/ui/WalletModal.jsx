import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Modal } from './Modal'
import { FloatInput } from './Form'
import Button from './Button'
import { detectChain } from '@utils/detectChain'

const CHAIN_LABELS = { eth: 'Ethereum', btc: 'Bitcoin', sol: 'Solana', ltc: 'Litecoin', doge: 'Dogecoin', trx: 'Tron' }
const CHAIN_BADGE = {
  eth: 'bg-primary text-text-inverted', btc: 'bg-accent text-text-inverted',
  sol: 'bg-info text-text-inverted',    ltc: 'bg-info text-text-inverted',
  doge: 'bg-warning text-text-inverted', trx: 'bg-danger text-text-inverted',
}
const MAX_ADDRESSES = 10

export function WalletModal({ isOpen, onClose, wallet, onSave }) {
  const isEdit = !!wallet

  const [label, setLabel] = useState('')
  const [entries, setEntries] = useState([]) // [{ chain, addresses }]
  const [newAddr, setNewAddr] = useState('')
  const [newAddrError, setNewAddrError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setLabel(isEdit ? wallet.label : '')
      setEntries(isEdit ? wallet.entries.map(e =>
        e.type === 'xpub'
          ? { chain: e.chain, type: 'xpub', xpub: e.xpub }
          : { ...e, addresses: [...(e.addresses ?? [])] }
      ) : [])
      setNewAddr('')
      setNewAddrError('')
    }
  }, [isOpen, wallet?.id])

  const allAddedAddrs = entries.flatMap(e => e.addresses)
  const newAddrChain = detectChain(newAddr.trim())

  function handleAddAddr() {
    const trimmed = newAddr.trim()
    if (!trimmed) return
    const chain = detectChain(trimmed)
    if (!chain) { setNewAddrError('Unknown address'); return }
    if (allAddedAddrs.includes(trimmed)) { setNewAddrError('Address already added'); return }
    const existing = entries.find(e => e.chain === chain)
    if (existing && existing.addresses.length >= MAX_ADDRESSES) {
      setNewAddrError(`Max ${MAX_ADDRESSES} addresses reached for ${chain.toUpperCase()}`)
      return
    }
    if (existing) {
      setEntries(prev => prev.map(e => e.chain === chain ? { ...e, addresses: [...e.addresses, trimmed] } : e))
    } else {
      setEntries(prev => [...prev, { chain, addresses: [trimmed] }])
    }
    setNewAddr('')
    setNewAddrError('')
  }

  function handleRemoveAddress(chain, addr) {
    setEntries(prev => {
      const entry = prev.find(e => e.chain === chain)
      if (!entry) return prev
      const next = entry.addresses.filter(a => a !== addr)
      if (next.length === 0) return prev.filter(e => e.chain !== chain)
      return prev.map(e => e.chain === chain ? { ...e, addresses: next } : e)
    })
  }

  function handleSave() {
    if (entries.length === 0) return
    const fallbackLabel = CHAIN_LABELS[entries[0].chain] ?? 'Wallet'
    onSave(wallet?.id ?? null, { label: label.trim() || fallbackLabel, entries })
  }

  const canSave = entries.length > 0

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEdit ? 'Edit wallet' : 'Add wallet'} size="md">
      <Modal.Body>
        <div className="stack stack-md">

          <FloatInput
            id="wallet-label"
            label="Label (optional)"
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
            autoFocus={!isEdit}
          />

          {/* Per-chain address sections */}
          {entries.map(({ chain, addresses }) => (
            <div key={chain} className="chain-entry">
              <div className="chain-entry-header">
                <div className="flex items-center gap-2">
                  <span className={`chain-badge ${CHAIN_BADGE[chain]}`}>{chain.toUpperCase()}</span>
                  <span className="text-caption text-text-muted">{CHAIN_LABELS[chain] ?? chain}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setEntries(prev => prev.filter(e => e.chain !== chain))}
                  disabled={entries.length <= 1}
                  className="text-caption text-danger disabled:opacity-30 hover:underline"
                >
                  Remove chain
                </button>
              </div>
              <div className="chain-entry-body stack stack-sm">
                {addresses.map((addr, i) => (
                  <div key={`${addr}-${i}`} className="flex items-center gap-2">
                    <span className="flex-1 font-mono text-caption text-text-muted truncate">{addr}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveAddress(chain, addr)}
                      disabled={addresses.length <= 1 && entries.length <= 1}
                      className="btn-icon text-danger disabled:opacity-30"
                      title="Remove"
                    ><X size={14} /></button>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Unified input — auto-routes by chain detection */}
          <div>
            <div className="flex gap-2">
              <div className="flex-1 min-w-0">
                <FloatInput
                  label={entries.length === 0 ? 'Wallet address — chain auto-detected' : 'Add another address or chain'}
                  type="text"
                  value={newAddr}
                  onChange={e => { setNewAddr(e.target.value); setNewAddrError('') }}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddAddr() } }}
                  className="font-mono"
                  iconRight={
                    newAddr.length > 0 ? (
                      newAddrChain
                        ? <span className="text-success text-xs font-semibold">{CHAIN_LABELS[newAddrChain]}</span>
                        : <span className="text-danger text-xs font-semibold">Unknown</span>
                    ) : null
                  }
                />
              </div>
              <Button type="button" variant="secondary" onClick={handleAddAddr}>+</Button>
            </div>
            {newAddrError && <p className="form-error mt-1">{newAddrError}</p>}
          </div>

        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="button" variant="primary" disabled={!canSave} onClick={handleSave}>
          {isEdit ? 'Save' : canSave
            ? `Add wallet (${entries.length} chain${entries.length > 1 ? 's' : ''})`
            : 'Add wallet'}
        </Button>
      </Modal.Footer>
    </Modal>
  )
}
