import { Link, NavLink, Outlet } from 'react-router-dom'
import { useSession } from '../auth/context'
import { Marca } from '../ui/Marca'

const TABS = [
  { to: '/', label: 'Início', icon: 'M3 11l9-7 9 7v9H3z', end: true },
  { to: '/esteiras', label: 'Esteiras', icon: 'M4 6h16M4 12h16M4 18h16' },
  { to: '/semana', label: 'Semana', icon: 'M3 5h18v16H3zM3 10h18M8 3v4M16 3v4' },
  { to: '/hoje', label: 'Hoje', icon: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z' },
  { to: '/eu', label: 'Eu', icon: 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21c1-4 4-6 8-6s7 2 8 6' },
]

/** Casca do app da gestora: conteúdo com rolagem + barra de menu inferior. */
export function Shell() {
  const { state } = useSession()
  const email = state.status === 'authenticated' ? state.user.email : ''
  return (
    <div className="flex min-h-dvh flex-col bg-ground">
      <header className="brand-band flex items-center justify-between gap-3 px-4 pb-3 pt-[max(env(safe-area-inset-top),12px)]">
        <Link to="/" aria-label="Início">
          <Marca />
        </Link>
        <Link to="/eu" aria-label="Minha conta" className="flex size-10 items-center justify-center rounded-full border border-white/25 bg-white/10 font-display font-bold uppercase">
          {email.slice(0, 1) || '?'}
        </Link>
      </header>
      <div className="flex-1 px-4 pb-28 pt-5">
        <Outlet />
      </div>
      <nav aria-label="Menu principal" className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-line bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),12px)] pt-1.5 shadow-[0_-8px_24px_-12px_rgba(15,23,42,0.18)] backdrop-blur">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-sm font-bold ${isActive ? 'text-navy-blue' : 'text-muted'}`
            }
          >
            {({ isActive }) => (
              <>
                <span aria-hidden="true" className={`absolute top-0 h-1 w-8 rounded-full ${isActive ? 'bg-cta' : 'bg-transparent'}`} />
                <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth={isActive ? 2.6 : 2.2} strokeLinecap="round" strokeLinejoin="round">
                  <path d={t.icon} />
                </svg>
                {t.label}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
