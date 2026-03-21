const COINS = [
  { id: 'bitcoin',  symbol: 'BTC' },
  { id: 'ethereum', symbol: 'ETH' },
  { id: 'solana',   symbol: 'SOL' },
  { id: 'litecoin', symbol: 'LTC' },
  { id: 'dogecoin', symbol: 'DOGE' },
  { id: 'tron',     symbol: 'TRX' },
]

function formatUsd(n) {
  if (n >= 1) {
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
  }
  return '$' + n.toLocaleString('en-US', { maximumSignificantDigits: 4 })
}

function formatChange(n) {
  const sign = n >= 0 ? '+' : ''
  return sign + n.toFixed(1) + '%'
}

export function PriceTicker({ prices }) {
  return (
    <div className="rounded-lg overflow-hidden" style={{ background: 'var(--color-sidebar-bg)' }}>
      <div className="flex items-center gap-6 px-4 py-2 overflow-x-auto scrollbar-none">
        {COINS.map(({ id, symbol }) => {
          const coin = prices?.[id]
          return (
            <div key={id} className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs font-bold" style={{ color: 'var(--color-sidebar-text)' }}>
                {symbol}
              </span>
              {coin ? (
                <>
                  <span className="text-xs font-mono" style={{ color: 'var(--color-sidebar-text)' }}>
                    {formatUsd(coin.usd)}
                  </span>
                  <span
                    className="text-xs font-mono"
                    style={{ color: coin.change24h >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}
                  >
                    {formatChange(coin.change24h)}
                  </span>
                </>
              ) : (
                <span className="inline-block h-3 w-20 rounded animate-pulse" style={{ background: 'var(--color-sidebar-border)' }} />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
