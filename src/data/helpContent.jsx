// src/data/helpContent.js
// Article body is JSX. To migrate to a backend later:
// replace getHelpContent with an async API call and adjust HelpModal to await it.

const HELP_ARTICLES = {
  'xpub-explained': {
    title: 'What is an xPub key?',
    summary: 'Track all addresses from an HD wallet with one key.',
    body: (
      <>
        <p className="text-body">
          An <strong>xPub key</strong> lets you track all addresses of an HD wallet at once —
          instead of adding each address individually, you paste the key once and the app
          discovers all your transactions automatically.
        </p>

        <p className="text-body mt-4 font-semibold">Where to find your xPub</p>
        <div className="table-wrapper mt-2">
          <table className="table table-compact">
            <thead>
              <tr>
                <th>Wallet</th>
                <th>xPub</th>
                <th>How to export</th>
              </tr>
            </thead>
            <tbody>
              <tr><td>Trezor</td><td className="text-success">✓</td><td className="text-caption text-text-muted">Suite → Account → Details → xPub</td></tr>
              <tr><td>Ledger</td><td className="text-success">✓</td><td className="text-caption text-text-muted">Ledger Live → Account → Edit → Advanced</td></tr>
              <tr><td>BitBox02</td><td className="text-success">✓</td><td className="text-caption text-text-muted">BitBoxApp → Account → Show xPub</td></tr>
              <tr><td>Electrum</td><td className="text-success">✓</td><td className="text-caption text-text-muted">Wallet → Information → Master Public Key</td></tr>
              <tr><td>Sparrow</td><td className="text-success">✓</td><td className="text-caption text-text-muted">Settings → Keystores → xPub field</td></tr>
              <tr><td>BlueWallet</td><td className="text-success">✓</td><td className="text-caption text-text-muted">Wallet → ··· → Export / Backup → xPub</td></tr>
              <tr><td>Trust Wallet</td><td className="text-danger">✗</td><td className="text-caption text-text-muted">Not available — add addresses individually</td></tr>
              <tr><td>BRD / Jaxx</td><td className="text-danger">✗</td><td className="text-caption text-text-muted">Not available — add addresses individually</td></tr>
              <tr><td>Blockchain.com</td><td className="text-success">✓</td><td className="text-caption text-text-muted">Settings → Wallets & Addresses → xPub</td></tr>
            </tbody>
          </table>
        </div>
      </>
    ),
  },

  'add-wallet': {
    title: 'Adding a wallet',
    summary: 'How to add wallets by address or xPub key.',
    body: (
      <>
        <p className="text-body">
          Paste a wallet address or xPub key into the first input field. The chain is detected
          automatically — you&apos;ll see a confirmation label appear on the right side of the
          field.
        </p>
        <p className="text-body mt-3">
          <strong>Supported chains:</strong> Bitcoin (BTC), Ethereum (ETH), Solana (SOL),
          Litecoin (LTC), Dogecoin (DOGE), Tron (TRX).
        </p>
        <p className="text-body mt-3">
          <strong>Single address:</strong> Paste any valid on-chain address. For stablecoins
          (USDT, USDC) on Ethereum or Tron, use the chain address — all tokens on that address
          are fetched together.
        </p>
        <p className="text-body mt-3">
          <strong>xPub key:</strong> Supported for BTC, LTC, and DOGE. The app derives all used
          addresses from the key automatically. See <em>What is an xPub key?</em> for details.
        </p>
        <p className="text-body mt-3">
          <strong>Multiple chains:</strong> After adding the first address or xPub, use the
          second input to add addresses for additional chains to the same wallet entry.
        </p>
      </>
    ),
  },

  'trust-wallet-addresses': {
    title: 'Trust Wallet — finding your addresses',
    summary: 'Trust Wallet does not expose xPub keys. Here\'s how to add your addresses manually.',
    body: (
      <>
        <p className="text-body">
          Trust Wallet is a non-custodial mobile wallet that, by design, does not expose your
          xPub key through its interface. This is a privacy and security decision — without the
          xPub, an observer cannot derive all your future addresses from a single key.
        </p>
        <p className="text-body mt-3">
          <strong>To add your Trust Wallet addresses:</strong>
        </p>
        <ol className="list-decimal list-inside stack stack-sm mt-2 text-body">
          <li>Open Trust Wallet and select the coin you want to track.</li>
          <li>Tap the &quot;Receive&quot; button to see your current address.</li>
          <li>Copy the address and paste it here.</li>
          <li>Repeat for each coin you want to track.</li>
        </ol>
        <p className="text-caption text-text-subtle mt-4">
          Note: Trust Wallet generates a new address for each Bitcoin transaction. Only your
          currently shown address and any previously used addresses will have a visible balance.
          For full BTC tracking with address derivation, consider using a wallet that exposes
          xPub (e.g. Electrum, Sparrow, BlueWallet).
        </p>
      </>
    ),
  },
}

export function getHelpContent(key) {
  return HELP_ARTICLES[key] ?? null
}

export const HELP_TOC = Object.entries(HELP_ARTICLES).map(([key, { title, summary }]) => ({
  key,
  title,
  summary,
}))
