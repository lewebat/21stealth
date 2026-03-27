# Help Modal System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a contextual help system with inline text triggers and a header ToC button, all backed by a central JS content file.

**Architecture:** Content lives in `src/data/helpContent.js` behind a `getHelpContent(key)` abstraction. A single `<HelpModal>` at the app root is controlled by two new fields in the existing `useUIStore` Zustand store. Inline `<HelpLink>` components anywhere in the app call `openHelp(key)` to open a specific article; calling `openHelp()` (no key) shows the table of contents.

**Tech Stack:** React, Zustand (`useUIStore`), existing `<Modal>` component, Lucide icons (`BookOpen`, `ChevronLeft`)

**Spec:** `docs/superpowers/specs/2026-03-28-help-modal-system-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/data/helpContent.js` | **Create** (new dir) | Article content map, `getHelpContent(key)`, `HELP_TOC` |
| `src/store/useUIStore.js` | **Modify** | Add `helpOpen`, `helpArticle`, `openHelp`, `closeHelp` |
| `src/components/ui/HelpLink.jsx` | **Create** | Inline trigger button — calls `openHelp(key)` |
| `src/components/ui/HelpModal.jsx` | **Create** | ToC + article view modal, reads from `useUIStore` |
| `src/components/ui/index.js` | **Modify** | Export `HelpLink`, `HelpModal` |
| `src/components/layout/AppLayout.jsx` | **Modify** | Add `BookOpen` header button + `<HelpModal />` |
| `src/components/ui/AddWalletForm.jsx` | **Modify** | Add `HelpLink` to existing info hint |
| `src/components/ui/EditWalletModal.jsx` | **Modify** | Add `HelpLink` to existing info hint |

---

## Task 1: Content data file

**Files:**
- Create: `src/data/helpContent.js` (create `src/data/` directory first)

- [ ] **Step 1: Create `src/data/helpContent.js`**

```jsx
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
```

- [ ] **Step 2: Verify the file parses without errors**

Run: `npm run build 2>&1 | head -20`

Expected: no errors referencing `helpContent.js`

- [ ] **Step 3: Commit**

```bash
git add src/data/helpContent.js
git commit -m "feat: add help content data file"
```

---

## Task 2: Extend useUIStore with help state

**Files:**
- Modify: `src/store/useUIStore.js`

- [ ] **Step 1: Add help fields to `useUIStore`**

Open `src/store/useUIStore.js`. The current store has `sidebarOpen`, `theme`, `toasts`. Add three fields and two actions **inside the `(set) => ({...})` factory, before the closing `})`**. Place them after `removeToast`:

```js
// Add after removeToast:
helpOpen: false,
helpArticle: null, // null = show ToC; string key = show specific article

openHelp: (key = null) => set({ helpOpen: true, helpArticle: key }),
closeHelp: () => set({ helpOpen: false, helpArticle: null }),
```

The `partialize` at the bottom only persists `theme` — the new fields are automatically excluded from persistence. No change needed there.

- [ ] **Step 2: Verify build**

Run: `npm run build 2>&1 | head -20`

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/store/useUIStore.js
git commit -m "feat: add help modal state to useUIStore"
```

---

## Task 3: HelpLink component

**Files:**
- Create: `src/components/ui/HelpLink.jsx`
- Modify: `src/components/ui/index.js`

- [ ] **Step 1: Create `src/components/ui/HelpLink.jsx`**

```jsx
// src/components/ui/HelpLink.jsx
import useUIStore from '@store/useUIStore'

/**
 * Inline help trigger. Renders as a button styled as underlined text.
 * @param {string} articleKey - key from HELP_ARTICLES in src/data/helpContent.js
 * @param {React.ReactNode} children - link text
 */
