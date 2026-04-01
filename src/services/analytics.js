// src/services/analytics.js

const BASE = import.meta.env.VITE_API_BASE_URL ?? ''
const ENDPOINT = `${BASE}/backend/api/track`
const STORAGE_KEY = '21stealth_sid'

let sessionId = null

export function initAnalytics() {
  try {
    sessionId = localStorage.getItem(STORAGE_KEY)
    if (!sessionId) {
      sessionId = crypto.randomUUID()
      localStorage.setItem(STORAGE_KEY, sessionId)
    }
  } catch {
    // localStorage blocked (private mode, quota) — analytics disabled silently
  }
}

export function track(event, properties) {
  if (typeof event !== 'string' || !event) return
  if (!sessionId) return
  const body = JSON.stringify({
    session_id: sessionId,
    event,
    ...(properties !== undefined ? { properties } : {}),
  })
  try {
    fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-App-Key': import.meta.env.VITE_APP_KEY,
      },
      body,
      keepalive: true,
      credentials: 'omit',
    }).catch(() => {})
  } catch {
    // fire and forget — never throw
  }
}
