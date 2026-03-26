import { useEffect, useRef, useState } from 'react'
import { Lock, SlidersHorizontal } from 'lucide-react'
import { useWallets } from '@hooks/useWallets'
import { useHistory } from '@hooks/useHistory'
import { getPrices, invalidatePrices } from '@/services/prices'
import { TotalBar, PortfolioSummary, HistoryChart, WalletCard, WalletModal, ConfigActions, PriceTicker, Card, Button } from '@ui'
import { tokenUsd } from '@/utils/tokenUsd'
import { Container, Grid } from '@layout'

export default function DashboardPage() {
  const { wallets, addWallet, removeWallet, updateWallet, refreshWallet, refreshAll, importWallets } = useWallets()
  const { history, saveSnapshot, loadHistory, getDelta } = useHistory()
  const [prices, setPrices] = useState(null)
  const [editingWalletId, setEditingWalletId] = useState(null)
  const [hideSmall, setHideSmall] = useState(false)
  const [fullAddresses, setFullAddresses] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef(null)
  const [addingWallet, setAddingWallet] = useState(false)
  const editingWallet = editingWalletId ? wallets.find(w => w.id === editingWalletId) ?? null : null
  const intervalRef = useRef(null)

  function startPricePolling() {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      invalidatePrices()
      getPrices().then(setPrices).catch(() => {})
    }, 60_000)
  }

  useEffect(() => {
    getPrices().then(setPrices).catch(() => {})
    startPricePolling()
    return () => clearInterval(intervalRef.current)
  }, [])

  useEffect(() => {
    const anyLoading = wallets.some(w => w.status === 'loading' || w.status === 'idle')
    const anyLoaded  = wallets.some(w => w.status === 'ok')
    if (!anyLoading && anyLoaded) saveSnapshot(wallets)
  }, [wallets, saveSnapshot])

  useEffect(() => {
    function handleClickOutside(e) {
      if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleRefreshAll() {
    invalidatePrices()
    getPrices().then(setPrices).catch(() => {})
    startPricePolling()
    refreshAll()
  }

  return (
    <Container className="py-6 flex flex-col gap-6">

      <div className="flex items-center justify-between">
        <h1 className="h2">Portfolio</h1>
        <ConfigActions
          wallets={wallets}
          history={history}
          onImport={(ws, hist) => { importWallets(ws); if (hist) loadHistory(hist) }}
          onRefreshAll={handleRefreshAll}
        />
      </div>

      <PriceTicker prices={prices} />

      {wallets.length === 0 ? (
        <Grid>
          <Grid.Col span="full">
            <Card>
              <Card.Body className="card-body-auto">
                <div className="flex flex-col items-center py-24 gap-4 text-center">
                  <Lock size={40} className="text-text-subtle" />
                  <p className="h4">No wallets yet</p>
                  <p className="text-body text-text-muted">Add a wallet address or import your config.</p>
                  <Button variant="primary" onClick={() => setAddingWallet(true)}>+ Add wallet</Button>
                </div>
              </Card.Body>
            </Card>
          </Grid.Col>
        </Grid>
      ) : (
        <>
          <Grid gap="md" className="items-stretch">
            <Grid.Col span="third">
              <TotalBar wallets={wallets} prices={prices} />
            </Grid.Col>
            <Grid.Col span="two-thirds">
              <PortfolioSummary wallets={wallets} prices={prices} getDelta={getDelta} />
            </Grid.Col>
          </Grid>

          <Grid>
            <Grid.Col span="full">
              <HistoryChart history={history} wallets={wallets} prices={prices} />
            </Grid.Col>
          </Grid>

          <div className="flex items-center justify-between gap-2">
            <h2 className="h4">Wallets</h2>
            <div className="flex items-stretch gap-2 relative" ref={filterRef}>
              <Button variant="secondary" size="sm" onClick={() => setFilterOpen(v => !v)} aria-label="Filter" className="leading-none">
                <SlidersHorizontal size={14} />
              </Button>
              {filterOpen && (
                  <div className="absolute right-0 top-full mt-1 z-10 card py-1 min-w-[180px]">
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-caption hover:bg-surface-raised flex items-center justify-between gap-4"
                      onClick={() => setHideSmall(v => !v)}
                    >
                      <span className="text-text">Hide small values</span>
                      {hideSmall && <span className="text-primary text-xs">✓</span>}
                    </button>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-caption hover:bg-surface-raised flex items-center justify-between gap-4"
                      onClick={() => setFullAddresses(v => !v)}
                    >
                      <span className="text-text">Show full addresses</span>
                      {fullAddresses && <span className="text-primary text-xs">✓</span>}
                    </button>
                  </div>
                )}
              <Button variant="primary" size="sm" onClick={() => setAddingWallet(true)}>
                + Add wallet
              </Button>
            </div>
          </div>


          <Grid gap="md" className="items-stretch">
            {[...wallets].sort((a, b) =>
              b.tokens.reduce((s, t) => s + tokenUsd(t, prices), 0) -
              a.tokens.reduce((s, t) => s + tokenUsd(t, prices), 0)
            ).map(wallet => (
              <Grid.Col key={wallet.id} span="half">
                <WalletCard
                  wallet={wallet}
                  prices={prices}
                  onRefresh={() => refreshWallet(wallet.id)}
                  onRemove={() => removeWallet(wallet.id)}
                  onEdit={() => setEditingWalletId(wallet.id)}
                  getDelta={getDelta}
                  hideSmall={hideSmall}
                  fullAddresses={fullAddresses}
                />
              </Grid.Col>
            ))}
          </Grid>

        </>
      )}

      <WalletModal
        isOpen={addingWallet || !!editingWallet}
        wallet={editingWallet}
        onClose={() => { setAddingWallet(false); setEditingWalletId(null) }}
        onSave={(id, data) => {
          if (id) { updateWallet(id, data) } else { addWallet(data.label, data.entries) }
          setAddingWallet(false)
          setEditingWalletId(null)
        }}
      />

    </Container>
  )
}
