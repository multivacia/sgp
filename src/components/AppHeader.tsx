import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  COLOR_THEME_IDS,
  COLOR_THEME_LABELS,
  type ColorThemeId,
} from '../lib/theme/theme-constants'
import { useColorTheme } from '../lib/theme/useColorTheme'
import { shellContextForPath } from '../lib/page-meta'
import { useAuth } from '../lib/use-auth'
import { isSupportTicketsEnabled } from '../lib/api/env'
import { OpenSupportTicketDialog } from '../features/support/OpenSupportTicketDialog'

function displayNameFromEmail(email: string) {
  const local = email.split('@')[0] ?? 'gestor'
  return local
    .replace(/[._-]/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join(' ')
}

function initialsFromEmail(email: string) {
  const name = displayNameFromEmail(email)
  const parts = name.split(' ')
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
  }
  return name.slice(0, 2).toUpperCase() || 'SG'
}

type Props = {
  onMenuClick: () => void
}

export function AppHeader({ onMenuClick }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const { themeId, setThemeId } = useColorTheme()
  const [avatarFailed, setAvatarFailed] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [supportDialogOpen, setSupportDialogOpen] = useState(false)
  const profileWrapRef = useRef<HTMLDivElement>(null)
  const supportEnabled = isSupportTicketsEnabled()

  const shellContext = shellContextForPath(location.pathname)
  const email = user?.email ?? ''
  const displayName = email ? displayNameFromEmail(email) : 'Gestor'
  const initials = email ? initialsFromEmail(email) : 'SG'

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  useEffect(() => {
    if (!profileMenuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setProfileMenuOpen(false)
    }
    const onDown = (e: MouseEvent) => {
      const t = e.target
      if (!(t instanceof Node)) return
      if (profileWrapRef.current?.contains(t)) return
      setProfileMenuOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [profileMenuOpen])

  return (
    <header className="sticky top-0 z-30 border-b border-[color:var(--semantic-border-glass)] bg-sgp-night/85 shadow-[0_8px_32px_-12px_rgba(0,0,0,0.55)] backdrop-blur-xl">
      <div
        className="h-[3px] w-full bg-gradient-to-r from-sgp-void via-sgp-blue-bright to-sgp-gold-warm"
        aria-hidden
      />
      <div className="flex min-h-14 flex-col gap-3 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-0 md:px-6 md:pr-5">
        <div className="flex min-w-0 items-center gap-3 px-4 md:px-0">
          <button
            type="button"
            className="rounded-xl border border-transparent p-2 text-slate-400 transition hover:border-white/10 hover:bg-white/[0.05] hover:text-slate-100 md:hidden"
            aria-label="Abrir menu"
            onClick={onMenuClick}
          >
            <svg
              className="size-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
          <div className="min-w-0 border-l border-sgp-gold/30 pl-3 md:pl-4">
            <p className="hidden text-[10px] font-bold uppercase tracking-[0.18em] text-sgp-gold/90 sm:block">
              SGP
            </p>
            <p className="truncate font-heading text-base font-bold tracking-tight text-slate-50 md:text-lg">
              {shellContext}
            </p>
            <p className="hidden truncate text-xs font-medium text-slate-500 sm:block">
              SGP · execução e backlog
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 px-4 sm:flex-nowrap sm:gap-3 sm:px-0 md:pl-2">
          {supportEnabled ? (
            <button
              type="button"
              onClick={() => setSupportDialogOpen(true)}
              className="rounded-xl border border-sgp-gold/35 bg-sgp-gold/10 px-3 py-2 text-xs font-bold text-sgp-gold-warm transition hover:bg-sgp-gold/[0.16]"
            >
              Abrir chamado
            </button>
          ) : null}
          <label
            htmlFor="sgp-header-search"
            className="relative hidden min-w-[160px] max-w-[220px] flex-1 md:block"
          >
            <span className="sr-only">Busca rápida</span>
            <svg
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              id="sgp-header-search"
              type="search"
              readOnly
              placeholder="Busca rápida…"
              className="w-full cursor-default rounded-xl border border-[color:var(--semantic-border-glass-strong)] bg-sgp-app-panel-deep/90 py-2 pl-9 pr-3 text-xs text-slate-300 shadow-inner outline-none ring-sgp-blue-bright/0 transition placeholder:text-slate-600 focus:ring-2 focus:ring-sgp-blue-bright/25"
              title="Busca visual (mock)"
            />
          </label>

          <div className="relative ml-auto sm:ml-0" ref={profileWrapRef}>
            <button
              type="button"
              id="sgp-profile-menu-trigger"
              className="flex max-w-full items-center gap-2 rounded-xl border border-white/10 bg-gradient-to-br from-sgp-app-panel/95 to-sgp-app-panel-deep/95 py-1 pl-1 pr-2 text-left shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] transition hover:border-white/16 focus:outline-none focus-visible:ring-2 focus-visible:ring-sgp-blue-bright/35"
              aria-expanded={profileMenuOpen}
              aria-haspopup="menu"
              aria-controls="sgp-profile-menu"
              onClick={() => setProfileMenuOpen((v) => !v)}
            >
              {user?.avatarUrl && !avatarFailed ? (
                <img
                  src={user.avatarUrl}
                  alt=""
                  className="size-9 shrink-0 rounded-lg border border-white/10 object-cover shadow-inner"
                  onError={() => setAvatarFailed(true)}
                />
              ) : (
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-sgp-navy to-sgp-navy-mid font-heading text-[11px] font-bold text-sgp-gold-warm shadow-inner"
                  aria-hidden
                >
                  {initials}
                </span>
              )}
              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-xs font-bold text-slate-100">
                  {displayName}
                </p>
                <p
                  className="max-w-[140px] truncate text-[10px] text-slate-500 md:max-w-[200px]"
                  title={email}
                >
                  {email || '—'}
                </p>
              </div>
              <svg
                className="size-4 shrink-0 text-slate-500"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                aria-hidden
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>

            {profileMenuOpen ? (
              <div
                id="sgp-profile-menu"
                role="menu"
                aria-labelledby="sgp-profile-menu-trigger"
                className="absolute right-0 z-50 mt-1 min-w-[15rem] max-w-[min(100vw-2rem,18rem)] rounded-xl border border-white/[0.1] bg-sgp-navy-deep py-1 text-left shadow-xl ring-1 ring-black/20"
              >
                <div
                  role="none"
                  className="border-b border-white/[0.06] px-3 py-2.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <label
                    htmlFor="sgp-color-theme"
                    className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500"
                  >
                    Tema
                  </label>
                  <select
                    id="sgp-color-theme"
                    value={themeId}
                    onChange={(e) =>
                      setThemeId(e.target.value as ColorThemeId)
                    }
                    aria-label="Tema da aplicação"
                    className="w-full cursor-pointer rounded-lg border border-[color:var(--semantic-border-glass-strong)] bg-sgp-app-panel-deep/90 py-1.5 pl-2 pr-8 text-[11px] font-semibold text-slate-200 shadow-inner outline-none focus:ring-2 focus:ring-sgp-blue-bright/25"
                  >
                    {COLOR_THEME_IDS.map((id) => (
                      <option key={id} value={id}>
                        {COLOR_THEME_LABELS[id]}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-slate-200 transition hover:bg-white/[0.06]"
                  title="Notificações (mock)"
                  onClick={() => {
                    /* mock — mesmo comportamento que o botão isolado no topo */
                  }}
                >
                  <svg
                    className="size-4 shrink-0 text-slate-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                  Alertas
                </button>

                <div
                  className="my-1 border-t border-white/[0.08]"
                  role="separator"
                  aria-hidden
                />

                <button
                  type="button"
                  role="menuitem"
                  className="w-full px-3 py-2 text-left text-xs font-semibold text-slate-200 transition hover:bg-white/[0.06]"
                  onClick={() => {
                    setProfileMenuOpen(false)
                    navigate('/app/conta/alterar-senha')
                  }}
                >
                  Alterar senha
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="w-full px-3 py-2 text-left text-xs font-bold text-slate-100 transition hover:bg-rose-500/10 hover:text-rose-100"
                  onClick={() => {
                    setProfileMenuOpen(false)
                    void handleLogout()
                  }}
                >
                  Sair
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <OpenSupportTicketDialog
        open={supportDialogOpen}
        onClose={() => setSupportDialogOpen(false)}
      />
    </header>
  )
}
