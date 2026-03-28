import { cn } from '@lib/utils'

/**
 * Card — wraps .card-* CSS classes.
 * @param {'default'|'surface'|'elevated'|'interactive'} variant
 * @param {'sm'|'default'|'lg'} size
 */
function Card({ children, variant = 'default', size = 'default', className = '', ...props }) {
  const variantClass = variant === 'default' ? 'card' : `card-${variant}`
  const sizeClass = size !== 'default' ? `card-${size}` : ''
  return (
    <div className={cn(variantClass, sizeClass, className)} {...props}>
      {children}
    </div>
  )
}

Card.Header = function CardHeader({ children, className = '', ...props }) {
  return (
    <div className={cn('card-header', className)} {...props}>
      {children}
    </div>
  )
}

Card.Body = function CardBody({ children, className = '', ...props }) {
  return (
    <div className={cn('card-body', className)} {...props}>
      {children}
    </div>
  )
}

Card.Footer = function CardFooter({ children, className = '', ...props }) {
  return (
    <div className={cn('card-footer', className)} {...props}>
      {children}
    </div>
  )
}

/**
 * @param {string} label
 * @param {string} value
 * @param {string} trend - e.g. "↑ 12%"
 * @param {'up'|'down'|'neutral'} trendDirection
 */
Card.Stat = function CardStat({ label, value, trend, trendDirection = 'neutral', className = '' }) {
  return (
    <div className={cn('card-stat', className)}>
      <span className="card-stat__label">{label}</span>
      <span className="card-stat__value">{value}</span>
      {trend && (
        <span className={`card-stat__trend card-stat__trend--${trendDirection}`}>{trend}</span>
      )}
    </div>
  )
}

export default Card
