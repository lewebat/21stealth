import Button from './Button'
import { tokenUsd } from '@/utils/tokenUsd'

export function TotalBar({ wallets, prices, onRefreshAll }) {
  const total = wallets.reduce(
    (sum, w) => sum + w.tokens.reduce((s, t) => s + tokenUsd(t, prices), 0),
    0
  )

  return (
    <div className="card">
      <div className="card-header">
        <span className="text-label text-text-subtle">Total Portfolio</span>
        <Button variant="ghost" size="xs" onClick={onRefreshAll}>Refresh all</Button>
      </div>
      <div className="card-body">
        <div className="h2">
          ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </div>
    </div>
  )
}
