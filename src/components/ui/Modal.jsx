import { useEffect } from 'react'

/**
 * Modal — wraps .modal-* CSS classes.
 * @param {boolean} isOpen
 * @param {() => void} onClose
 * @param {string} title
 * @param {'sm'|'md'|'lg'|'xl'|'full'} size
 */
export function Modal({ isOpen, onClose, title, size = 'md', children }) {
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className={`modal modal-${size}`} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          {title && <h2 className="h4">{title}</h2>}
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

Modal.Body = function ModalBody({ children, className = '' }) {
  return <div className={['modal-body', className].filter(Boolean).join(' ')}>{children}</div>
}

Modal.Footer = function ModalFooter({ children, className = '' }) {
  return <div className={['modal-footer', className].filter(Boolean).join(' ')}>{children}</div>
}

/**
 * Drawer — slides in from right.
 */
export function Drawer({ isOpen, onClose, title, children }) {
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer" role="dialog" aria-modal="true">
        <div className="modal-header">
          {title && <h2 className="h4">{title}</h2>}
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </>
  )
}
