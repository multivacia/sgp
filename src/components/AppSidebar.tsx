import type { MouseEvent, ReactNode } from 'react'
import { useMemo } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/use-auth'
import {
  COLABORADOR_NAV_ITEMS,
  CONTA_NAV_ITEMS,
  filterShellNavItems,
  GESTAO_NAV_ITEMS,
  SHELL_NAV_GROUP_LABEL,
  SIDEBAR_GROUP_ORDER,
  type ShellNavItem,
} from '../lib/shell/app-nav-config'
import { isSupportTicketsEnabled } from '../lib/api/env'
import {
  pathsWouldChangeForNavigation,
  useShellFunction,
} from '../lib/shell/shell-function-context'
import { SgpMark } from './login/SgpMark'

type Props = {
  open: boolean
  onClose: () => void
  /** Preferência persistida; efeito visual de rail só a partir de `md` (ver classes). */
  collapsed: boolean
  onToggleCollapsed: () => void
}

/** Mapa local de ícones por rota — mantém `app-nav-config` sem alterações. */
function ShellNavRouteIcon({ route, className }: { route: string; className?: string }) {
  const cn = ['shrink-0', className].filter(Boolean).join(' ')
  switch (route) {
    case '/app/backlog':
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h10M4 18h10" />
        </svg>
      )
    case '/app/nova-esteira':
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      )
    case '/app/importar-os':
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      )
    case '/app/dashboard':
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 19V5m4 14V9m4 10v-6m4 6V12" />
        </svg>
      )
    case '/app/colaboradores':
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    case '/app/gestao/jornada-colaborador':
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    case '/app/usuarios':
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    case '/app/permissoes-por-papel':
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    case '/app/usuarios/trilha':
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      )
    case '/app/matrizes-operacao':
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 9h16M9 4v16" />
        </svg>
      )
    case '/app/minhas-atividades':
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      )
    case '/app/chamados':
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-4 4v-4z"
          />
        </svg>
      )
    case '/app/meu-trabalho':
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    case '/app/jornada':
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    case '/app/conta/alterar-senha':
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      )
    default:
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} aria-hidden>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 010 5.656l-3 3a4 4 0 01-5.656-5.656l1.5-1.5M10.172 13.828a4 4 0 010-5.656l3-3a4 4 0 015.656 5.656l-1.5 1.5" />
        </svg>
      )
  }
}

/**
 * Ativo: leitura de “rota atual” — painel alinhado ao conteúdo (borda + painel + fio ouro).
 * Inativo: lista legível, hover próximo a superfícies da app.
 */
function navLinkClass(active: boolean, rail: boolean) {
  return [
    'relative flex min-h-[2.875rem] items-center rounded-xl border text-[13px] leading-snug tracking-tight transition-[color,background-color,border-color,box-shadow,width] duration-200 ease-out',
    rail
      ? 'justify-start px-3.5 py-2.5 md:justify-center md:px-2 md:py-2.5'
      : 'px-3.5 py-2.5',
    active
      ? 'border-white/[0.12] bg-sgp-app-panel-deep/95 font-semibold text-slate-50 ring-1 ring-sgp-gold/25 shadow-[inset_3px_0_0_0_var(--semantic-sgp-gold),inset_0_1px_0_0_rgba(255,255,255,0.06)]'
      : 'border-transparent text-slate-400 hover:border-white/[0.06] hover:bg-white/[0.04] hover:text-slate-200',
  ].join(' ')
}

function NavGroupLabel({
  id,
  children,
  rail,
}: {
  id: string
  children: ReactNode
  rail: boolean
}) {
  return (
    <p
      id={id}
      className={[
        'mb-2.5 px-2 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400',
        rail ? 'md:sr-only' : '',
      ].join(' ')}
    >
      {children}
    </p>
  )
}

