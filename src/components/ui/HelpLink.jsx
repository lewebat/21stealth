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
