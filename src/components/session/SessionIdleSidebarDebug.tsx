import { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { shouldShowSessionIdleWarning } from '../../features/admin/system-settings/systemSettingsValidation'
import { useAuth } from '../../lib/use-auth'
import { isAdministrativeSessionPath } from '../../lib/session/adminSessionActivityCoordinator'

function formatClock(iso: string) {
  const parsed = Date.parse(iso)
  if (!Number.isFinite(parsed)) return iso
  return new Date(parsed).toLocaleTimeString('pt-BR')
}

function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

/** Painel temporário de homologação — remover após validar inatividade da sessão. */
export function SessionIdleSidebarDebug({ rail }: { rail: boolean }) {
  const location = useLocation()
  const {
    user,
    sessionIdle,
    hasLocalActivitySinceLastServerSync,
    isSessionRefreshInFlight,
  } = useAuth()
  const [nowMs, setNowMs] = useState(() => Date.now())

  const coordinatorEnabled =
    !!user &&
    !!sessionIdle &&
    isAdministrativeSessionPath(location.pathname)

  useEffect(() => {
    if (!user || !sessionIdle) return
    const tick = () => setNowMs(Date.now())
    tick()
    const interval = window.setInterval(tick, 1000)
    return () => window.clearInterval(interval)
  }, [sessionIdle, user])

  const remainingMs = useMemo(() => {
    if (!sessionIdle) return 0
    return Date.parse(sessionIdle.idleExpiresAt) - nowMs
  }, [nowMs, sessionIdle])

  const withinWarningWindow =
    !!sessionIdle &&
    shouldShowSessionIdleWarning(remainingMs, sessionIdle.idleWarningMinutes)

  if (rail) return null

  const rows: Array<{ label: string; value: string }> = sessionIdle
    ? [
        { label: 'timeout (min)', value: String(sessionIdle.idleTimeoutMinutes) },
        { label: 'aviso (min)', value: String(sessionIdle.idleWarningMinutes) },
        { label: 'última atividade', value: formatClock(sessionIdle.lastActivityAt) },
        { label: 'expira em', value: formatClock(sessionIdle.idleExpiresAt) },
        { label: 'restante', value: formatDuration(remainingMs) },
        { label: 'janela aviso', value: withinWarningWindow ? 'sim' : 'não' },
        { label: 'atividade local', value: hasLocalActivitySinceLastServerSync ? 'sim' : 'não' },
        { label: 'refresh em voo', value: isSessionRefreshInFlight ? 'sim' : 'não' },
        { label: 'coordenador', value: coordinatorEnabled ? 'ativo' : 'inativo' },
      ]
    : [{ label: 'sessão', value: user ? 'sem sessionIdle' : 'deslogado' }]

  return (
    <div
      data-session-idle-debug=""
      className="mx-3 mb-2 rounded-xl border border-amber-400/35 bg-amber-500/10 px-3 py-2 text-[10px] leading-relaxed text-amber-100 md:mx-2"
    >
      <p className="mb-1.5 font-bold uppercase tracking-[0.12em] text-amber-300">
        Debug inatividade (temp.)
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 font-mono">
        {rows.map((row) => (
          <div key={row.label} className="contents">
            <dt className="text-amber-200/80">{row.label}</dt>
            <dd className="truncate text-right text-amber-50">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