function NavItemLink({
  item,
  onClose,
  rail,
}: {
  item: ShellNavItem
  onClose: () => void
  rail: boolean
}) {
  const location = useLocation()
  const { requestNavigateWithTransientGuard } = useShellFunction()

  function handleNavClick(e: MouseEvent<HTMLAnchorElement>) {
    onClose()
    if (!pathsWouldChangeForNavigation(location.pathname, item.to)) return
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    e.preventDefault()
    requestNavigateWithTransientGuard(item.to)
  }

  const labelNode =
    rail ? (
      <>
        <ShellNavRouteIcon route={item.to} className="hidden size-5 md:inline-flex" />
        <span className="inline md:sr-only">{item.label}</span>
      </>
    ) : (
      item.label
    )

  if (item.to === '/app/minhas-atividades') {
    const active =
      location.pathname.startsWith('/app/minhas-atividades') ||
      location.pathname.startsWith('/app/apontamento')
    return (
      <NavLink
        to={item.to}
        onClick={handleNavClick}
        title={item.label}
        className={() => navLinkClass(active, rail)}
      >
        {labelNode}
      </NavLink>
    )
  }

  return (
    <NavLink
      to={item.to}
      end={item.to === '/app/usuarios'}
      onClick={handleNavClick}
      title={item.label}
      className={({ isActive }) => navLinkClass(isActive, rail)}
    >
      {labelNode}
    </NavLink>
  )
}

