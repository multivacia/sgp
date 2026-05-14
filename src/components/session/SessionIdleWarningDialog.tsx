type Props = {
  open: boolean
  remainingSeconds: number
  onContinue: () => void
  onLogout: () => void
}

function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds)
  const minutes = Math.floor(safe / 60)
  const seconds = safe % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function SessionIdleWarningDialog({
  open,
  remainingSeconds,
  onContinue,
  onLogout,
}: Props) {
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal
      aria-labelledby="session-idle-warning-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-white/[0.1] bg-gradient-to-b from-sgp-app-panel/95 to-sgp-app-panel-deep/98 p-6 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.85)] ring-1 ring-white/[0.05]">
        <h2
          id="session-idle-warning-title"
          className="font-heading text-lg font-bold tracking-tight text-slate-50"
        >
          Sua sessão está prestes a expirar
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-slate-400">
          Por inatividade, sua sessão será encerrada em{' '}
          <span className="font-semibold text-slate-100">
            {formatCountdown(remainingSeconds)}
          </span>
          . Deseja continuar conectado?
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <button
            type="button"
            onClick={onLogout}
            className="rounded-xl border border-white/12 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-sgp-gold/30 hover:bg-white/[0.07]"
          >
            Sair agora
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="rounded-xl border border-sgp-gold/35 bg-sgp-gold/10 px-4 py-2.5 text-sm font-bold text-sgp-gold-warm shadow-inner transition hover:border-sgp-gold/50 hover:bg-sgp-gold/[0.14]"
          >
            Continuar conectado
          </button>
        </div>
      </div>
    </div>
  )
}
