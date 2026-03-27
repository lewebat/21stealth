import { useState, useEffect } from 'react'
import { X, Info } from 'lucide-react'
import { Modal } from './Modal'
import { FloatInput } from './Form'
import Button from './Button'
import { detectInput } from '@utils/detectInput'

const CHAIN_LABELS = { eth: 'Ethereum', btc: 'Bitcoin', sol: 'Solana', ltc: 'Litecoin', doge: 'Dogecoin', trx: 'Tron' }
const CHAIN_BADGE = {
  eth: 'bg-primary text-text-inverted', btc: 'bg-accent text-text-inverted',
  sol: 'bg-info text-text-inverted',    ltc: 'bg-info text-text-inverted',
  doge: 'bg-warning text-text-inverted', trx: 'bg-danger text-text-inverted',
}
const MAX_ADDRESSES = 10

export function EditWalletModal({ wallet, isOpen, onClose, onSave }) {
  const [label, setLabel] = useState('')
  const [entries, setEntries] = useState([])       // [{chain, addresses}]
  const [entryInputs, setEntryInputs] = useState({}) // {chain: {value, error}}
  const [newChainAddr, setNewChainAddr] = useState('')
  const [newChainError, setNewChainError] = useState('')

  useEffect(() => {
    if (isOpen && wallet) {
      setLabel(wallet.label)
      setEntries(wallet.entries.map(e =>
        e.type === 'xpub'
          ? { chain: e.chain, type: 'xpub', xpub: e.xpub }
          : { chain: e.chain, type: 'address', addresses: [...e.addresses] }
      ))
      setEntryInputs({})
      setNewChainAddr('')
      setNewChainError('')
    }
  }, [isOpen, wallet?.id])

  const usedChains = new Set(entries.map(e => e.chain))

  function setEntryInput(chain, value) {
    setEntryInputs(prev => ({ ...prev, [chain]: { value, error: '' } }))
  }

  function setEntryError(chain, error) {
    setEntryInputs(prev => ({ ...prev, [chain]: { ...prev[chain], error } }))
  }

  function handleAddAddress(chain) {
    const value = entryInputs[chain]?.value?.trim() ?? ''
    if (!value) return
    const entry = entries.find(e => e.chain === chain)
    if (!entry) return
    if (entry.addresses.includes(value)) { setEntryError(chain, 'Address already added'); return }
    const detected = detectInput(value)
    if (!detected || detected.chain !== chain) {
      setEntryError(chain, `Invalid address (expected: ${chain.toUpperCase()})`)
      return
    }
    setEntries(prev => prev.map(e => e.chain === chain ? { ...e, addresses: [...e.addresses, value] } : e))
    setEntryInput(chain, '')
  }

  function handleRemoveAddress(chain, addr) {
    const entry = entries.find(e => e.chain === chain)
    if (!entry || entry.addresses.length <= 1) return
    setEntries(prev => prev.map(e => e.chain === chain ? { ...e, addresses: e.addresses.filter(a => a !== addr) } : e))
  }

  function handleRemoveChainEntry(chain) {
    if (entries.length <= 1) return
    setEntries(prev => prev.filter(e => e.chain !== chain))
  }

  function handleAddChainEntry() {
    const trimmed = newChainAddr.trim()
    if (!trimmed) return
    const detected = detectInput(trimmed)
    if (!detected) { setNewChainError('Unknown format — please enter a valid address or xPub key'); return }
    if (usedChains.has(detected.chain)) {
      setNewChainError(`${CHAIN_LABELS[detected.chain] ?? detected.chain} already exists`)
      return
    }
    if (detected.type === 'xpub') {
      setEntries(prev => [...prev, { chain: detected.chain, type: 'xpub', xpub: trimmed }])
    } else {
      setEntries(prev => [...prev, { chain: detected.chain, type: 'address', addresses: [trimmed] }])
    }
    setNewChainAddr('')
    setNewChainError('')
  }

  function handleSave() {
    const firstEntry = entries[0]
    const fallbackLabel = firstEntry ? (CHAIN_LABELS[firstEntry.chain] ?? 'Wallet') : 'Wallet'
    onSave(wallet.id, { label: label.trim() || fallbackLabel, entries })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit wallet" size="md">
      <Modal.Body>
        <div className="stack stack-md">

          <FloatInput
            id="edit-label"
            label="Label"
            type="text"
            value={label}
            onChange={e => setLabel(e.target.value)}
          />

          {/* Per-chain entry sections */}
          {entries.map(entry => {
            const { chain } = entry
            if (entry.type === 'xpub') {
              return (
                <div key={chain} className="chain-entry">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`chain-badge ${CHAIN_BADGE[chain]}`}>{chain.toUpperCase()}</span>
                      <span className="font-mono text-caption text-text-muted">
                        {entry.xpub.slice(0, 10)}••••••
                      </span>
                      <span className="text-label text-text-subtle">xPub</span>
                    </div>
                    {entries.length > 1 && (
                      <button type="button" className="btn-icon text-danger"
                        onClick={() => handleRemoveChainEntry(chain)}>
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
              )
            }
            const { addresses } = entry
            const input = entryInputs[chain] ?? { value: '', error: '' }
            const atMax = addresses.length >= MAX_ADDRESSES
            return (
              <div key={chain} className="chain-entry">
                <div className="chain-entry-header">
                  <div className="flex items-center gap-2">
                    <span className={`chain-badge ${CHAIN_BADGE[chain]}`}>
                      {chain.toUpperCase()}
                    </span>
                    <span className="text-caption text-text-muted">{CHAIN_LABELS[chain]}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveChainEntry(chain)}
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
                        disabled={addresses.length <= 1}
                        className="btn-icon text-danger disabled:opacity-30"
                        title="Remove"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {!atMax ? (
                    <div>
                      <div className="flex gap-2">
                        <FloatInput
                          label={`New ${chain.toUpperCase()} address`}
                          type="text"
                          value={input.value}
                          onChange={e => setEntryInput(chain, e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddAddress(chain) } }}
                          className="font-mono flex-1"
                        />
                        <Button type="button" variant="secondary" onClick={() => handleAddAddress(chain)}>+</Button>
                      </div>
                      {input.error && <p className="form-error mt-1">{input.error}</p>}
                    </div>
                  ) : (
                    <p className="text-caption text-text-muted">Maximum of {MAX_ADDRESSES} addresses reached</p>
                  )}
                </div>
              </div>
            )
          })}

          {/* Add new chain entry */}
          <div>
            <div className="flex gap-2 w-full">
              <FloatInput
                label="Add another chain — address or xPub auto-detected"
                type="text"
                value={newChainAddr}
                onChange={e => { setNewChainAddr(e.target.value); setNewChainError('') }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddChainEntry() } }}
                className="font-mono flex-1"
              />
              <Button type="button" variant="secondary" onClick={handleAddChainEntry} className="ml-auto">+</Button>
            </div>
            {newChainError && <p className="form-error mt-1">{newChainError}</p>}
            <p className="flex items-center gap-1.5 text-caption text-text-subtle mt-1">
              <Info size={12} className="shrink-0" />
              Enter a wallet address or xPub key. Supported: BTC, ETH, SOL, LTC, DOGE, TRX — chain is detected automatically.
            </p>
          </div>

        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
        <Button type="button" variant="primary" onClick={handleSave}>Save</Button>
      </Modal.Footer>
    </Modal>
  )
}
