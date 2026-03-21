import { useEffect, useState } from 'react'
import { useWallets } from '@hooks/useWallets'
import { useHistory } from '@hooks/useHistory'
import { getPrices } from '@/services/prices'
import { TotalBar, PortfolioSummary, HistoryChart, WalletCard, AddWalletForm, ConfigActions, EditWalletModal, PriceTicker } from '@ui'
import { Container, Grid } from '@layout'

export default function DashboardPage() {
  const { wallets, addWallet, removeWallet, updateWallet, refreshWallet, refreshAll, importWallets } = useWallets()
  const { history, saveSnapshot, loadHistory, getDelta } = useHistory()
  const [prices, setPrices] = useState(null)
  const [editingWalletId, setEditingWalletId] = useState(null)
  const editingWallet = editingWalletId ? wallets.find(w => w.id === editingWalletId) ?? null : null

  useEffect(() => {
    getPrices().then(setPrices).catch(() => {})
  }, [])

  useEffect(() => {
    const anyLoading = wallets.some(w => w.status === 'loading' || w.status === 'idle')
    const anyLoaded  = wallets.some(w => w.status === 'ok')
    if (!anyLoading && anyLoaded) saveSnapshot(wallets)
  }, [wallets, saveSnapshot])

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
            <div className="card">
              <div className="card-body flex flex-col items-center py-24 gap-4 text-center">
                <div className="text-display">🔒</div>
                <p className="h4">No wallets yet</p>
                <p className="text-body text-text-muted">Add a wallet address or import your config.</p>
                <div className="w-full max-w-sm">
                  <AddWalletForm onAdd={addWallet} />
                </div>
              </div>
            </div>
          </Grid.Col>
        </Grid>
      ) : (
        <>
          <Grid gap="md">
            <Grid.Col span="third">
              <TotalBar wallets={wallets} onRefreshAll={refreshAll} />
            </Grid.Col>
            <Grid.Col span="two-thirds">
              <PortfolioSummary wallets={wallets} getDelta={getDelta} />
            </Grid.Col>
          </Grid>

          <Grid>
            <Grid.Col span="full">
              <HistoryChart history={history} wallets={wallets} prices={prices} />
            </Grid.Col>
          </Grid>

          <Grid gap="md" className="items-stretch">
            {wallets.map(wallet => (
              <Grid.Col key={wallet.id} span="half">
                <WalletCard
                  wallet={wallet}
                  onRefresh={() => refreshWallet(wallet.id)}
                  onRemove={() => removeWallet(wallet.id)}
                  onEdit={() => setEditingWalletId(wallet.id)}
                  getDelta={getDelta}
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
