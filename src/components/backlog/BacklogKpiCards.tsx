import { backlogKpiHints } from '../../lib/backlog/backlogCopy'
import type { OperationalBucket } from '../../lib/backlog/operationalBuckets'
import type { OperationalPanelKpis } from '../../lib/backlog/operationalBuckets'

const items = (kpis: OperationalPanelKpis) => [
  {
    key: 'noBacklog' as const,
    label: 'No backlog',
    value: kpis.noBacklog,
    hint: backlogKpiHints.noBacklog,
  },
  {
    key: 'emRevisao' as const,
    label: 'Em revisão',
    value: kpis.emRevisao,
    hint: backlogKpiHints.emRevisao,
  },
  {
    key: 'emAndamento' as const,
    label: 'Em andamento',
    value: kpis.emAndamento,
    hint: backlogKpiHints.emAndamento,
  },
  {
    key: 'emAtraso' as const,
    label: 'Em atraso',
    value: kpis.emAtraso,
    hint: backlogKpiHints.emAtraso,
  },
  {
    key: 'concluidas' as const,
    label: 'Concluídas',
    value: kpis.concluidas,
    hint: backlogKpiHints.concluidas,
  },
]

type Props = {
  kpis: OperationalPanelKpis
  activeBucket?: OperationalBucket | null
  onBucketClick?: (bucket: OperationalBucket) => void
}

const bucketByKey: Record<
  ReturnType<typeof items>[number]['key'],
  OperationalBucket
> = {
  noBacklog: 'no_backlog',
  emRevisao: 'em_revisao',
  emAndamento: 'em_andamento',
  emAtraso: 'em_atraso',
  concluidas: 'concluidas',
}

export function BacklogKpiCards({ kpis, activeBucket = null, onBucketClick }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {items(kpis).map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onBucketClick?.(bucketByKey[item.key])}
          className={[
            'sgp-kpi-card group w-full text-left transition-transform duration-150',
            onBucketClick
              ? 'cursor-pointer hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-sgp-blue-bright/40'
              : 'cursor-default',
            activeBucket === bucketByKey[item.key]
              ? 'border-sgp-blue-bright/35 ring-1 ring-sgp-blue-bright/25'
              : '',
          ].join(' ')}
          aria-label={`Filtrar por ${item.label}`}
          aria-pressed={activeBucket === bucketByKey[item.key]}
        >
          <div
            className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gradient-to-br from-sgp-blue-bright/18 to-sgp-gold-warm/12 blur-2xl opacity-75 transition-opacity duration-300 group-hover:opacity-100"
            aria-hidden
          />
          <div
            className="absolute left-0 top-0 h-1 w-12 rounded-br-full bg-gradient-to-r from-sgp-gold to-sgp-gold-warm opacity-90"
            aria-hidden
          />
          <p className="relative text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
            {item.label}
          </p>
          <p className="relative mt-3 font-heading text-4xl font-bold tabular-nums tracking-tight text-slate-50">
            {item.value}
          </p>
          <p className="relative mt-2 text-xs leading-relaxed text-slate-500">
            {item.hint}
          </p>
        </button>
      ))}
    </div>
  )
}
