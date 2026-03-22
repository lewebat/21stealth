# Projekt

Vite + React + Tailwind Projekt mit eigenem Design-System. Crypto Portfolio Tracker.
**Sprache: English** — alle UI-Texte, Labels, Fehlermeldungen auf Englisch.

## Skills

/vite-react-tailwind

## Wichtige Befehle

- `npm run dev` — Dev-Server starten (generiert CI-Variablen automatisch)
- `npm run generate:ci` — CSS-Variablen aus `src/config/ci.js` neu generieren
- `npm run build` — Production Build

## Branding ändern

1. `src/config/ci.js` bearbeiten
2. `npm run generate:ci` ausführen

---

## Design System

### Grundprinzip

Programmiere wie ein Mensch: ein Container → ein Padding → kein verschachteltes Padding.
Kein inline-Tailwind auf Containern wenn eine CSS-Klasse existiert.
Kein Tailwind-Utility wenn eine Komponente oder CSS-Klasse den Job macht.

### Layout-Struktur (App)

```
page-wrapper
  app-sidebar          ← icon-only, sticky, 100vh
  main-content
    header             ← theme toggle
    main
      Container
        Sections mit gap-6
```

### Seiten-Layout-Pattern

```jsx
<Container className="py-6 flex flex-col gap-6">
  {/* Titel-Zeile über einer Section */}
  <div className="flex items-center justify-between">
    <h2 className="h4">Section Title</h2>
    <Button variant="secondary" size="sm">Action</Button>
  </div>

  {/* Grid */}
  <Grid gap="md" className="items-stretch">
    <Grid.Col span="half">
      <Card className="h-full flex flex-col">...</Card>
    </Grid.Col>
  </Grid>
</Container>
```

### Card-Komponente (`src/components/ui/Card.jsx`)

**Immer** `<Card>/<Card.Header>/<Card.Body>/<Card.Footer>` verwenden — nie rohe `.card`-Divs.

```jsx
<Card className="h-full flex flex-col">
  <Card.Header>
    <span className="h5">Titel</span>
    <Button variant="ghost" size="xs">Action</Button>
  </Card.Header>
  <Card.Body>
    {/* Inhalt */}
  </Card.Body>
  <Card.Footer className="mt-auto">
    {/* Footer-Inhalt */}
  </Card.Footer>
</Card>
```

**Card.Body** hat `max-height: 180px` + `overflow-y: auto` — automatisch scrollbar.
Ausnahme: `<Card.Body className="card-body-auto">` für Formulare/variable Höhe.

**Repeating sections** innerhalb einer Card → `.card-section` (nicht mehrere Card.Body!):

```jsx
<Card>
  <Card.Header>...</Card.Header>
  <Card.Body>                        {/* ein einziger Card.Body */}
    <div className="card-section">...</div>   {/* border-top inset, eigenes padding */}
    <div className="card-section">...</div>
  </Card.Body>
  <Card.Footer>...</Card.Footer>
</Card>
```

### CSS-Klassen: Cards (`src/styles/components/cards.css`)

| Klasse | Verwendung |
|--------|-----------|
| `.card` | Base card (border, radius, shadow) |
| `.card-header` | Flex row, space-between, padding |
| `.card-body` | Padding 0.75rem 1.5rem, max-height 180px, scrollbar |
| `.card-body-auto` | Override: keine fixe Höhe (für Formulare) |
| `.card-footer` | Flex row, justify-end, surface background |
| `.card-section` | Repeating section in card body, border-top inset |
| `.card-stat` | Stat card mit label/value/trend |
| `.chain-badge` | Kleines Chain-Label (ETH, BTC, TRX...) — 10px, bold |
| `.chain-entry` | Bordered mini-section in EditWalletModal |

### CSS-Klassen: Buttons (`src/styles/components/buttons.css`)

| Klasse | Verwendung |
|--------|-----------|
| `.btn-primary` | Primär-Aktion |
| `.btn-secondary` | Sekundär-Aktion |
| `.btn-ghost` | Dezenter Button |
| `.btn-danger` | Destruktive Aktion |
| `.btn-icon` | Icon-Button (quadratisch, ghost, 0.5rem padding) |
| `.btn-xs/sm/md/lg/xl` | Größen |

**Button-Komponente** (`src/components/ui/Button.jsx`) verwenden wo möglich.
Für kleine inline-Buttons (Edit, Refresh, Remove in Cards) → `<button className="btn-icon">`.

### Typografie (`src/styles/base/typography.css`)

| Klasse | Verwendung |
|--------|-----------|
| `.h2` | Seiten-Titel (z.B. "Portfolio") |
| `.h4` | Titel über Grid-Sections (z.B. "Wallets") |
| `.h5` | Card-Titel in `Card.Header` |
| `.text-body` | Fliesstext |
| `.text-caption` | Kleine Texte, Tabellenwerte |
| `.text-label` | Uppercase Labels, sehr klein |

