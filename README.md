# 21stealth — Privacy-First Crypto Portfolio Tracker

Track your crypto wallets without giving up your data. No account, no KYC, no server-side storage — your wallet addresses stay on your device.

**→ [app.21stealth.com](https://app.21stealth.com)**

---

## Why 21stealth?

Most portfolio trackers require you to create an account and hand over your wallet addresses. 21stealth works entirely in your browser — no registration, no cloud sync, no data collection. Just add your addresses and see your portfolio.

- **No account required** — open the app and start tracking
- **No KYC, no email** — completely anonymous
- **Watch-only** — read-only access to public blockchain data, your private keys are never involved
- **Open source** — the code is public and auditable

---

## Features

- Track wallets across **ETH, BTC, SOL, LTC, DOGE, TRX**
- **xPub support** for BTC, DOGE, LTC — add one key, track all derived addresses
- **ERC-20 tokens** — USDT, USDC balances included automatically
- Live prices with 24h change
- Portfolio history chart
- Dark / light theme
- **Installable PWA** — add to home screen on mobile or desktop, works offline

---

## Privacy & Data

Your wallet addresses are stored in your browser's localStorage only. Nothing is ever sent to a server except the blockchain queries and price fetches needed to display your portfolio.

**Backup your config:** Export your wallet config as an encrypted JSON file (password-protected) and store it wherever you want — your own cloud storage, USB drive, or password manager. Import it on any device to restore your portfolio instantly.

---

## Install as App

21stealth is a Progressive Web App. In Chrome, Edge, or Safari — open [app.21stealth.com](https://app.21stealth.com) and install it from the browser menu. No app store required.

---

## Tech Stack

- Vite + React 18
- Tailwind CSS + custom design system
- TanStack Query, React Router, Recharts, Zustand
- PHP backend (separate repo) — handles blockchain queries so API keys stay server-side
- PWA via vite-plugin-pwa

---

## Contributing

Issues and pull requests are welcome. The project is in active development.
