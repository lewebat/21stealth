# Help Modal System — Design Spec

## Goal

Add a contextual help/documentation system: inline text links throughout the UI open topic-specific help modals; a header button opens a table of contents. All content lives in a central JS file with a clean abstraction for future backend migration.

---

## Architecture

### Data Layer — `src/data/helpContent.js`

Single source of truth for all help content:

```js
export const HELP_ARTICLES = {
  'xpub-explained': {
    title: 'What is an xPub key?',
    summary: 'Track all addresses from an HD wallet with one key.',
    body: <> ... </>   // React JSX
  },
  'add-wallet': { ... },
  'trust-wallet-addresses': { ... },
}

export function getHelpContent(key) {
  return HELP_ARTICLES[key] ?? null
}

export const HELP_TOC = Object.entries(HELP_ARTICLES)
  .map(([key, { title, summary }]) => ({ key, title, summary }))
```

- `body` is a React node (JSX) — supports headings, lists, bold, inline code
- Backend migration: replace `getHelpContent` with an async API call, swap body format to HTML or markdown if needed
- No persistence, no fetching — pure import

---

### State — `useUIStore` extension

Three new fields added to the existing Zustand store (not persisted):

```js
helpOpen: false,
helpArticle: null,   // null = show ToC; string key = show article

openHelp: (key = null) => set({ helpOpen: true, helpArticle: key }),
closeHelp: () => set({ helpOpen: false, helpArticle: null }),
```

`openHelp()` without argument → opens ToC.
`openHelp('xpub-explained')` → opens article directly.

---

### Components

#### `src/components/ui/HelpModal.jsx`

- Reads `helpOpen` + `helpArticle` + `closeHelp` + `openHelp` from `useUIStore`
- **ToC view** (`helpArticle === null`): renders a list of all articles from `HELP_TOC`, each as a clickable row (title + summary) that calls `openHelp(key)`
- **Article view** (`helpArticle !== null`): renders article title + body + a "← Back" button that calls `openHelp()` (resets to ToC)
- Uses existing `<Modal size="md">` component
- Placed once in `AppLayout.jsx` — always in DOM, controlled by store

#### `src/components/ui/HelpLink.jsx`

Tiny inline trigger component:

```jsx
<HelpLink articleKey="xpub-explained">learn more about xPub</HelpLink>
```

- Renders as `<button type="button">`
- Styled: underlined, `text-primary` color, no background, `text-caption` size — blends into surrounding text
- Calls `openHelp(articleKey)` on click

Both components exported from `src/components/ui/index.js`.

---

### Integration Points

**AppLayout.jsx:**
- Add `BookOpen` icon button in the header, between `NotificationBell` and the theme toggle
- Calls `openHelp()` — opens ToC
- Add `<HelpModal />` at the bottom of the layout JSX

**AddWalletForm.jsx:**
- Extend the existing info hint below the address/xPub input:
  `... chain is detected automatically. <HelpLink articleKey="xpub-explained">What is an xPub?</HelpLink>`

**EditWalletModal.jsx:**
- Same extension to the existing info hint at the bottom of the form

---

### Initial Articles (3)

| Key | Title | Content |
|-----|-------|---------|
| `xpub-explained` | What is an xPub key? | HD wallet derivation, why xPub lets you track all addresses, supported formats (xpub/ypub/zpub), how to export from Electrum/Sparrow |
| `add-wallet` | Adding a wallet | Address vs. xPub input, supported chains, how chain auto-detection works, multi-chain wallets |
| `trust-wallet-addresses` | Trust Wallet & xPub | Why Trust Wallet doesn't expose xPub, how to find individual addresses in Trust Wallet, and add them one by one |

---

## File Changes

| File | Change |
|------|--------|
| `src/data/helpContent.js` | **Create** — new `src/data/` directory + article content map + helpers |
| `src/store/useUIStore.js` | **Modify** — add `helpOpen`, `helpArticle`, `openHelp`, `closeHelp` |
| `src/components/ui/HelpModal.jsx` | **Create** — ToC + article modal |
| `src/components/ui/HelpLink.jsx` | **Create** — inline trigger component |
| `src/components/ui/index.js` | **Modify** — export `HelpModal`, `HelpLink` |
| `src/components/layout/AppLayout.jsx` | **Modify** — header button + `<HelpModal />` |
| `src/components/ui/AddWalletForm.jsx` | **Modify** — extend info hint with `HelpLink` |
| `src/components/ui/EditWalletModal.jsx` | **Modify** — extend info hint with `HelpLink` |

---

## Out of Scope

- Search within help content
- Markdown rendering (JSX is sufficient for now)
- Backend API for content (abstraction ready, not implemented)
- Help content for pages other than wallet add/edit
