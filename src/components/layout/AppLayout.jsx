import { Outlet } from 'react-router-dom'
import { Moon, Sun } from 'lucide-react'
import useUIStore from '@store/useUIStore'
import { InstallBanner } from '@ui/InstallBanner'
import { NotificationBell } from '@ui'

export default function AppLayout() {
  const theme       = useUIStore((s) => s.theme)
  const toggleTheme = useUIStore((s) => s.toggleTheme)

  return (
    <div className="page-wrapper">
      <div className="main-content">
        <InstallBanner />
        <header className="app-header">
          <div className="flex-1" />
          <NotificationBell />
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
    </div>
  )
}
