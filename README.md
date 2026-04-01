# 21stealth

A privacy-first crypto portfolio tracker. Track your wallets across multiple chains — no account required, no data stored on any server.

**→ [app.21stealth.com](https://app.21stealth.com)**

---

## What it does

Add your wallet addresses and get a live overview of your crypto portfolio. Balances, prices, 24h changes, and a portfolio history chart — all in one place.

**Supported chains:** ETH, BTC, SOL, LTC, DOGE, TRX
**Token support:** USDT, USDC (ERC-20)
**xPub support:** BTC, DOGE, LTC

## Privacy

Your wallet addresses never leave your device. They are stored in your browser's localStorage — nothing is saved on a server. No account, no tracking, no data collection.

## Install as app

21stealth is a PWA — you can install it directly from your browser on mobile and desktop. Works offline after the first load.

---

## Tech Stack

- Vite + React 18
- Tailwind CSS
- TanStack Query, React Router, Recharts, Zustand
- PHP backend (separate repo)
- PWA via vite-plugin-pwa
