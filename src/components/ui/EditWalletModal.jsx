import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { Modal } from './Modal'
import { FloatInput } from './Form'
import Button from './Button'
import { detectInput } from '@utils/detectInput'
import { HelpLink } from '@ui'
import { CHAIN_LABELS, CHAIN_BADGE } from '@utils/chains'

const MAX_ADDRESSES = 10

export function EditWalletModal({ wallet, isOpen, onClose, onSave }) {
  const [label, setLabel] = useState('')
  const [entries, setEntries] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [inputError, setInputError] = useState('')

  useEffect(() => {
    if (isOpen && wallet) {
      setLabel(wallet.label)
      setEntries(wallet.entries.map(e =>
        e.type === 'xpub'
          ? { chain: e.chain, type: 'xpub', xpub: e.xpub }
          : { chain: e.chain, type: 'address', addresses: [...e.addresses] }
      ))
      setInputValue('')
      setInputError('')
    }
  }, [isOpen, wallet?.id])

  function handleAdd() {
    const trimmed = inputValue.trim()
    if (!trimmed) return
    const detected = detectInput(trimmed)
    if (!detected) { setInputError('Unknown format — please enter a valid address or xPub key'); return }

    const existingEntry = entries.find(e => e.chain === detected.chain)

    if (detected.type === 'xpub') {
      if (existingEntry) { setInputError('Only one xPub per chain supported — use a separate wallet'); return }
      setEntries(prev => [...prev, { chain: detected.chain, type: 'xpub', xpub: trimmed }])
    } else {
      if (existingEntry?.type === 'xpub') { setInputError(`${detected.chain.toUpperCase()} already tracked via xPub`); return }
      if (existingEntry?.type === 'address') {
        if (existingEntry.addresses.includes(trimmed)) { setInputError('Address already added'); return }
        if (existingEntry.addresses.length >= MAX_ADDRESSES) { setInputError(`Max ${MAX_ADDRESSES} addresses for ${detected.chain.toUpperCase()}`); return }
        setEntries(prev => prev.map(e => e.chain === detected.chain ? { ...e, addresses: [...e.addresses, trimmed] } : e))
      } else {
        setEntries(prev => [...prev, { chain: detected.chain, type: 'address', addresses: [trimmed] }])
      }
    }
    setInputValue('')
    setInputError('')
    document.getElementById('edit-new-entry')?.focus()
  }

  function handleRemoveAddress(chain, addr) {
    const entry = entries.find(e => e.chain === chain)
    if (!entry || entry.addresses.length === 1) return
    setEntries(prev => prev.map(e => e.chain === chain ? { ...e, addresses: e.addresses.filter(a => a !== addr) } : e))
  }

  function handleRemoveChainEntry(chain) {
    if (entries.length <= 1) return
    setEntries(prev => prev.filter(e => e.chain !== chain))
  }

  function handleSave() {
    const firstEntry = entries[0]
    const fallbackLabel = firstEntry ? (CHAIN_LABELS[firstEntry.chain] ?? 'Wallet') : 'Wallet'
    onSave(wallet.id, { label: label.trim() || fallbackLabel, entries })
  }

  const detected = detectInput(inputValue.trim())
  const inputFeedback = inputValue.length > 0
    ? detected
      ? <span className="text-label text-success">
          {detected.type === 'xpub' ? `${detected.chain?.toUpperCase()} xPub` : CHAIN_LABELS[detected.chain]}
        </span>
      : <span className="text-label text-danger">Unknown</span>
    : null

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
            return (
              <div key={chain} className="chain-entry">
                <div className="chain-entry-header">
                  <div className="flex items-center gap-2">
                    <span className={`chain-badge ${CHAIN_BADGE[chain]}`}>{chain.toUpperCase()}</span>
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
                    <div key={addr} className="flex items-center gap-2">
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
                </div>
              </div>
            )
          })}

          <div>
            <div className="flex gap-2 w-full">
              <FloatInput
                id="edit-new-entry"
                label="Add another address or xPub"
                type="text"
                value={inputValue}
                onChange={e => { setInputValue(e.target.value); setInputError('') }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAdd() } }}
                className="font-mono flex-1"
                iconRight={inputFeedback}
              />
              <Button type="button" variant="secondary" onClick={handleAdd}>+</Button>
            </div>
            {inputError && <p className="form-error mt-1">{inputError}</p>}
            <p className="text-caption text-text-subtle mt-1">
              Enter a wallet address or xPub key.{' '}
              <HelpLink articleKey="xpub-explained">Learn more about xPub</HelpLink>
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
