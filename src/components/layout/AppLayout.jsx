import { NavLink, Outlet } from 'react-router-dom'
import { LayoutGrid, Moon, Sun } from 'lucide-react'
import useUIStore from '@store/useUIStore'


const navItems = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: <LayoutGrid size={18} />,
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

      <div className="main-content">
        <header className="app-header">
          <div className="flex-1" />
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
