/**
 * @typedef {'eth'|'btc'|'sol'|'ltc'|'doge'|'trx'} Chain
 *
 * @typedef {{ id: string, label: string, chain: Chain, address: string }} Wallet
 *
 * @typedef {{ key: string, label: string, balance: number, usd: number }} TokenBalance
 *
 * @typedef {{ id: string, label: string, chain: Chain, address: string, tokens: TokenBalance[], status: 'idle'|'loading'|'ok'|'error', errorMsg?: string }} WalletWithBalances
 *
 * @typedef {{ date: string, balances: Record<string, Record<string, number>> }} BalanceSnapshot
 *
 * @typedef {{ version: '1', exportedAt: string, wallets: Wallet[], history?: BalanceSnapshot[] }} Config
 */
