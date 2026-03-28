import { cn } from '@lib/utils'

/**
 * Container — wraps .container-* CSS classes.
 * @param {'sm'|'md'|'lg'|'xl'|'2xl'|'fluid'} size
 */
export default function Container({ children, size = 'xl', className = '', ...props }) {
  const cls = size === 'xl' ? 'container' : `container container-${size}`
  return (
    <div className={cn(cls, className)} {...props}>
      {children}
    </div>
  )
}