### Grid (`src/components/layout/Grid.jsx` + `src/styles/base/grid.css`)

```jsx
<Grid gap="md" className="items-stretch">
  <Grid.Col span="full">...</Grid.Col>
  <Grid.Col span="half">...</Grid.Col>
  <Grid.Col span="third">...</Grid.Col>
  <Grid.Col span="two-thirds">...</Grid.Col>
</Grid>
```

Spans: `full`, `half`, `third`, `two-thirds`, `quarter`, `three-quarters`

### Layout-Utilities (`src/styles/base/layout.css`)

| Klasse | Verwendung |
|--------|-----------|
| `.stack` | Flex column mit `gap` |
| `.stack-sm/md/lg/xl` | Gap-Varianten |
| `.cluster` | Flex row wrap mit `gap` |
| `.cluster-sm/lg` | Gap-Varianten |
| `.container` | Max-width centered wrapper |

### Tables (`src/styles/components/tables.css`)

```jsx
<div className="table-wrapper">
  <table className="table table-compact">
    <tbody>...</tbody>
  </table>
</div>
```

- Kein `<thead>` in Card-Tabellen (selbsterklärend)
- `.table-compact` für kompakte Darstellung in Cards
- Hover: Gradient-Effekt (kein solid color)
- `th` hat keinen Hintergrund

### Farben (CSS-Variablen)

```
--color-text           Haupttext
--color-text-muted     Gedämpfter Text
--color-text-subtle    Sehr dezenter Text
--color-text-inverted  Text auf dunklem Hintergrund
--color-background     App-Hintergrund (dunkelster Ton)
--color-surface        Card-Hintergrund
--color-surface-elevated  Elevated elements
--color-border         Borders
--color-primary        Primärfarbe (ETH-Badge, Buttons)
--color-accent         Akzentfarbe (BTC-Badge)
--color-success        Positiv/Gewinn
--color-danger         Negativ/Verlust
--color-warning        DOGE
--color-info           SOL, LTC, USDC
```

### Chain-Badges

Immer `.chain-badge` + Farbe aus `CHAIN_BADGE`-Map verwenden:

```jsx
const CHAIN_BADGE = {
  eth:  'bg-primary text-text-inverted',
  btc:  'bg-accent text-text-inverted',
  sol:  'bg-info text-text-inverted',
  trx:  'bg-danger text-text-inverted',
  doge: 'bg-warning text-text-inverted',
  ltc:  'bg-info text-text-inverted',
}

<span className={`chain-badge ${CHAIN_BADGE[chain]}`}>{chain.toUpperCase()}</span>
```

---

## Anti-Patterns — NIE machen

- ❌ Mehrere `<Card.Body>` in einer Card — immer nur eines, Sections via `.card-section`
- ❌ Inline-Padding auf Card-Containern (`px-4`, `py-6` auf Card direkt)
- ❌ Rohe `.card`-Divs statt `<Card>`-Komponente
- ❌ Deutsche UI-Texte
- ❌ Tailwind-Spacing-Utilities auf Grid-Containern statt `gap`
- ❌ Eigene Scrollbar-Styles inline — gilt global via `.card-body`
- ❌ Token-Aggregation ohne Chain-Key (`chain:tokenKey`) — führt zu falschen Summen

---

## Komponenten-Übersicht

| Komponente | Pfad | Zweck |
|-----------|------|-------|
| `Card` | `src/components/ui/Card.jsx` | Base card mit Header/Body/Footer |
| `Button` | `src/components/ui/Button.jsx` | Buttons mit Varianten und Größen |
| `Modal` | `src/components/ui/Modal.jsx` | Dialog mit Header/Body/Footer |
| `Form`, `Input`, `FormGroup` | `src/components/ui/Form.jsx` | Formular-Elemente |
| `Grid`, `Grid.Col` | `src/components/layout/Grid.jsx` | 12-col Grid |
| `Container` | `src/components/layout/Container.jsx` | Max-width Wrapper |
| `WalletCard` | `src/components/ui/WalletCard.jsx` | Wallet-Anzeige mit Chain-Sections |
| `PortfolioSummary` | `src/components/ui/PortfolioSummary.jsx` | Breakdown-Tabelle VALUE/HOLDINGS |
| `HistoryChart` | `src/components/ui/HistoryChart.jsx` | Portfolio-Verlauf (Recharts) |
| `TotalBar` | `src/components/ui/TotalBar.jsx` | Gesamtwert-Card |
| `AddWalletForm` | `src/components/ui/AddWalletForm.jsx` | Wallet hinzufügen |
| `EditWalletModal` | `src/components/ui/EditWalletModal.jsx` | Wallet bearbeiten |
| `ConfigActions` | `src/components/ui/ConfigActions.jsx` | Import/Export/Save |
| `PriceTicker` | `src/components/ui/PriceTicker.jsx` | Preis-Ticker |
| `AppLayout` | `src/components/layout/AppLayout.jsx` | Sidebar + Header + Outlet |
