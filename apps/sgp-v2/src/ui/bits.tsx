import type { StepState } from '../domain/conveyors'

export function ProgressBar({ pct, tone = 'ok' }: { pct: number | null; tone?: 'ok' | 'late' | 'stop' }) {
  const color = tone === 'stop' ? 'bg-danger' : tone === 'late' ? 'bg-late' : 'bg-ok'
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={pct ?? undefined} aria-valuemin={0} aria-valuemax={100}>
      {pct === null ? <div className="h-full w-1/3 animate-pulse bg-muted/30" /> : <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />}
    </div>
  )
}

const TAG_TONE = {
  ok: 'bg-ok text-white',
  late: 'bg-late text-white',
  stop: 'bg-danger text-white',
  neutral: 'bg-white text-ink border border-ink',
}

export function Tag({ tone, children }: { tone: keyof typeof TAG_TONE; children: string }) {
  return <span className={`shrink-0 rounded-lg px-2 py-0.5 text-sm font-bold ${TAG_TONE[tone]}`}>{children}</span>
}

const DOT: Record<StepState, string> = {
  feito: 'bg-ok',
  andando: 'bg-accent ring-2 ring-ink',
  parado: 'bg-danger',
  interrompido: 'bg-muted',
  falta: 'bg-white ring-2 ring-muted',
}

export function StepDot({ state }: { state: StepState }) {
  return <span aria-hidden="true" className={`mt-1.5 size-3.5 shrink-0 rounded-full ${DOT[state]}`} />
}

export function RefreshButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="Atualizar" className="flex size-12 items-center justify-center card">
      <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5" />
      </svg>
    </button>
  )
}
