import { AlertTriangle, Info, CheckCircle, XCircle, X } from 'lucide-react'
import useUIStore from '@store/useUIStore'

const ICONS = {
  warning: <AlertTriangle size={15} className="text-warning shrink-0 mt-0.5" />,
  error:   <XCircle      size={15} className="text-danger shrink-0 mt-0.5" />,
  success: <CheckCircle  size={15} className="text-success shrink-0 mt-0.5" />,
  info:    <Info         size={15} className="text-info shrink-0 mt-0.5" />,
}

export function Toaster() {
  const toasts      = useUIStore((s) => s.toasts)
  const removeToast = useUIStore((s) => s.removeToast)

  if (toasts.length === 0) return null

  return (
    <div className="toaster">
      {toasts.map(({ id, type = 'info', message }) => (
        <div key={id} className={`toast toast--${type}`}>
          {ICONS[type] ?? ICONS.info}
          <span className="flex-1">{message}</span>
          <button
            type="button"
            onClick={() => removeToast(id)}
            className="btn-icon shrink-0 text-text-subtle hover:text-text"
            style={{ marginTop: '-2px' }}
          >
            <X size={13} />
          </button>
        </div>
      ))}
    </div>
  )
}
