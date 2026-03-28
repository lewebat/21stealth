// Token key → CoinGecko coin ID
const TOKEN_PRICE_IDS = {
  btc:  'bitcoin',
  eth:  'ethereum',
  sol:  'solana',
  ltc:  'litecoin',
  doge: 'dogecoin',
  trx:  'tron',
}

import { STABLECOINS } from './tokenMetadata'

export function tokenUsd(token, prices) {
  if (!prices) return 0
  if (STABLECOINS.has(token.key)) return token.balance
  const coinId = TOKEN_PRICE_IDS[token.key]
  return coinId ? token.balance * (prices[coinId]?.usd ?? 0) : 0
}

export function tokensWithUsd(tokens, prices) {
  return tokens.map(t => ({ ...t, usd: tokenUsd(t, prices) }))
}
