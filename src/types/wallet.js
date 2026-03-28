/**
 * @typedef {'eth'|'btc'|'sol'|'ltc'|'doge'|'trx'} Chain
 *
 * @typedef {{ chain: Chain, type: 'address'|'xpub', addresses?: string[], xpub?: string }} WalletEntry
 *
 * @typedef {{ id: string, label: string, entries: WalletEntry[] }} Wallet
 *
 * @typedef {{ key: string, chain: Chain, label: string, balance: number, usd: number }} TokenBalance
 *
 * @typedef {{ id: string, label: string, entries: WalletEntry[], tokens: TokenBalance[], status: 'idle'|'loading'|'ok'|'error', errorMsg?: string }} WalletWithBalances
 *
 * @typedef {{ date: string, balances: Record<string, Record<string, number>> }} BalanceSnapshot
 *
 * @typedef {{ version: '1', exportedAt: string, wallets: Wallet[], history?: BalanceSnapshot[] }} Config
 */
