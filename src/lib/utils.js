/**
 * Merge class names (Tailwind-safe).
 * Usage: cn('foo', condition && 'bar', 'baz')
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

/**
 * Format a number as currency.
 * Usage: formatCurrency(1234.5, 'EUR', 'de-DE')
 */
export function formatCurrency(value, currency = 'USD', locale = 'en-US') {
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value)
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
