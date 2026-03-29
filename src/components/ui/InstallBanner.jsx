import { useState } from 'react'
import { Download, X, Share } from 'lucide-react'
import { useInstallPrompt } from '@hooks/useInstallPrompt'

export function InstallBanner() {
  const { canInstall, showIOSHint, showIOSNotSafari, showFirefoxHint, isInstalled, triggerInstall } = useInstallPrompt()
  const [dismissed, setDismissed] = useState(false)

  if (isInstalled || dismissed) return null
  if (!canInstall && !showIOSHint && !showIOSNotSafari && !showFirefoxHint) return null

  return (
    <div className="install-banner">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Download size={18} className="shrink-0" style={{ color: 'rgba(0,0,0,0.6)' }} />
        <div className="min-w-0">
          <p className="text-caption font-semibold">
            {showFirefoxHint || showIOSNotSafari ? 'Did you know?' : 'Install 21 Stealth App'}
          </p>
          {showIOSHint ? (
            <p className="text-caption text-text-muted">
              Tap <span className="inline-flex items-center gap-0.5 align-middle"><Share size={12} /></span> then&nbsp;"Add to Home Screen"
            </p>
          ) : showIOSNotSafari ? (
            <p className="text-caption text-text-muted">21 Stealth is available as an app — open this page in Safari, tap <span className="inline-flex items-center gap-0.5 align-middle"><Share size={12} /></span> then&nbsp;"Add to Home Screen".</p>
          ) : showFirefoxHint ? (
            <p className="text-caption text-text-muted">21 Stealth is available as an app — Firefox doesn't support installation, switch to Chrome or Edge to install it.</p>
          ) : (
            <p className="text-caption text-text-muted">Add to your home screen for quick access</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {canInstall && !showFirefoxHint && (
          <button className="btn-primary btn-sm" onClick={triggerInstall}>
            Install
          </button>
        )}
        <button className="btn-icon text-text-subtle hover:text-text" onClick={() => setDismissed(true)}>
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
