import { useState, useRef, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { useStatus } from '@hooks/queries/useStatus'

const CHAIN_BADGE = {
  eth:  'bg-primary text-text-inverted',
  btc:  'bg-accent text-text-inverted',
  sol:  'bg-info text-text-inverted',
  trx:  'bg-danger text-text-inverted',
  doge: 'bg-warning text-text-inverted',
  ltc:  'bg-info text-text-inverted',
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const { data } = useStatus()

  const notifications = data?.chains
    ? Object.entries(data.chains)
        .filter(([, v]) => v.status !== 'ok')
        .map(([chain, v]) => ({ chain, ...v }))
    : []

  const hasCritical = notifications.some((n) => n.status === 'critical')
  const hasIssues   = notifications.length > 0

  useEffect(() => {
    function onClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div className="notification-bell" ref={ref}>
      <button
        className="btn-icon transition-base"
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell size={16} />
        {hasIssues && (
          <span className={`notification-badge ${hasCritical ? 'notification-badge--critical' : 'notification-badge--degraded'}`} />
        )}
      </button>

      {open && (
        <div className="notification-dropdown">
          <div className="notification-dropdown__header">
            <span className="text-label">System Status</span>
          </div>

          {notifications.length === 0 ? (
            <div className="notification-dropdown__empty">
              All systems operational
            </div>
          ) : (
            <ul className="notification-dropdown__list">
              {notifications.map(({ chain, status, message }) => (
                <li key={chain} className="notification-item">
                  <span className={`chain-badge ${CHAIN_BADGE[chain] ?? 'bg-surface'}`}>
                    {chain.toUpperCase()}
                  </span>
                  <div className="notification-item__body">
                    <span className={`notification-item__status notification-item__status--${status}`}>
                      {status}
                    </span>
                    {message && (
                      <span className="text-caption">{message}</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
