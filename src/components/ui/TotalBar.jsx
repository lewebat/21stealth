import Card from './Card'
import Button from './Button'
import { tokenUsd } from '@/utils/tokenUsd'

function formatShort(n) {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + 'M'
  if (n >= 1_000)     return '$' + (n / 1_000).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + 'K'
  return null
}

const formatFull = (n) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function TotalBar({ wallets, prices, onRefreshAll }) {
  const total = wallets.reduce(
    (sum, w) => sum + w.tokens.reduce((s, t) => s + tokenUsd(t, prices), 0),
    0
  )

  const short = formatShort(total)
  const full  = formatFull(total)

  return (
    <Card className="h-full flex flex-col">
      <Card.Header>
        <span className="h5">Total Portfolio</span>
      </Card.Header>
      <Card.Body className="card-body-auto">
        <div className="h2">{short ?? full}</div>
        {short && <div className="text-caption text-text-subtle font-mono mt-0.5">{full}</div>}
      </Card.Body>
      <Card.Footer className="mt-auto">
        <Button variant="ghost" size="xs" onClick={onRefreshAll}>Refresh all</Button>
      </Card.Footer>
    </Card>
  )
}
