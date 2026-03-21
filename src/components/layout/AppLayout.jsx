import { NavLink, Outlet } from 'react-router-dom'
import useUIStore from '@store/useUIStore'

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
]

export default function AppLayout() {
  const sidebarOpen   = useUIStore((s) => s.sidebarOpen)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const theme         = useUIStore((s) => s.theme)
  const toggleTheme   = useUIStore((s) => s.toggleTheme)

  return (
    <div className="page-wrapper">
      {sidebarOpen && (
        <aside className="app-sidebar">
          <div className="p-4">
            <span className="h4 text-sidebar-text">App</span>
          </div>

          <nav className="flex flex-col gap-1 p-3 flex-1">
            {navItems.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  [
                    'btn-ghost rounded-md px-3 py-2 text-sm font-medium text-sidebar-text',
                    isActive ? 'bg-sidebar-active text-text-inverted' : 'hover:bg-sidebar-hover',
                  ].join(' ')
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>
      )}

      <div className="main-content flex flex-col">
        <header className="flex items-center gap-4 px-6 py-3 bg-background">
          <button className="btn-icon" onClick={toggleSidebar} aria-label="Sidebar umschalten">
            ☰
          </button>
          <div className="flex-1" />
          <button
            className="btn-icon transition-base"
            onClick={toggleTheme}
            aria-label="Theme umschalten"
            title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </header>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
