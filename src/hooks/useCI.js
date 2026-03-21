import ci from '@config/ci'

/**
 * Access CI values in JS (for charts, canvas, D3 etc.)
 * @returns {{ colors, fonts, spacing, radius, shadows, transitions }}
 */
export function useCI() {
  return ci
}

/**
 * Access a single CI color value outside of React.
 * @param {string} key - e.g. 'primary', 'accent'
 */
export function getCIColor(key) {
  return ci.colors[key] ?? null
}
