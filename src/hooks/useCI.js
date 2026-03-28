import ci from '@config/ci'

/**
 * Access CI values in JS (for charts, canvas, D3 etc.)
 * @returns {{ colors, fonts, spacing, radius, shadows, transitions }}
 */
export function useCI() {
  return ci
}