export function HelpLink({ articleKey, children }) {
  const openHelp = useUIStore((s) => s.openHelp)
  return (
    <button
      type="button"
      onClick={() => openHelp(articleKey)}
      className="text-caption text-primary underline hover:no-underline"
    >
      {children}
    </button>
  )
}
```

- [ ] **Step 2: Export from barrel**

Add to `src/components/ui/index.js`:

```js
export { HelpLink } from './HelpLink'
```

- [ ] **Step 3: Verify build**

Run: `npm run build 2>&1 | head -20`

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/HelpLink.jsx src/components/ui/index.js
git commit -m "feat: add HelpLink inline trigger component"
```

---

## Task 4: HelpModal component

**Files:**
- Create: `src/components/ui/HelpModal.jsx`
- Modify: `src/components/ui/index.js`

- [ ] **Step 1: Create `src/components/ui/HelpModal.jsx`**

```jsx
// src/components/ui/HelpModal.jsx
import { ChevronLeft } from 'lucide-react'
import { Modal } from './Modal'
import useUIStore from '@store/useUIStore'
import { getHelpContent, HELP_TOC } from '@/data/helpContent'

export function HelpModal() {
  const helpOpen    = useUIStore((s) => s.helpOpen)
  const helpArticle = useUIStore((s) => s.helpArticle)
  const openHelp    = useUIStore((s) => s.openHelp)
  const closeHelp   = useUIStore((s) => s.closeHelp)

  const article = helpArticle ? getHelpContent(helpArticle) : null
  const title   = article ? article.title : 'Help & Documentation'

  return (
    <Modal isOpen={helpOpen} onClose={closeHelp} title={title} size="md">
      <Modal.Body>
        {article ? (
          <div className="stack stack-md">
            <button
              type="button"
              onClick={() => openHelp()}
              className="flex items-center gap-1 text-caption text-text-muted hover:text-text"
            >
              <ChevronLeft size={14} />
              Back to contents
            </button>
            <div className="stack stack-sm">
              {article.body}
            </div>
          </div>
        ) : (
          <div className="stack stack-sm">
            {HELP_TOC.map(({ key, title, summary }) => (
              <button
                key={key}
                type="button"
                onClick={() => openHelp(key)}
                className="w-full text-left p-3 rounded-lg border border-border hover:border-primary hover:bg-surface-elevated transition-base"
              >
                <div className="text-body font-semibold">{title}</div>
                <div className="text-caption text-text-muted mt-0.5">{summary}</div>
              </button>
            ))}
          </div>
        )}
      </Modal.Body>
    </Modal>
  )
}
```

- [ ] **Step 2: Export from barrel**

Add to `src/components/ui/index.js`:

```js
export { HelpModal } from './HelpModal'
```

- [ ] **Step 3: Verify build**

Run: `npm run build 2>&1 | head -20`

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/HelpModal.jsx src/components/ui/index.js
git commit -m "feat: add HelpModal component with ToC and article views"
```

---

## Task 5: AppLayout — header button and modal mount

**Files:**
- Modify: `src/components/layout/AppLayout.jsx`

Current header structure (line 15–26):
```jsx
<header className="app-header">
  <div className="flex-1" />
  <NotificationBell />
  <button className="btn-icon transition-base" onClick={toggleTheme} ...>
    ...
  </button>
</header>
```

- [ ] **Step 1: Update AppLayout.jsx**

Add imports at the top:
```js
import { BookOpen } from 'lucide-react'
import { HelpModal } from '@ui'
```

Add `openHelp` from `useUIStore`:
```js
const openHelp = useUIStore((s) => s.openHelp)
```

Insert the `BookOpen` button between `<NotificationBell />` and the theme button:
```jsx
<button
  className="btn-icon transition-base"
  onClick={() => openHelp()}
  aria-label="Help"
  title="Help & Documentation"
>
  <BookOpen size={16} />
</button>
```

Add `<HelpModal />` just before the closing `</div>` of `page-wrapper`:
```jsx
    </div>
    <HelpModal />
  </div>  {/* end page-wrapper */}
```

Full updated file for reference:

```jsx
import { Outlet } from 'react-router-dom'
import { Moon, Sun, BookOpen } from 'lucide-react'
import useUIStore from '@store/useUIStore'
import { InstallBanner } from '@ui/InstallBanner'
import { NotificationBell, HelpModal } from '@ui'

