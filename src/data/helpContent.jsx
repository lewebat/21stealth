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
          An <strong>xPub key</strong> (extended public key) is a master public key for an HD
          (Hierarchical Deterministic) wallet. From a single xPub, your wallet software derives
          a new receiving address for every transaction — that&apos;s why your Bitcoin address
          changes each time you receive funds.
        </p>
        <p className="text-body mt-3">
          Instead of adding each address individually, paste your xPub once and this app will
          automatically discover all derived addresses and show their combined balance.
        </p>
        <p className="text-body mt-3">
          <strong>Supported formats:</strong> xpub, ypub, zpub (Bitcoin), Ltub/Mtub (Litecoin),
          dgub (Dogecoin). ypub and zpub are automatically converted to xpub format before lookup.
        </p>
        <p className="text-body mt-3">
          <strong>How to export from Electrum:</strong> Wallet → Information → Master Public Key.
          Copy the key starting with <code className="font-mono text-caption">xpub</code>,{' '}
          <code className="font-mono text-caption">ypub</code>, or{' '}
          <code className="font-mono text-caption">zpub</code>.
        </p>
        <p className="text-body mt-3">
          <strong>How to export from Sparrow:</strong> Settings → Keystores → Master fingerprint
          section → copy the xPub field.
        </p>
        <p className="text-caption text-text-subtle mt-4">
          Your xPub is read-only — it cannot be used to spend funds. Only your private key or
          seed phrase can do that.
        </p>
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
