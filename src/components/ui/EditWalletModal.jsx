import { useState, useEffect } from 'react'
import { Modal } from './Modal'
import { Input, FormGroup } from './Form'
import Button from './Button'
import { detectChain } from '@utils/detectChain'

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
      setEntries(wallet.entries.map(e => ({ ...e, addresses: [...e.addresses] })))
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
    if (entry.addresses.includes(value)) { setEntryError(chain, 'Adresse bereits vorhanden'); return }
    const detected = detectChain(value)
    if (!detected || detected !== chain) {
      setEntryError(chain, `Ungültige Adresse (erwartet: ${chain.toUpperCase()})`)
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
    const detected = detectChain(trimmed)
    if (!detected) { setNewChainError('Unbekannte Adresse'); return }
    if (usedChains.has(detected)) {
      setNewChainError(`${CHAIN_LABELS[detected] ?? detected} bereits vorhanden`)
      return
    }
    setEntries(prev => [...prev, { chain: detected, addresses: [trimmed] }])
    setNewChainAddr('')
    setNewChainError('')
  }

  function handleSave() {
    const firstEntry = entries[0]
    const fallbackLabel = firstEntry ? (CHAIN_LABELS[firstEntry.chain] ?? 'Wallet') : 'Wallet'
    onSave(wallet.id, { label: label.trim() || fallbackLabel, entries })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Wallet bearbeiten" size="md">
      <Modal.Body>
        <div className="stack stack-md">

          <FormGroup label="Label" htmlFor="edit-label">
            <Input
              id="edit-label"
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="Wallet Label"
            />
          </FormGroup>

          {/* Per-chain entry sections */}
          {entries.map(({ chain, addresses }) => {
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
                    Chain entfernen
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
                        title="Entfernen"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {!atMax ? (
                    <div>
                      <div className="flex gap-2">
                        <Input
                          type="text"
                          placeholder={`Neue ${chain.toUpperCase()} Adresse…`}
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
                    <p className="text-caption text-text-muted">Maximum von {MAX_ADDRESSES} Adressen erreicht</p>
                  )}
                </div>
              </div>
            )
          })}

          {/* Add new chain entry */}
          <div>
            <div className="form-label mb-2">Weitere Chain hinzufügen</div>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Adresse eingeben — Chain wird erkannt…"
                value={newChainAddr}
                onChange={e => { setNewChainAddr(e.target.value); setNewChainError('') }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddChainEntry() } }}
                className="font-mono flex-1"
              />
              <Button type="button" variant="secondary" onClick={handleAddChainEntry}>+</Button>
            </div>
            {newChainError && <p className="form-error mt-1">{newChainError}</p>}
          </div>

        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button type="button" variant="secondary" onClick={onClose}>Abbrechen</Button>
        <Button type="button" variant="primary" onClick={handleSave}>Speichern</Button>
      </Modal.Footer>
    </Modal>
  )
}
