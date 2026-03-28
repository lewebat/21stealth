/**
 * Merge class names (Tailwind-safe).
 * Usage: cn('foo', condition && 'bar', 'baz')
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

/**
 * Format a USD value (or other currency) for display.
 *
 * @param {number} value
 * @param {{ compact?: boolean, sign?: boolean, currency?: string, locale?: string }} options
 *
 * Usage:
 *   formatCurrency(1234.56)                          → $1,234.56
 *   formatCurrency(1234.56, { compact: true })        → $1.2K
 *   formatCurrency(1234567, { compact: true })        → $1.23M
 *   formatCurrency(123.45, { sign: true })            → +$123.45
 *   formatCurrency(1234.56, { currency: 'EUR' })      → €1,234.56
 *   formatCurrency(1234.56, { currency: 'CHF' })      → CHF 1,234.56
 */
export function formatCurrency(value, { compact = false, sign = false, currency = 'USD', locale = 'en-US' } = {}) {
  const prefix = sign && value > 0 ? '+' : ''
  const symbol = new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 0 })
    .formatToParts(0).find((p) => p.type === 'currency')?.value ?? currency

  if (compact) {
    if (Math.abs(value) >= 1_000_000) return `${prefix}${symbol}${(value / 1_000_000).toFixed(2)}M`
    if (Math.abs(value) >= 1_000)     return `${prefix}${symbol}${(value / 1_000).toFixed(1)}K`
  }

  const formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)

  return prefix ? prefix + formatted : formatted
}

/**
 * Format a token balance for display.
 *
 * @param {number} value
 * @param {{ isStablecoin?: boolean, maxDecimals?: number, locale?: string }} options
 *
 * Usage:
 *   formatBalance(0.12345678)                          → 0.1235
 *   formatBalance(1234.56, { isStablecoin: true })     → 1,234.56
 *   formatBalance(0.12345678, { maxDecimals: 8 })      → 0.12345678
 */
export function formatBalance(value, { isStablecoin = false, maxDecimals = 4, locale = 'en-US' } = {}) {
  if (isStablecoin) {
    return value.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  return value.toLocaleString(locale, { maximumFractionDigits: maxDecimals })
}

/**
 * Debounce a function.
 */
export function debounce(fn, delay) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}
