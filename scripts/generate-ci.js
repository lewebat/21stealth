#!/usr/bin/env node
/**
 * Generates src/styles/ci/variables.css from src/config/ci.js
 * Run: npm run generate:ci
 */
import { writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const { default: ci } = await import('../src/config/ci.js')

const lines = [
  '/* AUTO-GENERATED — do not edit. Edit src/config/ci.js then run npm run generate:ci */',
  ':root {',
]

for (const [key, value] of Object.entries(ci.colors)) {
  lines.push(`  --color-${key}: ${value};`)
}
for (const [key, value] of Object.entries(ci.fonts)) {
  lines.push(`  --font-${key}: ${value};`)
}
for (const [key, value] of Object.entries(ci.spacing)) {
  lines.push(`  --spacing-${key}: ${value};`)
}
for (const [key, value] of Object.entries(ci.radius)) {
  lines.push(`  --radius-${key === 'DEFAULT' ? 'base' : key}: ${value};`)
}
for (const [key, value] of Object.entries(ci.shadows)) {
  lines.push(`  --shadow-${key === 'DEFAULT' ? 'base' : key}: ${value};`)
}
for (const [key, value] of Object.entries(ci.transitions)) {
  lines.push(`  --transition-${key}: ${value};`)
}
lines.push('}', '')

// Dark mode overrides
lines.push('[data-theme="dark"] {')
for (const [key, value] of Object.entries(ci.darkColors)) {
  lines.push(`  --color-${key}: ${value};`)
}
lines.push('}', '')

// System preference fallback (when no data-theme attribute set)
lines.push('@media (prefers-color-scheme: dark) {')
lines.push('  :root:not([data-theme="light"]) {')
for (const [key, value] of Object.entries(ci.darkColors)) {
  lines.push(`    --color-${key}: ${value};`)
}
lines.push('  }')
lines.push('}')

const outDir = path.resolve(__dirname, '../src/styles/ci')
mkdirSync(outDir, { recursive: true })
writeFileSync(path.join(outDir, 'variables.css'), lines.join('\n') + '\n')

console.log('✓ src/styles/ci/variables.css generated')
