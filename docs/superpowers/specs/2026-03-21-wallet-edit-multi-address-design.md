# Design: Wallet bearbeiten & Multi-Adress-Support (BIP-85)

**Datum:** 2026-03-21
**Status:** Approved

## Überblick

Wallets sollen editierbar sein (Label + Adressen) und mehrere Adressen derselben Chain unterstützen. Typischer Anwendungsfall: BIP-85 Child-Adressen unter einer Wallet gruppieren.

## Datenmodell

Das Wallet-Objekt wird von `address: string` auf `addresses: string[]` umgestellt. Balances werden pro Adresse gespeichert und aggregiert:

```js
{
  id: string,           // uuid
  label: string,
  chain: 'btc' | 'eth' | 'sol' | 'ltc' | 'doge' | 'trx',
  addresses: string[],  // war: address: string; max. 10 Einträge (UI-Limit, kein Hard-Limit im Hook)

  // Pro Adresse:
  addrTokens: { [address: string]: Token[] },
  addrStatus: { [address: string]: 'loading' | 'ok' | 'error' },
  addrError:  { [address: string]: string },

  // Aggregiert (Summe aller Adressen, für PortfolioSummary & TotalBar):
  tokens: Token[],
  status: 'loading' | 'ok' | 'error',
  errorMsg?: string,    // nur gesetzt wenn status === 'error'; z.B. "2 von 3 Adressen konnten nicht geladen werden"
}
```

Cache-Key bleibt `chain:address` pro Adresse — keine Änderung am Cache-Mechanismus.

**Migration bestehender Store-State:** `useWallets` hält seinen State nur im React-State (kein `persist`-Middleware) — kein Migration-Problem zur Laufzeit. Beim Import via `walletConfig` (Datei) wird `address` → `addresses` konvertiert (siehe Import/Export-Abschnitt).

### Aggregationsregeln

- **`tokens`**: Token-Balances werden adressübergreifend nach `key` (= Token-Symbol, z.B. `'btc'`, `'eth'`) summiert. Da alle Adressen dieselbe Chain haben, sind Metadaten (Preis, Dezimalen) pro Token identisch. Falls Metadaten abweichen (z.B. Stale Cache): Metadaten des zuletzt geladenen Eintrags (höchster Cache-Timestamp) werden übernommen.
- **`status`**: `'loading'` wenn mind. eine Adresse lädt; sonst `'error'` wenn mind. eine Adresse Fehler hat; sonst `'ok'`.
- **`errorMsg`**: Wird gesetzt wenn `status === 'error'`; Inhalt: `"N von M Adressen konnten nicht geladen werden"`. Wird auf `undefined` zurückgesetzt sobald `status !== 'error'`.
- **`addrError` Cleanup**: Bei erfolgreichem Fetch einer Adresse wird `addrError[address]` gelöscht.
- **Partial-Error im Footer**: Zeigt Summe aller Adressen mit `addrStatus === 'ok'` zum Render-Zeitpunkt, mit `*`-Hinweis (z.B. `$12,500.00 *`).

### Verhalten bei `updateWallet`

- Signatur: `updateWallet(id, patch)` wobei `patch` `{ label?, addresses? }` ist — beide Felder optional
- Bei `addresses`: muss mind. 1 Eintrag enthalten (Hook wirft bei leerem Array); Duplikate innerhalb der Liste werden vom Hook dedupliziert
- Cache-Einträge für entfernte Adressen bleiben erhalten (stale-but-harmless), werden aber nicht mehr abgerufen
- Race condition: In-flight `loadBalances`-Requests schreiben ihr Ergebnis nur wenn die Adresse noch in `wallet.addresses` ist; andernfalls wird das Ergebnis verworfen
- Concurrent `updateWallet`-Calls: Last-write-wins; kein Locking erforderlich bei dieser App-Größe

## Komponenten

### useWallets (Hook)

Neue und geänderte Funktionen:

- `addWallet(label, chain, addresses: string[])` — war `(label, chain, address)`
- `updateWallet(id, patch: { label?: string, addresses?: string[] })` — neu; lädt Balances für neue Adressen nach
- `loadBalances(wallet, force?)` — lädt für alle `wallet.addresses` parallel; Ergebnis wird verworfen wenn Adresse nicht mehr in `wallet.addresses` ist
- `refreshWallet(id)` — unverändert

### WalletCard

- ✎-Icon im Header (neben ↻ und ✕); `onEdit`-Prop öffnet EditWalletModal
- Adress-Zeile entfernt; stattdessen pro Adresse eine Sektion:
  - Gekürzte Adresse (Monospace, klein, grau)
  - `addrStatus === 'loading'`: Skeleton
  - `addrStatus === 'error'`: Fehlermeldung aus `addrError[address]`
  - `addrStatus === 'ok'` + 0 Tokens: „No balance"
  - `addrStatus === 'ok'` + Tokens: Token-Tabelle (wie bisher mit @tanstack/react-table)
- Footer: aggregierter Total-USD; bei Partial-Error mit `*`-Hinweis

### EditWalletModal (neu)

Nutzt bestehende `Modal`-Komponente:

- Felder: Label (Text-Input), Adressen (Liste bestehender Adressen)
- Bestehende Adressen: Nur löschbar (✕); kein Inline-Editing — für Änderungen: löschen + neu hinzufügen
- ✕-Button bei letzter Adresse deaktiviert (mind. 1 Adresse erforderlich)
- Neue Adresse: Input-Feld + +-Button; Validierung beim +-Klick:
  - `detectChain(input) === null` oder `!== wallet.chain` → Fehler inline unter Input: `"Ungültige Adresse oder falsche Chain (erwartet: BTC)"` (bewusst eine gemeinsame Fehlermeldung für beide Fälle)
  - Duplikat (Adresse bereits in Liste) → Fehler: `"Adresse bereits vorhanden"`
  - Max. 10 Adressen erreicht → +-Button deaktiviert mit Hinweis
- Speichern ruft `updateWallet(id, { label, addresses })` auf
- Chain ist fix (kein Ändern möglich)

### AddWalletForm

- Erste Adresse: wie bisher, Chain wird auto-erkannt; „Weitere Adresse"-Bereich bleibt ausgeblendet solange Chain unbekannt
- Nach erster gültiger Adresse: „Weitere Adresse hinzufügen"-Bereich erscheint
- Weitere Adressen: Input + +-Button; Validierung beim +-Klick (selbe Regeln wie EditWalletModal); Duplikate abgelehnt
- Max. 10 Adressen gesamt; +-Button wird bei Erreichen des Limits deaktiviert
- Submit erstellt Wallet mit `addresses[]`-Array

### walletConfig (Import/Export)

- Export: `addresses` statt `address`
- Import: Rückwärtskompatibilität — `address` (string) wird zu `addresses: [address]` konvertiert
- Hinweis: Neue Format-Dateien (`addresses[]`) sind nicht rückwärtskompatibel mit älteren App-Versionen — kein Handlungsbedarf, da kein Sharing-Feature existiert

## Nicht im Scope

- Verschiedene Chains innerhalb einer Wallet
- Chain nachträglich ändern
- BIP-85 Seed-Ableitung (nur Adress-Gruppierung, kein Key-Management)
