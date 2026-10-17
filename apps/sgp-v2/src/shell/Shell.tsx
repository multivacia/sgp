import { NavLink, Outlet } from 'react-router-dom'

const TABS = [
  { to: '/', label: 'Início', icon: 'M3 11l9-7 9 7v9H3z', end: true },
  { to: '/esteiras', label: 'Esteiras', icon: 'M4 6h16M4 12h16M4 18h16' },
  { to: '/semana', label: 'Semana', icon: 'M3 5h18v16H3zM3 10h18M8 3v4M16 3v4' },
  { to: '/hoje', label: 'Hoje', icon: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z' },
  { to: '/eu', label: 'Eu', icon: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21c1-4 4-6 8-6s7 2 8 6' },
]

/** Casca do app da gestora: conteúdo com rolagem + barra de menu inferior. */
export function Shell() {
  return (
    <div className="flex min-h-dvh flex-col bg-ground">
      <div className="flex-1 overflow-y-auto px-4 pb-28 pt-6">
        <Outlet />
      </div>
      <nav aria-label="Menu principal" className="fixed inset-x-0 bottom-0 grid grid-cols-5 border-t border-line bg-white px-2 pb-[max(env(safe-area-inset-bottom),12px)] pt-2">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `flex min-h-14 flex-col items-center justify-center gap-0.5 text-sm font-bold ${isActive ? 'text-ink' : 'text-muted'}`
            }
          >
            <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d={t.icon} />
            </svg>
            {t.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
