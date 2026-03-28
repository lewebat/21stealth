import { cn } from '@lib/utils'

/**
 * Grid — wraps .grid-12 or .grid-auto CSS classes.
 * @param {boolean} auto - use grid-auto instead of grid-12
 * @param {'sm'|'md'|'lg'|'xl'} gap
 */
function Grid({ children, auto = false, gap = 'md', className = '', ...props }) {
  const gridClass = auto ? 'grid-auto' : 'grid-12'
  const gapClass  = `gap-grid-${gap}`
  return (
    <div className={cn(gridClass, gapClass, className)} {...props}>
      {children}
    </div>
  )
}

/**
 * Grid.Col — wraps .col-* CSS classes.
 * @param {'full'|'half'|'third'|'two-thirds'|'quarter'|'three-quarters'|1|2|...|12} span
 */
Grid.Col = function GridCol({ children, span = 'full', className = '', ...props }) {
  return (
    <div className={cn(`col-${span}`, className)} {...props}>
      {children}
    </div>
  )
}

export default Grid
