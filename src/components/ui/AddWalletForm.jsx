import { useState } from 'react'
import { detectChain } from '@utils/detectChain'
import { FormGroup, Input } from './Form'
import Button from './Button'

const CHAIN_LABELS = { eth: 'Ethereum', btc: 'Bitcoin', sol: 'Solana', ltc: 'Litecoin', doge: 'Dogecoin', trx: 'Tron' }
const MAX_ADDRESSES = 10

export function AddWalletForm({ onAdd }) {
  const [label, setLabel] = useState('')
  const [addresses, setAddresses] = useState([]) // confirmed extra addresses
  const [firstAddr, setFirstAddr] = useState('')  // the primary input
  const [newAddr, setNewAddr] = useState('')       // extra address input
  const [addrError, setAddrError] = useState('')
  const [open, setOpen] = useState(false)

  const detectedChain = detectChain(firstAddr)
  const allAddresses = detectedChain ? [firstAddr.trim(), ...addresses] : addresses

  function handleAddExtra() {
    const trimmed = newAddr.trim()
    if (!trimmed) return
    if (allAddresses.includes(trimmed)) {
      setAddrError('Adresse bereits vorhanden')
      return
    }
    const detected = detectChain(trimmed)
    if (!detected || detected !== detectedChain) {
      setAddrError(`Ungültige Adresse oder falsche Chain (erwartet: ${detectedChain?.toUpperCase()})`)
      return
    }
    setAddresses(prev => [...prev, trimmed])
    setNewAddr('')
    setAddrError('')
  }

  function handleRemoveExtra(addr) {
    setAddresses(prev => prev.filter(a => a !== addr))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!firstAddr.trim() || !detectedChain) return
    onAdd(label.trim() || CHAIN_LABELS[detectedChain], detectedChain, allAddresses)
    setLabel('')
    setFirstAddr('')
    setAddresses([])
    setNewAddr('')
    setAddrError('')
    setOpen(false)
  }

  function handleClose() {
    setOpen(false)
    setLabel('')
    setFirstAddr('')
    setAddresses([])
    setNewAddr('')
    setAddrError('')
  }

  const atMax = allAddresses.length >= MAX_ADDRESSES

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-secondary btn-full" style={{ borderStyle: 'dashed' }}>
        + Add wallet
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <div className="card-header">
        <span className="h5">Add wallet</span>
        <button type="button" className="btn-link text-text-muted" onClick={handleClose}>Cancel</button>
      </div>
      <div className="card-body stack stack-md">
        <FormGroup label="Label (optional)" htmlFor="wallet-label">
          <Input
            id="wallet-label"
            type="text"
            placeholder="e.g. Cold Storage"
            value={label}
            onChange={e => setLabel(e.target.value)}
          />
        </FormGroup>

        <FormGroup label="Wallet address" htmlFor="wallet-address" required>
          <Input
            id="wallet-address"
            type="text"
            placeholder="Enter address"
            value={firstAddr}
            onChange={e => { setFirstAddr(e.target.value); setAddresses([]); setAddrError('') }}
            required
            className="font-mono"
            iconRight={
              firstAddr.length > 0 ? (
                detectedChain
                  ? <span className="text-success text-xs font-semibold">{CHAIN_LABELS[detectedChain]}</span>
                  : <span className="text-danger text-xs font-semibold">Unknown</span>
              ) : null
            }
          />
        </FormGroup>

        {detectedChain && (
          <div>
            <div className="form-label mb-2">Extra addresses (same chain, optional)</div>
            <div className="stack stack-sm">
              {addresses.map(addr => (
                <div key={addr} className="flex items-center gap-2">
                  <span className="flex-1 font-mono text-caption text-text-muted truncate">{addr}</span>
                  <button type="button" onClick={() => handleRemoveExtra(addr)} className="btn-icon text-danger">✕</button>
                </div>
              ))}
              {!atMax && (
                <div>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder={`Additional ${detectedChain.toUpperCase()} address…`}
                      value={newAddr}
                      onChange={e => { setNewAddr(e.target.value); setAddrError('') }}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddExtra() } }}
                      className="font-mono flex-1"
                    />
                    <Button type="button" variant="secondary" onClick={handleAddExtra}>+</Button>
                  </div>
                  {addrError && <p className="form-error mt-1">{addrError}</p>}
                </div>
              )}
            </div>
          </div>
        )}
        {atMax && detectedChain && (
          <p className="text-caption text-text-muted">Maximum von {MAX_ADDRESSES} Adressen erreicht</p>
        )}

        <Button type="submit" variant="primary" fullWidth disabled={!detectedChain}>
          {detectedChain ? `Add ${CHAIN_LABELS[detectedChain]} wallet` : 'Add wallet'}
        </Button>
      </div>
    </form>
  )
}
