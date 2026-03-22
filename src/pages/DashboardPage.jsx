import { useEffect, useRef, useState } from 'react'
import { useWallets } from '@hooks/useWallets'
import { useHistory } from '@hooks/useHistory'
import { getPrices, invalidatePrices } from '@/services/prices'
import { TotalBar, PortfolioSummary, HistoryChart, WalletCard, AddWalletForm, ConfigActions, EditWalletModal, PriceTicker, Card } from '@ui'
import { tokenUsd } from '@/utils/tokenUsd'
import { Container, Grid } from '@layout'

export default function DashboardPage() {
  const { wallets, addWallet, removeWallet, updateWallet, refreshWallet, refreshAll, importWallets } = useWallets()
  const { history, saveSnapshot, loadHistory, getDelta } = useHistory()
  const [prices, setPrices] = useState(null)
  const [editingWalletId, setEditingWalletId] = useState(null)
  const [hideSmall, setHideSmall] = useState(false)
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
        />
      </div>

      <PriceTicker prices={prices} />

      {wallets.length === 0 ? (
        <Grid>
          <Grid.Col span="full">
            <Card>
              <Card.Body>
                <div className="flex flex-col items-center py-24 gap-4 text-center">
                  <div className="text-display">🔒</div>
                  <p className="h4">No wallets yet</p>
                  <p className="text-body text-text-muted">Add a wallet address or import your config.</p>
                  <div className="w-full max-w-sm">
                    <AddWalletForm onAdd={addWallet} />
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Grid.Col>
        </Grid>
      ) : (
        <>
          <Grid gap="md" className="items-stretch">
            <Grid.Col span="third">
              <TotalBar wallets={wallets} prices={prices} onRefreshAll={handleRefreshAll} />
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

          <div className="flex items-center justify-between">
            <h2 className="h4">Wallets</h2>
            <button
              type="button"
              onClick={() => setHideSmall(v => !v)}
              className={`btn btn-sm ${hideSmall ? 'btn-primary' : 'btn-secondary'}`}
            >
              {hideSmall ? 'Show all' : 'Hide small values'}
            </button>
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
                />
              </Grid.Col>
            ))}
          </Grid>

          <Grid>
            <Grid.Col span="full">
              <AddWalletForm onAdd={addWallet} />
            </Grid.Col>
          </Grid>
        </>
      )}

      {editingWallet && (
        <EditWalletModal
          wallet={editingWallet}
          isOpen={true}
          onClose={() => setEditingWalletId(null)}
          onSave={(id, patch) => { updateWallet(id, patch); setEditingWalletId(null) }}
        />
      )}

    </Container>
  )
}
