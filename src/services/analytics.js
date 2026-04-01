// src/services/analytics.js

const ENDPOINT = `${import.meta.env.VITE_API_URL || '/api'}/track`
const STORAGE_KEY = '21stealth_sid'

let sessionId = null

export function initAnalytics() {
  sessionId = localStorage.getItem(STORAGE_KEY)
  if (!sessionId) {
    sessionId = crypto.randomUUID()
    localStorage.setItem(STORAGE_KEY, sessionId)
  }
}

export function track(event, properties) {
  if (!sessionId) return
  const body = JSON.stringify({
    session_id: sessionId,
    event,
    ...(properties !== undefined ? { properties } : {}),
  })
  try {
    if (typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: 'application/json' }))
    } else {
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {})
    }
  } catch {
    // fire and forget — never throw
  }
}
