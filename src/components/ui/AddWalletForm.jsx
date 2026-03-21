import { useState } from 'react'
import { detectChain } from '@utils/detectChain'
import { FormGroup, Input } from './Form'
import Button from './Button'

const CHAIN_LABELS = { eth: 'Ethereum', btc: 'Bitcoin', sol: 'Solana', ltc: 'Litecoin', doge: 'Dogecoin', trx: 'Tron' }

export function AddWalletForm({ onAdd }) {
  const [label, setLabel] = useState('')
  const [address, setAddress] = useState('')
  const [open, setOpen] = useState(false)

  const detected = detectChain(address)

  function handleSubmit(e) {
    e.preventDefault()
    if (!address.trim() || !detected) return
    onAdd(label.trim() || CHAIN_LABELS[detected], detected, address.trim())
    setLabel('')
    setAddress('')
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="btn-secondary btn-full"
        style={{ borderStyle: 'dashed' }}
      >
        + Add wallet
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="card">
      <div className="card-header">
        <span className="h5">Add wallet</span>
        <button type="button" className="btn-link text-text-muted" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
      <div className="card-body stack stack-md">
        <FormGroup label="Label (optional)" htmlFor="wallet-label">
          <Input id="wallet-label" type="text" placeholder="e.g. My BTC" value={label} onChange={(e) => setLabel(e.target.value)} />
        </FormGroup>

        <FormGroup label="Wallet address" htmlFor="wallet-address" required>
          <div className="input-wrapper">
            <Input
              id="wallet-address"
              type="text"
              placeholder="Enter address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              className="font-mono"
              iconRight={
                address.length > 0 ? (
                  detected
                    ? <span className="text-success text-xs font-semibold">{CHAIN_LABELS[detected]}</span>
                    : <span className="text-danger text-xs font-semibold">Unknown</span>
                ) : null
              }
            />
          </div>
        </FormGroup>

        <Button type="submit" variant="primary" fullWidth disabled={!detected}>
          {detected ? `Add ${CHAIN_LABELS[detected]} wallet` : 'Add wallet'}
        </Button>
      </div>
    </form>
  )
}
