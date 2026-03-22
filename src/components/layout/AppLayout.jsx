import { NavLink, Outlet } from 'react-router-dom'
import useUIStore from '@store/useUIStore'


const navItems = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
]

export default function AppLayout() {
  const theme       = useUIStore((s) => s.theme)
  const toggleTheme = useUIStore((s) => s.toggleTheme)

  return (
    <div className="page-wrapper">
      <aside className="app-sidebar">
        <nav className="flex flex-col gap-1 flex-1 items-center justify-center">
          {navItems.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              data-tooltip={label}
              className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
            >
              {icon}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="main-content flex flex-col">
        <header className="flex items-center gap-4 px-6 py-3 bg-background">
          <div className="flex-1" />
          <button
            className="btn-icon transition-base"
            onClick={toggleTheme}
            aria-label="Toggle theme"
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
