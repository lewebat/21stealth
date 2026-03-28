import { useState } from 'react'
import { X } from 'lucide-react'
import { detectInput } from '@utils/detectInput'
import { FloatInput } from './Form'
import Button from './Button'
import { Modal } from './Modal'
import { HelpLink } from '@ui'
import { CHAIN_LABELS, CHAIN_BADGE } from '@utils/chains'

const MAX_ADDRESSES = 10

function buildEntries(addresses) {
  const map = new Map()
  for (const addr of addresses) {
    const detected = detectInput(addr)
    if (!detected) continue
    if (detected.type === 'xpub') {
      map.set(detected.chain, { chain: detected.chain, type: 'xpub', xpub: addr })
    } else {
      if (!map.has(detected.chain)) map.set(detected.chain, { chain: detected.chain, type: 'address', addresses: [] })
      const entry = map.get(detected.chain)
      if (entry.type === 'address') entry.addresses.push(addr)
    }
  }
  return [...map.values()]
}

export function AddWalletForm({ isOpen, onClose, onAdd }) {
  const [label, setLabel] = useState('')
  const [addresses, setAddresses] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [inputError, setInputError] = useState('')

  function reset() {
    setLabel(''); setAddresses([]); setInputValue(''); setInputError('')
  }

  function handleClose() { reset(); onClose() }

  function handleAdd() {
    const trimmed = inputValue.trim()
    if (!trimmed) return
    const detected = detectInput(trimmed)
    if (!detected) { setInputError('Unknown format — please enter a valid address or xPub key'); return }
    const currentEntries = buildEntries(addresses)
    const existingEntry = currentEntries.find(e => e.chain === detected.chain)
    if (detected.type === 'xpub') {
      if (existingEntry) { setInputError('Only one xPub per chain supported — use a separate wallet'); return }
    } else {
      if (existingEntry?.type === 'xpub') { setInputError(`${detected.chain.toUpperCase()} already tracked via xPub`); return }
      if (addresses.includes(trimmed)) { setInputError('Address already added'); return }
      const chainAddrs = addresses.filter(a => detectInput(a)?.chain === detected.chain)
      if (chainAddrs.length >= MAX_ADDRESSES) { setInputError(`Max ${MAX_ADDRESSES} addresses for ${detected.chain.toUpperCase()}`); return }
    }
    setAddresses(prev => [...prev, trimmed])
    setInputValue('')
    setInputError('')
    document.getElementById('wallet-address')?.focus()
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (addresses.length === 0) return
    const entries = buildEntries(addresses)
    onAdd(label.trim() || CHAIN_LABELS[entries[0]?.chain] || 'Wallet', entries)
    reset()
    onClose()
  }

  const allEntries = buildEntries(addresses)
  const detected = detectInput(inputValue.trim())
  const inputFeedback = inputValue.length > 0
    ? detected
      ? <span className="text-success text-xs font-semibold">
          {detected.type === 'xpub' ? `${detected.chain?.toUpperCase()} xPub` : CHAIN_LABELS[detected.chain]}
        </span>
      : <span className="text-danger text-xs font-semibold">Unknown</span>
    : null

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

            <div>
              <div className="flex gap-2">
                <FloatInput
                  id="wallet-address"
                  label="Enter address or xPub key"
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
                {' · '}
                <HelpLink articleKey="add-wallet">How to add a wallet</HelpLink>
              </p>
            </div>

            {addresses.length > 0 && (
              <div className="stack stack-sm">
                {allEntries.map(entry => (
                  <div key={entry.chain}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`chain-badge ${CHAIN_BADGE[entry.chain]}`}>{entry.chain.toUpperCase()}</span>
                      <span className="text-caption text-text-muted">{CHAIN_LABELS[entry.chain]}</span>
                    </div>
                    {entry.type === 'xpub' ? (
                      <div className="flex items-center gap-2">
                        <span className="flex-1 font-mono text-caption text-text-muted truncate">{entry.xpub.slice(0, 10)}••••••</span>
                        <span className="text-label text-text-subtle">xPub</span>
                        <button type="button" className="btn-icon text-danger"
                          onClick={() => setAddresses(prev => prev.filter(a => a !== entry.xpub))}
                        ><X size={14} /></button>
                      </div>
                    ) : (
                      <div className="stack stack-xs">
                        {entry.addresses.map((addr) => (
                          <div key={addr} className="flex items-center gap-2">
                            <span className="flex-1 font-mono text-caption text-text-muted truncate">{addr}</span>
                            <button type="button" className="btn-icon text-danger"
                              onClick={() => setAddresses(prev => prev.filter(a => a !== addr))}
                            ><X size={14} /></button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" type="button" onClick={handleClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={addresses.length === 0}>
            {allEntries.length > 1
              ? `Add wallet (${allEntries.length} chains)`
              : 'Add wallet'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  )
}
