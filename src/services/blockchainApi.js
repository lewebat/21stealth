const BASE = import.meta.env.VITE_API_BASE_URL ?? ''

export const BLOCKCHAIN_API = {
  prices:       `${BASE}/backend/api/prices`,
  priceHistory: `${BASE}/backend/api/price-history`,
  balance:      (chain) => `${BASE}/backend/api/balance/${chain}`,
  xpub:         (chain) => `${BASE}/backend/api/xpub/${chain}`,
}
