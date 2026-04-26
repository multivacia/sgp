import type { DashboardOperacionalSerieItem } from '../../lib/dashboard-operacional-series'
import { somaSerie } from '../../lib/dashboard-operacional-series'
import { dashboardHints } from '../../lib/operationalSemantics'

type Props = {
  items: DashboardOperacionalSerieItem[]
  emptyMessage?: string
  /** Cor da barra: padrão azul operação; ouro para fila/backlog. */
  accent?:
    | 'entrada'
    | 'operacao'
    | 'responsaveis-atividades'
    | 'responsaveis-minutos'
  /** Quando definido, cada barra abre o backlog com o recorte do bucket (nova aba no handler). */
  onBarClick?: (bucketKey: string) => void
}

const ACCENT_BAR: Record<NonNullable<Props['accent']>, string> = {
  entrada: 'bg-gradient-to-r from-sgp-gold/90 to-sgp-navy',
  operacao: 'bg-gradient-to-r from-sgp-blue-bright to-sgp-navy',
  'responsaveis-atividades':
    'bg-gradient-to-r from-emerald-500/90 to-sgp-navy',
  'responsaveis-minutos': 'bg-gradient-to-r from-amber-500/85 to-sgp-navy',
}

export function DashboardOperacionalBarList({
  items,
  emptyMessage = 'Sem dados para este recorte.',
  accent = 'operacao',
  onBarClick,
}: Props) {
  const total = somaSerie(items)
  if (items.length === 0 || total === 0) {
    return (
      <p className="text-sm text-slate-500" role="status">
        {emptyMessage}
      </p>
    )
  }

  const max = Math.max(...items.map((i) => i.value), 1)
  const barClass = ACCENT_BAR[accent]

  const interactive = Boolean(onBarClick)

  return (
    <ul className="space-y-3" aria-label="Distribuição em barras">
      {items.map((item) => {
        const pct = (item.value / max) * 100
        const inner = (
          <>
            <div className="flex items-baseline justify-between gap-3 text-sm">
              <span
                className="min-w-0 flex-1 truncate text-slate-300"
                title={item.label}
              >
                {item.label}
              </span>
              <span className="shrink-0 font-heading font-bold tabular-nums text-slate-50">
                {item.value}
              </span>
            </div>
            <div
              className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/[0.06]"
              aria-hidden
            >
              <div
                className={`h-full rounded-full ${barClass}`}
                style={{ width: `${pct}%`, minWidth: item.value > 0 ? '2px' : 0 }}
              />
            </div>
          </>
        )
        return (
          <li key={item.key}>
            {interactive ? (
              <button
                type="button"
                onClick={() => onBarClick?.(item.key)}
                title={dashboardHints.drillBacklogSameBucket}
                aria-label={`${item.label}. ${dashboardHints.drillBacklogSameBucket}`}
                className="w-full rounded-lg border border-transparent px-1 py-1 text-left transition hover:border-sgp-gold/25 hover:bg-white/[0.04] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sgp-gold/40"
              >
                {inner}
              </button>
            ) : (
              inner
            )}
          </li>
        )
      })}
    </ul>
  )
}
