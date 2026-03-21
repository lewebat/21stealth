/**
 * Button — wraps .btn-* CSS classes.
 * @param {'primary'|'secondary'|'accent'|'ghost'|'danger'|'link'} variant
 * @param {'xs'|'sm'|'md'|'lg'|'xl'} size
 * @param {boolean} fullWidth
 * @param {boolean} loading
 * @param {boolean} disabled
 * @param {React.ReactNode} leftIcon
 * @param {React.ReactNode} rightIcon
 */
export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  className = '',
  ...props
}) {
  const sizeClass = size !== 'md' ? `btn-${size}` : ''
  const cls = [
    `btn-${variant}`,
    sizeClass,
    fullWidth ? 'btn-full' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button className={cls} disabled={disabled || loading} {...props}>
      {loading ? (
        <span className="spinner" aria-hidden="true" />
      ) : (
        leftIcon && <span aria-hidden="true">{leftIcon}</span>
      )}
      {children}
      {!loading && rightIcon && <span aria-hidden="true">{rightIcon}</span>}
    </button>
  )
}