export function AppSidebar({ open, onClose, collapsed, onToggleCollapsed }: Props) {
  const { can, canAny, user } = useAuth()

  const supportTicketsNav = isSupportTicketsEnabled()

  const navItemsFiltered = useMemo(
    () =>
      [
        ...filterShellNavItems(GESTAO_NAV_ITEMS, can, canAny),
        ...filterShellNavItems(COLABORADOR_NAV_ITEMS, can, canAny),
        ...filterShellNavItems(CONTA_NAV_ITEMS, can, canAny),
      ].filter((item) => !(item.requiresSupportTickets && !supportTicketsNav)),
    [can, canAny, user?.permissions, supportTicketsNav],
  )

  const sidebarGroups = useMemo(() => {
    return SIDEBAR_GROUP_ORDER.map((groupKey) => ({
      key: groupKey,
      label: SHELL_NAV_GROUP_LABEL[groupKey],
      items: navItemsFiltered.filter((i) => i.navGroup === groupKey),
    })).filter((g) => g.items.length > 0)
  }, [navItemsFiltered])

  const rail = collapsed

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-sgp-navy/55 backdrop-blur-[2px] transition-opacity md:hidden ${
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        aria-hidden={!open}
        onClick={onClose}
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex min-h-0 w-[18rem] max-w-[85vw] shrink-0 flex-col overflow-x-hidden overflow-y-hidden border-r border-white/[0.06] bg-gradient-to-b from-sgp-void via-[#060b14] to-sgp-navy-deep shadow-[10px_0_48px_-12px_rgba(0,0,0,0.6)] transition-[transform,width] duration-200 ease-out md:static md:z-0 md:h-full md:max-w-none md:translate-x-0 md:self-stretch md:shadow-none ${
          rail ? 'md:w-16' : 'md:w-[18rem]'
        } ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}
      >
        {/* Toggle — apenas desktop (collapse não se aplica ao drawer mobile). */}
        <div className="hidden shrink-0 flex-row items-center justify-end gap-2 px-3 pb-1 pt-4 md:flex md:px-2 md:pt-5">
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-expanded={!collapsed}
            aria-controls="app-sidebar-nav"
            title={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            className="rounded-xl border border-white/[0.08] bg-white/[0.04] p-2 text-slate-300 transition hover:border-sgp-gold/25 hover:bg-white/[0.07] hover:text-slate-50"
          >
            <span className="sr-only">
              {collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            </span>
            <svg
              className={`size-5 transition-transform duration-200 ease-out ${collapsed ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* Marca — mobile: sempre expandido; desktop: expandido ou compacto */}
        <div className="relative shrink-0 px-4 pb-2 pt-2 md:px-5 md:pb-2 md:pt-0">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sgp-gold/40 to-transparent"
            aria-hidden
          />
          {/* Bloco completo: drawer mobile + desktop não recolhido */}
          <div className={rail ? 'relative md:hidden' : 'relative'}>
            <div className="md:hidden">
              <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-sgp-app-panel-deep/45 shadow-inner ring-1 ring-white/[0.04]">
                <div
                  className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-sgp-blue-bright/[0.08] blur-2xl"
                  aria-hidden
                />
                <div className="relative px-4 pb-3 pt-3">
                  <div className="flex items-center gap-3">
                    <SgpMark className="size-10 shrink-0" />
                    <p className="font-heading text-[1.65rem] font-bold leading-none tracking-tight text-white">
                      SGP
                    </p>
                  </div>
                  <p className="mt-1.5 text-[11px] font-medium leading-relaxed text-slate-400">
                    Sistema de Gestão da Produção
                  </p>
                  <div className="mt-3 border-t border-white/[0.07] pt-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="size-1.5 shrink-0 rounded-full bg-sgp-gold shadow-[0_0_8px_rgba(201,162,39,0.35)]"
                        aria-hidden
                      />
                      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-sgp-gold-warm/90">
                        Família ARGOS
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="hidden md:block">
              <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-sgp-app-panel-deep/45 shadow-inner ring-1 ring-white/[0.04]">
                <div
                  className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full bg-sgp-blue-bright/[0.08] blur-2xl"
                  aria-hidden
                />
                <div className="relative px-4 pb-3 pt-3">
                  <div className="flex items-center gap-3">
                    <SgpMark className="size-10 shrink-0" />
                    <p className="font-heading text-[1.65rem] font-bold leading-none tracking-tight text-white">
                      SGP
                    </p>
                  </div>
                  <p className="mt-1.5 text-[11px] font-medium leading-relaxed text-slate-400">
                    Sistema de Gestão da Produção
                  </p>
                  <div className="mt-3 border-t border-white/[0.07] pt-3">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="size-1.5 shrink-0 rounded-full bg-sgp-gold shadow-[0_0_8px_rgba(201,162,39,0.35)]"
                        aria-hidden
                      />
                      <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-sgp-gold-warm/90">
                        Família ARGOS
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop rail: marca mínima */}
          {rail ? (
            <div className="hidden md:flex md:justify-center md:px-1 md:pb-2 md:pt-1">
              <div
                className="flex size-10 items-center justify-center rounded-xl border border-white/[0.1] bg-sgp-app-panel-deep/80 font-heading text-xs font-bold tracking-tight text-sgp-gold-warm shadow-inner ring-1 ring-white/[0.05]"
                title="SGP"
              >
                SG
              </div>
            </div>
          ) : null}
        </div>

        <nav
          id="app-sidebar-nav"
          className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-3 pb-4 pt-2 [scrollbar-width:thin] [scrollbar-color:rgba(100,116,139,0.35)_transparent] md:px-2 md:pb-5 md:pt-2"
          aria-label="Navegação principal"
        >
          {sidebarGroups.map((group, idx) => (
            <section
              key={group.key}
              aria-labelledby={`nav-group-${group.key}`}
              className={
                idx === 0
                  ? ''
                  : rail
                    ? 'mt-5 border-t border-white/[0.05] pt-4 md:mt-4 md:pt-3'
                    : 'mt-10 border-t border-white/[0.06] pt-2'
              }
            >
              <NavGroupLabel id={`nav-group-${group.key}`} rail={rail}>
                {group.label}
              </NavGroupLabel>
              <ul className="flex flex-col gap-1.5">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <NavItemLink item={item} onClose={onClose} rail={rail} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </nav>

        <footer className="shrink-0 border-t border-white/[0.06] bg-gradient-to-t from-black/20 to-transparent px-4 py-4 md:px-2">
          <p
            className={[
              'text-center text-[10px] leading-relaxed text-slate-500 md:text-left',
              rail ? 'md:hidden' : '',
            ].join(' ')}
          >
            <span className="font-medium text-slate-400">ARGOS</span>
            <span className="text-slate-600"> · </span>
            <span className="text-slate-500">Plataforma industrial</span>
          </p>
          {rail ? (
            <p className="hidden text-center md:block">
              <span
                className="inline-flex min-h-[2.5rem] min-w-[2.5rem] items-center justify-center rounded-lg border border-white/[0.06] px-1 font-heading text-[10px] font-bold text-slate-500"
                title="ARGOS · plataforma industrial"
              >
                AR
              </span>
            </p>
          ) : null}
        </footer>
      </aside>
    </>
  )
}
