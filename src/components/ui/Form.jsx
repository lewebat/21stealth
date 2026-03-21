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
    <div className={['form-group', className].filter(Boolean).join(' ')}>
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

/**
 * Input — wraps .input CSS class.
 * @param {'error'|'success'|''} state
 * @param {'sm'|'md'|'lg'} size
 * @param {React.ReactNode} iconLeft
 * @param {React.ReactNode} iconRight
 */
export function Input({ state, size, iconLeft, iconRight, className = '', ...props }) {
  const stateClass = state === 'error' ? 'input-error' : state === 'success' ? 'input-success' : ''
  const sizeClass  = size === 'sm' ? 'input-sm' : size === 'lg' ? 'input-lg' : ''

  if (iconLeft || iconRight) {
    return (
      <div className="input-wrapper">
        {iconLeft && <span className="input-icon-left">{iconLeft}</span>}
        <input
          className={['input', iconLeft && 'input--icon-left', iconRight && 'input--icon-right', stateClass, sizeClass, className].filter(Boolean).join(' ')}
          {...props}
        />
        {iconRight && <span className="input-icon-right">{iconRight}</span>}
      </div>
    )
  }

  return (
    <input
      className={['input', stateClass, sizeClass, className].filter(Boolean).join(' ')}
      {...props}
    />
  )
}

export function Textarea({ state, className = '', ...props }) {
  const stateClass = state === 'error' ? 'input-error' : state === 'success' ? 'input-success' : ''
  return <textarea className={['textarea', stateClass, className].filter(Boolean).join(' ')} {...props} />
}

export function Select({ state, className = '', children, ...props }) {
  const stateClass = state === 'error' ? 'input-error' : state === 'success' ? 'input-success' : ''
  return (
    <select className={['select', stateClass, className].filter(Boolean).join(' ')} {...props}>
      {children}
    </select>
  )
}

export function Checkbox({ id, label, className = '', ...props }) {
  return (
    <label htmlFor={id} className={['checkbox', className].filter(Boolean).join(' ')}>
      <input id={id} type="checkbox" {...props} />
      {label}
    </label>
  )
}

export function Radio({ id, name, label, className = '', ...props }) {
  return (
    <label htmlFor={id} className={['radio', className].filter(Boolean).join(' ')}>
      <input id={id} name={name} type="radio" {...props} />
      {label}
    </label>
  )
}
