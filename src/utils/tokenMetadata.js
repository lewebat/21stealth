export const TOKEN_LABELS = {
  btc:  'Bitcoin',
  eth:  'Ethereum',
  sol:  'Solana',
  ltc:  'Litecoin',
  doge: 'Dogecoin',
  trx:  'Tron',
  usdt: 'Tether USD',
  usdc: 'USD Coin',
}

export const TOKEN_COLORS = {
  btc:  { text: 'text-accent',   bar: 'bg-accent' },
  eth:  { text: 'text-primary',  bar: 'bg-primary' },
  sol:  { text: 'text-info',     bar: 'bg-info' },
  ltc:  { text: 'text-info',     bar: 'bg-info' },
  doge: { text: 'text-warning',  bar: 'bg-warning' },
  trx:  { text: 'text-danger',   bar: 'bg-danger' },
  usdt: { text: 'text-success',  bar: 'bg-success' },
  usdc: { text: 'text-info',     bar: 'bg-info' },
}

export const STABLECOINS = new Set(['usdt', 'usdc'])
