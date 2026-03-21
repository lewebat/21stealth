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

const tickerStyles = `
  @keyframes ticker-scroll {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }
  .ticker-track {
    animation: ticker-scroll 30s linear infinite;
  }
  .ticker-track:hover {
    animation-play-state: paused;
  }
`

function CoinItem({ id, symbol, coin }) {
  return (
    <div className="flex items-center gap-1.5 shrink-0 px-4">
      <span className="text-xs font-bold" style={{ color: 'var(--color-sidebar-text)' }}>
        {symbol}
      </span>
      {coin ? (
        <>
          <span className="text-xs font-mono" style={{ color: 'var(--color-sidebar-text)' }}>
            {formatUsd(coin.usd)}
          </span>
          {coin.change24h != null && (
            <span
              className="text-xs font-mono"
              style={{ color: coin.change24h >= 0 ? 'var(--color-success)' : 'var(--color-danger)' }}
            >
              {formatChange(coin.change24h)}
            </span>
          )}

        </>
      ) : (
        <span className="inline-block h-3 w-20 rounded animate-pulse" style={{ background: 'var(--color-sidebar-border)' }} />
      )}
    </div>
  )
}

export function PriceTicker({ prices }) {
  return (
    <div className="rounded-lg overflow-hidden" style={{ background: 'var(--color-sidebar-bg)' }}>
      <style>{tickerStyles}</style>
      <div className="overflow-hidden py-2">
        <div className="ticker-track flex w-max">
          {/* Duplicate coins for seamless loop */}
          {[...COINS, ...COINS].map(({ id, symbol }, i) => (
            <CoinItem key={i} id={id} symbol={symbol} coin={prices?.[id]} />
          ))}
        </div>
      </div>
    </div>
  )
}
