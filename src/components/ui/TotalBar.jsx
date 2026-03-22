import Card from './Card'
import Button from './Button'
import { tokenUsd } from '@/utils/tokenUsd'

export function TotalBar({ wallets, prices, onRefreshAll }) {
  const total = wallets.reduce(
    (sum, w) => sum + w.tokens.reduce((s, t) => s + tokenUsd(t, prices), 0),
    0
  )

  return (
    <Card className="h-full flex flex-col">
      <Card.Header>
        <span className="h5">Total Portfolio</span>
      </Card.Header>
      <Card.Body>
        <div className="h2">
          ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
      </Card.Body>
      <Card.Footer className="mt-auto">
        <Button variant="ghost" size="xs" onClick={onRefreshAll}>Refresh all</Button>
      </Card.Footer>
    </Card>
  )
}
