import { useEffect, useState } from 'react'

export function useInstallPrompt() {
  const [promptEvent, setPromptEvent] = useState(null)
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    // Already running as installed PWA
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
      return
    }

    const handler = (e) => {
      e.preventDefault()
      setPromptEvent(e)
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setIsInstalled(true))

    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function triggerInstall() {
    if (!promptEvent) return
    promptEvent.prompt()
    const { outcome } = await promptEvent.userChoice
    if (outcome === 'accepted') setIsInstalled(true)
    setPromptEvent(null)
  }

  // iOS detection — beforeinstallprompt doesn't fire on Safari/Chrome iOS
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const showIOSHint = isIOS && !isInstalled

  return {
    canInstall: !!promptEvent,
    showIOSHint,
    isInstalled,
    triggerInstall,
  }
}
