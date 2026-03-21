const BASE = import.meta.env.VITE_API_BASE_URL ?? ''

export const BLOCKCHAIN_API = {
  prices:  `${BASE}/backend/api/prices.php`,
  balance: (chain) => `${BASE}/backend/api/balance/${chain}.php`,
}
