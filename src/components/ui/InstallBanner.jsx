import { useState } from 'react'
import { Download, X, Share } from 'lucide-react'
import { useInstallPrompt } from '@hooks/useInstallPrompt'

export function InstallBanner() {
  const { canInstall, showIOSHint, isInstalled, triggerInstall } = useInstallPrompt()
  const [dismissed, setDismissed] = useState(false)

  if (isInstalled || dismissed) return null
  if (!canInstall && !showIOSHint) return null

  return (
    <div className="install-banner">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <Download size={18} className="shrink-0 text-primary" />
        <div className="min-w-0">
          <p className="text-caption font-semibold">Install 21stealth</p>
          {showIOSHint ? (
            <p className="text-caption text-text-muted flex items-center gap-1">
              Tap <Share size={12} className="inline" /> then "Add to Home Screen"
            </p>
          ) : (
            <p className="text-caption text-text-muted">Add to your home screen for quick access</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {canInstall && (
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