export default function AppLayout() {
  const theme       = useUIStore((s) => s.theme)
  const toggleTheme = useUIStore((s) => s.toggleTheme)
  const openHelp    = useUIStore((s) => s.openHelp)

  return (
    <div className="page-wrapper">
      <div className="main-content">
        <InstallBanner />
        <header className="app-header">
          <div className="flex-1" />
          <NotificationBell />
          <button
            className="btn-icon transition-base"
            onClick={() => openHelp()}
            aria-label="Help"
            title="Help & Documentation"
          >
            <BookOpen size={16} />
          </button>
          <button
            className="btn-icon transition-base"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </header>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
      <HelpModal />
    </div>
  )
}
```

- [ ] **Step 2: Start dev server and verify**

Run: `npm run dev`

Open the app. Verify:
- `BookOpen` icon appears in the header between the bell and the theme toggle
- Clicking it opens a modal titled "Help & Documentation" with 3 ToC items
- Clicking a ToC item shows the article with "Back to contents"
- Clicking "Back to contents" returns to the ToC
- Pressing Escape closes the modal
- Clicking outside the modal closes it

- [ ] **Step 3: Commit**

```bash
git add src/components/layout/AppLayout.jsx
git commit -m "feat: add help button to header, mount HelpModal in AppLayout"
```

---

## Task 6: Inline HelpLink triggers in AddWalletForm and EditWalletModal

**Files:**
- Modify: `src/components/ui/AddWalletForm.jsx`
- Modify: `src/components/ui/EditWalletModal.jsx`

### AddWalletForm

Current info hint (around line 130–133):
```jsx
<p className="flex items-center gap-1.5 text-caption text-text-subtle mt-1">
  <Info size={12} className="shrink-0" />
  Enter a wallet address or xPub key. Supported: BTC, ETH, SOL, LTC, DOGE, TRX — chain is detected automatically.
</p>
```

- [ ] **Step 1: Add HelpLink import to AddWalletForm.jsx**

Add to the import at the top (it can be added to the existing `@ui` import or as a separate line):
```js
import { HelpLink } from '@ui'
```

- [ ] **Step 2: Extend the info hint in AddWalletForm.jsx**

Replace the info hint paragraph with:
```jsx
<p className="flex items-center gap-1.5 text-caption text-text-subtle mt-1">
  <Info size={12} className="shrink-0" />
  Enter a wallet address or xPub key. Supported: BTC, ETH, SOL, LTC, DOGE, TRX — chain is detected automatically.{' '}
  <HelpLink articleKey="xpub-explained">What is an xPub?</HelpLink>
</p>
```

### EditWalletModal

Current info hint (around line 207–210):
```jsx
<p className="flex items-center gap-1.5 text-caption text-text-subtle mt-1">
  <Info size={12} className="shrink-0" />
  Enter a wallet address or xPub key. Supported: BTC, ETH, SOL, LTC, DOGE, TRX — chain is detected automatically.
</p>
```

- [ ] **Step 3: Add HelpLink import to EditWalletModal.jsx**

```js
import { HelpLink } from '@ui'
```

- [ ] **Step 4: Extend the info hint in EditWalletModal.jsx**

Replace with:
```jsx
<p className="flex items-center gap-1.5 text-caption text-text-subtle mt-1">
  <Info size={12} className="shrink-0" />
  Enter a wallet address or xPub key. Supported: BTC, ETH, SOL, LTC, DOGE, TRX — chain is detected automatically.{' '}
  <HelpLink articleKey="xpub-explained">What is an xPub?</HelpLink>
</p>
```

- [ ] **Step 5: Verify in the browser**

With dev server running:
- Open "Add wallet" modal — the info hint should have a "What is an xPub?" link
- Click it — the xPub article opens
- Close modal, open "Edit wallet" for any wallet — same link present and working

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/AddWalletForm.jsx src/components/ui/EditWalletModal.jsx
git commit -m "feat: add xpub help link to AddWalletForm and EditWalletModal"
```

---

## Final: push

```bash
git push
```
