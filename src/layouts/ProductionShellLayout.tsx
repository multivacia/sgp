import { Outlet, useMatch } from 'react-router-dom'
import { useProductionAuth } from '../lib/use-production-auth'
import { AppVersionStamp } from '../components/AppVersionStamp'

/**
 * Shell exclusivo do Modo Fábrica.
 * Não importa AppShellLayout, AppSidebar, nem RequirePermission.
 * Touch-friendly: botões grandes, espaçamento confortável para tablet Android.
 */
export function ProductionShellLayout() {
  const isInProtectedArea = useMatch('/app/producao/app/*')
  const isChangePin = useMatch('/app/producao/change-pin')
  const { collaborator, isAuthenticated, logout, isLoading } =
    useProductionAuth()

  const showCollaborator = Boolean(
    (isInProtectedArea || isChangePin) && isAuthenticated && collaborator,
  )

  return (
    <div
      data-sgp-surface="production"
      className="flex min-h-dvh flex-col bg-sgp-void text-slate-100"
    >
      <header className="sticky top-0 z-10 border-b border-white/10 bg-sgp-night/90 px-4 py-3 backdrop-blur-sm sm:px-6">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-4">
          <div className="flex min-w-0 flex-col">
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-sgp-gold">
              SGP+ Produção
            </span>
            <AppVersionStamp placement="header" className="mt-1 self-start" />
            {showCollaborator ? (
              <span className="mt-0.5 truncate text-base font-semibold text-white">
                {collaborator!.fullName}
              </span>
            ) : null}
          </div>

          {showCollaborator ? (
            <button
              type="button"
              onClick={() => void logout()}
              disabled={isLoading}
              className="sgp-cta-secondary min-h-12 shrink-0 px-6 text-base disabled:opacity-50"
            >
              Sair
            </button>
          ) : null}
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  )
}
