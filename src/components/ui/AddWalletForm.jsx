import { useState } from 'react'
import { detectChain } from '@utils/detectChain'
import { FloatInput } from './Form'
import Button from './Button'
import { Modal } from './Modal'

const CHAIN_LABELS = { eth: 'Ethereum', btc: 'Bitcoin', sol: 'Solana', ltc: 'Litecoin', doge: 'Dogecoin', trx: 'Tron' }
const CHAIN_BADGE = {
  eth: 'bg-primary text-text-inverted', btc: 'bg-accent text-text-inverted',
  sol: 'bg-info text-text-inverted',    ltc: 'bg-info text-text-inverted',
  doge: 'bg-warning text-text-inverted', trx: 'bg-danger text-text-inverted',
}
const MAX_ADDRESSES = 10

export function AddWalletForm({ isOpen, onClose, onAdd }) {
  const [label, setLabel] = useState('')
  const [firstAddr, setFirstAddr] = useState('')
  const [sameChainAddrs, setSameChainAddrs] = useState([])
  const [extraEntries, setExtraEntries] = useState([])
  const [newSameAddr, setNewSameAddr] = useState('')
  const [newSameError, setNewSameError] = useState('')
  const [newChainAddr, setNewChainAddr] = useState('')
  const [newChainError, setNewChainError] = useState('')

  const firstAddrTrimmed = firstAddr.trim()
  const detectedChain = detectChain(firstAddrTrimmed)
  const firstEntryAddrs = detectedChain ? [firstAddrTrimmed, ...sameChainAddrs] : []
  const allEntries = detectedChain
    ? [{ chain: detectedChain, addresses: firstEntryAddrs }, ...extraEntries]
    : extraEntries
  const usedChains = new Set(allEntries.map(e => e.chain))
  const atMaxSameChain = firstEntryAddrs.length >= MAX_ADDRESSES

  function reset() {
    setLabel(''); setFirstAddr(''); setSameChainAddrs([]); setExtraEntries([])
    setNewSameAddr(''); setNewSameError(''); setNewChainAddr(''); setNewChainError('')
  }

  function handleClose() { reset(); onClose() }

  function handleAddSameChain() {
    const trimmed = newSameAddr.trim()
    if (!trimmed) return
    if (firstEntryAddrs.includes(trimmed)) { setNewSameError('Address already added'); return }
    const detected = detectChain(trimmed)
    if (!detected || detected !== detectedChain) {
      setNewSameError(`Invalid address or wrong chain (expected: ${detectedChain?.toUpperCase()})`)
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
    if (!detected) { setNewChainError('Unknown address'); return }
    if (usedChains.has(detected)) {
      setNewChainError(`${CHAIN_LABELS[detected] ?? detected} already exists — add more addresses to the existing entry`)
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
              label="Wallet address — chain auto-detected"
              type="text"
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

            {detectedChain && (sameChainAddrs.length > 0 || !atMaxSameChain) && (
              <div>
                <div className="form-label mb-2">Extra {detectedChain.toUpperCase()} addresses (optional)</div>
                <div className="stack stack-sm">
                  {sameChainAddrs.map(addr => (
                    <div key={addr} className="flex items-center gap-2">
                      <span className="flex-1 font-mono text-caption text-text-muted truncate">{addr}</span>
                      <button type="button" onClick={() => setSameChainAddrs(p => p.filter(a => a !== addr))} className="btn-icon text-danger">✕</button>
                    </div>
                  ))}
                  {!atMaxSameChain ? (
                    <div>
                      <div className="flex gap-2">
                        <FloatInput
                          label={`Additional ${detectedChain.toUpperCase()} address`}
                          type="text"
                          value={newSameAddr}
                          onChange={e => { setNewSameAddr(e.target.value); setNewSameError('') }}
                          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSameChain() } }}
                          className="font-mono flex-1"
                        />
                        <Button type="button" variant="secondary" onClick={handleAddSameChain}>+</Button>
                      </div>
                      {newSameError && <p className="form-error mt-1">{newSameError}</p>}
                    </div>
                  ) : (
                    <p className="text-caption text-text-muted">Maximum of {MAX_ADDRESSES} addresses reached</p>
                  )}
                </div>
              </div>
            )}

            {detectedChain && extraEntries.length > 0 && (
              <div>
                <div className="form-label mb-2">Additional chains</div>
                <div className="stack stack-sm">
                  {extraEntries.map(({ chain, addresses }) => (
                    <div key={chain} className="chain-entry-header">
                      <div className="flex items-center gap-2">
                        <span className={`chain-badge ${CHAIN_BADGE[chain]}`}>{chain.toUpperCase()}</span>
                        <span className="font-mono text-caption text-text-muted truncate">{addresses[0]}</span>
                      </div>
                      <button type="button" onClick={() => handleRemoveChainEntry(chain)} className="btn-icon text-danger">✕</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {detectedChain && (
              <div>
                <div className="flex gap-2">
                  <FloatInput
                    label="Add another chain — address auto-detected"
                    type="text"
                    value={newChainAddr}
                    onChange={e => { setNewChainAddr(e.target.value); setNewChainError('') }}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddChain() } }}
                    className="font-mono flex-1"
                  />
                  <Button type="button" variant="secondary" onClick={handleAddChain}>+</Button>
                </div>
                {newChainError && <p className="form-error mt-1">{newChainError}</p>}
              </div>
            )}

          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" type="button" onClick={handleClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!detectedChain}>
            {detectedChain
              ? `Add wallet (${allEntries.length} chain${allEntries.length > 1 ? 's' : ''})`
              : 'Add wallet'}
          </Button>
        </Modal.Footer>
      </form>
    </Modal>
  )
}
