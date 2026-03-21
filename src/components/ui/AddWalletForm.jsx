import { useState } from 'react'
import { detectChain } from '@utils/detectChain'
import { FormGroup, Input } from './Form'
import Button from './Button'

const CHAIN_LABELS = { eth: 'Ethereum', btc: 'Bitcoin', sol: 'Solana', ltc: 'Litecoin', doge: 'Dogecoin', trx: 'Tron' }
const CHAIN_BADGE = {
  eth: 'bg-primary text-text-inverted', btc: 'bg-accent text-text-inverted',
  sol: 'bg-info text-text-inverted',    ltc: 'bg-info text-text-inverted',
  doge: 'bg-warning text-text-inverted', trx: 'bg-danger text-text-inverted',
}
const MAX_ADDRESSES = 10

export function AddWalletForm({ onAdd }) {
  const [label, setLabel] = useState('')
  const [firstAddr, setFirstAddr] = useState('')
  const [sameChainAddrs, setSameChainAddrs] = useState([])  // extra addrs same chain as firstAddr
  const [extraEntries, setExtraEntries] = useState([])       // [{chain, addresses}] additional chains
  const [newSameAddr, setNewSameAddr] = useState('')
  const [newSameError, setNewSameError] = useState('')
  const [newChainAddr, setNewChainAddr] = useState('')
  const [newChainError, setNewChainError] = useState('')
  const [open, setOpen] = useState(false)

  const firstAddrTrimmed = firstAddr.trim()
  const detectedChain = detectChain(firstAddrTrimmed)
  const firstEntryAddrs = detectedChain ? [firstAddrTrimmed, ...sameChainAddrs] : []
  const allEntries = detectedChain
    ? [{ chain: detectedChain, addresses: firstEntryAddrs }, ...extraEntries]
    : extraEntries
  const usedChains = new Set(allEntries.map(e => e.chain))
  const atMaxSameChain = firstEntryAddrs.length >= MAX_ADDRESSES

  function handleAddSameChain() {
    const trimmed = newSameAddr.trim()
    if (!trimmed) return
    if (firstEntryAddrs.includes(trimmed)) { setNewSameError('Adresse bereits vorhanden'); return }
    const detected = detectChain(trimmed)
    if (!detected || detected !== detectedChain) {
      setNewSameError(`Ungültige Adresse oder falsche Chain (erwartet: ${detectedChain?.toUpperCase()})`)
      return
    }
    setSameChainAddrs(prev => [...prev, trimmed])
    setNewSameAddr('')
    setNewSameError('')
  }

  function handleAddChain() {
    const trimmed = newChainAddr.trim()
    if (!trimmed) return
    const detected = detectChain(trimmed)
    if (!detected) { setNewChainError('Unbekannte Adresse'); return }
    if (usedChains.has(detected)) {
      setNewChainError(`${CHAIN_LABELS[detected] ?? detected} bereits vorhanden — füge weitere Adressen zum bestehenden Eintrag hinzu`)
      return
    }
    setExtraEntries(prev => [...prev, { chain: detected, addresses: [trimmed] }])
    setNewChainAddr('')
    setNewChainError('')
  }

  function handleRemoveChainEntry(chain) {
    setExtraEntries(prev => prev.filter(e => e.chain !== chain))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!firstAddrTrimmed || !detectedChain) return
    onAdd(label.trim() || CHAIN_LABELS[detectedChain] || 'Wallet', allEntries)
    setLabel(''); setFirstAddr(''); setSameChainAddrs([]); setExtraEntries([])
    setNewSameAddr(''); setNewSameError(''); setNewChainAddr(''); setNewChainError('')
    setOpen(false)
  }

  function handleClose() {
    setOpen(false)
    setLabel(''); setFirstAddr(''); setSameChainAddrs([]); setExtraEntries([])
    setNewSameAddr(''); setNewSameError(''); setNewChainAddr(''); setNewChainError('')
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-secondary btn-full" style={{ borderStyle: 'dashed' }}>
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
            placeholder="e.g. Trust Wallet"
            value={label}
            onChange={e => setLabel(e.target.value)}
          />
        </FormGroup>

        <FormGroup label="Wallet address" htmlFor="wallet-address" required>
          <Input
            id="wallet-address"
            type="text"
            placeholder="Enter address — chain auto-detected"
            value={firstAddr}
            onChange={e => { setFirstAddr(e.target.value); setSameChainAddrs([]); setNewSameError('') }}
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

        {/* Extra addresses for same chain */}
        {detectedChain && !atMaxSameChain && (
          <div>
            <div className="form-label mb-2">Extra {detectedChain.toUpperCase()} addresses (optional)</div>
            <div className="stack stack-sm">
              {sameChainAddrs.map(addr => (
                <div key={addr} className="flex items-center gap-2">
                  <span className="flex-1 font-mono text-caption text-text-muted truncate">{addr}</span>
                  <button type="button" onClick={() => setSameChainAddrs(p => p.filter(a => a !== addr))} className="btn-icon text-danger">✕</button>
                </div>
              ))}
              <div>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder={`Additional ${detectedChain.toUpperCase()} address…`}
                    value={newSameAddr}
                    onChange={e => { setNewSameAddr(e.target.value); setNewSameError('') }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSameChain() } }}
                    className="font-mono flex-1"
                  />
                  <Button type="button" variant="secondary" onClick={handleAddSameChain}>+</Button>
                </div>
                {newSameError && <p className="form-error mt-1">{newSameError}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Additional chain entries */}
        {detectedChain && extraEntries.length > 0 && (
          <div>
            <div className="form-label mb-2">Weitere Chains</div>
            <div className="stack stack-sm">
              {extraEntries.map(({ chain, addresses }) => (
                <div key={chain} className="flex items-center gap-2 p-2 rounded border border-border bg-surface">
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 ${CHAIN_BADGE[chain]}`}>
                    {chain.toUpperCase()}
                  </span>
                  <span className="flex-1 font-mono text-caption text-text-muted truncate">{addresses[0]}</span>
                  <button type="button" onClick={() => handleRemoveChainEntry(chain)} className="btn-icon text-danger">✕</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add another chain */}
        {detectedChain && (
          <div>
            <div className="form-label mb-2">Weitere Chain hinzufügen (optional)</div>
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Adresse eingeben — Chain wird erkannt…"
                value={newChainAddr}
                onChange={e => { setNewChainAddr(e.target.value); setNewChainError('') }}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddChain() } }}
                className="font-mono flex-1"
              />
              <Button type="button" variant="secondary" onClick={handleAddChain}>+</Button>
            </div>
            {newChainError && <p className="form-error mt-1">{newChainError}</p>}
            <p className="text-caption text-text-muted mt-1">Unterstützt ETH, BTC, SOL, LTC, DOGE, TRX</p>
          </div>
        )}

        <Button type="submit" variant="primary" fullWidth disabled={!detectedChain}>
          {detectedChain
            ? `Add wallet (${allEntries.length} Chain${allEntries.length > 1 ? 's' : ''})`
            : 'Add wallet'}
        </Button>

      </div>
    </form>
  )
}
