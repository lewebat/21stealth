import { Outlet } from 'react-router-dom'
import { Moon, Sun, BookOpen } from 'lucide-react'
import useUIStore from '@store/useUIStore'
import { InstallBanner } from '@ui/InstallBanner'
import { NotificationBell, HelpModal } from '@ui'

export default function AppLayout() {
  const theme       = useUIStore((s) => s.theme)
  const toggleTheme = useUIStore((s) => s.toggleTheme)
  const openHelp    = useUIStore((s) => s.openHelp)

  return (
    <div className="page-wrapper">
      <div className="main-content">
        <InstallBanner />
        <header className="app-header">
          <span className="text-label text-text-subtle">v{__APP_VERSION__}</span>
          <div className="flex-1" />
          <NotificationBell />
          <button
            className="btn-icon transition-base"
            onClick={() => openHelp()}
            aria-label="Help"
            title="Help & Documentation"
          >
            <BookOpen size={16} />
          </button>
          <button
            className="btn-icon transition-base"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          >
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
        </header>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
      <HelpModal />
    </div>
  )
}
