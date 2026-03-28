import { cn } from '@lib/utils'

/**
 * FormGroup — wraps label + input + helper/error.
 * @param {string} label
 * @param {string} htmlFor
 * @param {boolean} required
 * @param {string} helper
 * @param {string} error
 * @param {string} success
 */
export function FormGroup({ label, htmlFor, required, helper, error, success, children, className = '' }) {
  return (
    <div className={cn('form-group', className)}>
      {label && (
        <label
          htmlFor={htmlFor}
          className={required ? 'form-label form-label-required' : 'form-label'}
        >
          {label}
        </label>
      )}
      {children}
      {error   && <span className="form-error">{error}</span>}
      {success && <span className="form-success">{success}</span>}
      {helper && !error && !success && <span className="form-helper">{helper}</span>}
    </div>
  )
}

const inputStateClass = (state) => state === 'error' ? 'input-error' : state === 'success' ? 'input-success' : ''

/**
 * Input — wraps .input CSS class.
 * @param {'error'|'success'|''} state
 * @param {'sm'|'md'|'lg'} size
 * @param {React.ReactNode} iconLeft
 * @param {React.ReactNode} iconRight
 */
export function Input({ state, size, iconLeft, iconRight, className = '', ...props }) {
  const stateClass = inputStateClass(state)
  const sizeClass  = size === 'sm' ? 'input-sm' : size === 'lg' ? 'input-lg' : ''

  if (iconLeft || iconRight) {
    return (
      <div className="input-wrapper">
        {iconLeft && <span className="input-icon-left">{iconLeft}</span>}
        <input
          className={cn('input', iconLeft && 'input--icon-left', iconRight && 'input--icon-right', stateClass, sizeClass, className)}
          {...props}
        />
        {iconRight && <span className="input-icon-right">{iconRight}</span>}
      </div>
    )
  }

  return (
    <input
      className={cn('input', stateClass, sizeClass, className)}
      {...props}
    />
  )
}

/**
 * FloatInput — input with an animated floating label.
 * The label sits inside the field and floats up on focus or when filled.
 * @param {string} label
 * @param {string} id
 * @param {React.ReactNode} iconRight
 * @param {'error'|'success'|''} state
 */
export function FloatInput({ label, id, iconRight, state, className = '', ...props }) {
  return (
    <div className="input-float input-wrapper">
      <input
        id={id}
        placeholder=" "
        className={cn('input', iconRight && 'input--icon-right', inputStateClass(state), className)}
        {...props}
      />
      {label && <label htmlFor={id} className="input-float-label">{label}</label>}
      {iconRight && <span className="input-icon-right">{iconRight}</span>}
    </div>
  )
}

export function Textarea({ state, className = '', ...props }) {
  return <textarea className={cn('textarea', inputStateClass(state), className)} {...props} />
}

export function Select({ state, className = '', children, ...props }) {
  return (
    <select className={cn('select', inputStateClass(state), className)} {...props}>
      {children}
    </select>
  )
}

export function Checkbox({ id, label, className = '', ...props }) {
  return (
    <label htmlFor={id} className={cn('checkbox', className)}>
      <input id={id} type="checkbox" {...props} />
      {label}
    </label>
  )
}

export function Radio({ id, name, label, className = '', ...props }) {
  return (
    <label htmlFor={id} className={cn('radio', className)}>
      <input id={id} name={name} type="radio" {...props} />
      {label}
    </label>
  )
}
