import { useState, useEffect } from 'react'
import { Modal } from './Modal'
import { Input, FormGroup } from './Form'
import Button from './Button'
import { detectChain } from '@utils/detectChain'

const CHAIN_LABELS = { eth: 'Ethereum', btc: 'Bitcoin', sol: 'Solana', ltc: 'Litecoin', doge: 'Dogecoin', trx: 'Tron' }
const MAX_ADDRESSES = 10

export function EditWalletModal({ wallet, isOpen, onClose, onSave }) {
  const [label, setLabel] = useState('')
  const [addresses, setAddresses] = useState([])
  const [newAddr, setNewAddr] = useState('')
  const [addrError, setAddrError] = useState('')

  // Sync state from wallet prop whenever modal opens
  useEffect(() => {
    if (isOpen && wallet) {
      setLabel(wallet.label)
      setAddresses(wallet.addresses)
      setNewAddr('')
      setAddrError('')
    }
  }, [isOpen, wallet])

  function handleAddAddress() {
    const trimmed = newAddr.trim()
    if (!trimmed) return
    if (addresses.includes(trimmed)) {
      setAddrError('Adresse bereits vorhanden')
      return
    }
    const detected = detectChain(trimmed)
    if (!detected || detected !== wallet.chain) {
      setAddrError(`Ungültige Adresse oder falsche Chain (erwartet: ${wallet.chain.toUpperCase()})`)
      return
    }
    setAddresses(prev => [...prev, trimmed])
    setNewAddr('')
    setAddrError('')
  }

  function handleRemoveAddress(addr) {
    if (addresses.length <= 1) return
    setAddresses(prev => prev.filter(a => a !== addr))
  }

  function handleSave() {
    onSave(wallet.id, { label: label.trim() || CHAIN_LABELS[wallet.chain], addresses })
    // onSave handler in DashboardPage calls setEditingWallet(null) which closes the modal
    // do NOT call onClose() here to avoid double state update
  }

  const atMax = addresses.length >= MAX_ADDRESSES

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Wallet bearbeiten"
      size="md"
    >
      <Modal.Body>
        <div className="stack stack-md">
          <FormGroup label="Label" htmlFor="edit-label">
            <Input
              id="edit-label"
              type="text"
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder={CHAIN_LABELS[wallet?.chain] ?? ''}
            />
          </FormGroup>

          <div>
            <div className="form-label mb-2">
              Adressen ({wallet?.chain?.toUpperCase()})
            </div>
            <div className="stack stack-sm">
              {addresses.map(addr => (
                <div key={addr} className="flex items-center gap-2">
                  <span className="flex-1 font-mono text-caption text-text-muted truncate">{addr}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAddress(addr)}
                    disabled={addresses.length <= 1}
                    className="btn-icon text-danger disabled:opacity-30"
                    title="Entfernen"
                  >
                    ✕
                  </button>
                </div>
              ))}

              {!atMax && (
                <div>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Neue Adresse hinzufügen…"
                      value={newAddr}
                      onChange={e => { setNewAddr(e.target.value); setAddrError('') }}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddAddress() } }}
                      className="font-mono flex-1"
                    />
                    <Button type="button" variant="secondary" onClick={handleAddAddress}>+</Button>
                  </div>
                  {addrError && <p className="form-error mt-1">{addrError}</p>}
                </div>
              )}
              {atMax && (
                <p className="text-caption text-text-muted">Maximum von {MAX_ADDRESSES} Adressen erreicht</p>
              )}
            </div>
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
