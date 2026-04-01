import { useEffect, useState } from 'react'
import { track } from '@/services/analytics'

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

    const installedHandler = () => setIsInstalled(true)
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', installedHandler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
    }
  }, [])

  async function triggerInstall() {
    if (!promptEvent) return
    promptEvent.prompt()
    const { outcome } = await promptEvent.userChoice
    if (outcome === 'accepted') {
      setIsInstalled(true)
      track('pwa_installed')
    }
    setPromptEvent(null)
  }

  // iOS detection — beforeinstallprompt doesn't fire on Safari/Chrome iOS
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
                (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isSafariIOS = isIOS && /safari/i.test(navigator.userAgent) && !/crios|fxios|opios/i.test(navigator.userAgent)
  const showIOSHint = isSafariIOS && !isInstalled
  const showIOSNotSafari = isIOS && !isSafariIOS && !isInstalled

  // Firefox detection — no PWA install support
  const isFirefox = navigator.userAgent.includes('Firefox')
  const showFirefoxHint = isFirefox && !isInstalled

  return {
    canInstall: !!promptEvent,
    showIOSHint,
    showIOSNotSafari,
    showFirefoxHint,
    isInstalled,
    triggerInstall,
  }
}
