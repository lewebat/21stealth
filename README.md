# 21stealth

A privacy-first crypto portfolio tracker. Track your wallets across multiple chains — no account, no data stored on any server.

**Live app:** [app.21stealth.com](https://app.21stealth.com)

---

## Features

- Track wallets across ETH, BTC, SOL, LTC, DOGE, TRX
- xPub support for BTC, DOGE, LTC
- ERC-20 token support (USDT, USDC)
- Live prices and 24h changes
- Portfolio history chart
- Dark / light theme
- Installable PWA (works offline)
- No account required — all wallet config stays in your browser

## Privacy

All wallet addresses are stored locally in your browser (localStorage). Nothing is sent to any server except the blockchain queries and price fetches needed to display your portfolio.

---

## Self-Hosting

### Frontend

```bash
# Install dependencies
npm install

# Copy and configure env
cp .env.production.example .env.production
# Fill in VITE_API_BASE_URL and VITE_APP_KEY

# Build
npm run build
```

Deploy the `dist/` folder to any static hosting.

### Backend

The PHP backend is maintained in a separate repository. It handles blockchain queries and price fetching so API keys are never exposed in the frontend.

Requirements:
- PHP 7.4+
- Apache with `mod_rewrite` (shared hosting works fine)

```bash
# Copy and configure
cp config.example.php config.php
# Fill in your API keys and app_key
```

Upload to your server and point `VITE_API_BASE_URL` in the frontend to its domain.

**Required API keys** (all have free tiers):
| Key | Used for |
|-----|----------|
| `alchemy_api_key` | ETH balances |
| `trongrid_api_key` | TRX balances |
| `blockchair_api_key` | BTC, LTC, DOGE xPub |
| `coingecko_api_key` | Price history |

### App Key

The `app_key` in `config.php` and `VITE_APP_KEY` in `.env.production` must match. It restricts backend access to your frontend only.

Generate one:
```bash
openssl rand -hex 32
```

---

## Development

```bash
npm install
npm run dev
```

To regenerate CSS variables from the design system:
```bash
npm run generate:ci
```

## Tech Stack

- Vite + React 18
- Tailwind CSS + custom design system (`src/config/ci.js`)
- TanStack Query, React Router, Recharts, Zustand
- PHP backend (separate repo)
- PWA via vite-plugin-pwa
