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

function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60)   return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`
  return `${Math.floor(diff / 86400)} d ago`
}

export function NotificationBell() {
  const [open, setOpen]     = useState(false)
  const [seenAt, setSeenAt] = useState({})   // { [chain]: timestamp } — when first detected
  const [read, setRead]     = useState({})   // { [chain]: true } — marked as read
  const ref = useRef(null)
  const { data } = useStatus()

  const issues = data?.chains
    ? Object.entries(data.chains)
        .filter(([, v]) => v.status !== 'ok')
        .map(([chain, v]) => ({ chain, ...v }))
    : []

  // Track first-seen timestamps, clear resolved chains
  useEffect(() => {
    if (!data?.chains) return
    const now = Date.now()
    setSeenAt((prev) => {
      const next = { ...prev }
      Object.entries(data.chains).forEach(([chain, v]) => {
        if (v.status !== 'ok' && !next[chain]) next[chain] = now
        if (v.status === 'ok') delete next[chain]
      })
      return next
    })
    setRead((prev) => {
      const next = { ...prev }
      Object.entries(data.chains).forEach(([chain, v]) => {
        if (v.status === 'ok') delete next[chain]
      })
      return next
    })
  }, [data])

  const unread      = issues.filter(({ chain }) => !read[chain])
  const hasCritical = unread.some((n) => n.status === 'critical')
  const hasUnread   = unread.length > 0

  function markAllRead() {
    setRead(Object.fromEntries(issues.map(({ chain }) => [chain, true])))
  }

  function markRead(chain) {
    setRead((prev) => ({ ...prev, [chain]: true }))
  }

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
        {hasUnread && (
          <span className={`notification-badge ${hasCritical ? 'notification-badge--critical' : 'notification-badge--degraded'}`} />
        )}
      </button>

      {open && (
        <div className="notification-dropdown">
          <div className="notification-dropdown__header">
            <span className="text-label">System Status</span>
            {issues.length > 0 && hasUnread && (
              <button className="notification-mark-read" onClick={markAllRead}>
                Mark all read
              </button>
            )}
          </div>

          {issues.length === 0 ? (
            <div className="notification-dropdown__empty">
              All systems operational
            </div>
          ) : (
            <ul className="notification-dropdown__list">
              {issues.map(({ chain, status, message }) => (
                <li key={chain} className={`notification-item${read[chain] ? ' notification-item--read' : ''}`}>
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
                    {seenAt[chain] && (
                      <span className="notification-item__time">{timeAgo(seenAt[chain])}</span>
                    )}
                  </div>
                  {!read[chain] && (
                    <button className="notification-item__dismiss" onClick={() => markRead(chain)} title="Mark as read">
                      ×
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
