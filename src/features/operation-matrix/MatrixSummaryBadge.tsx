import { memo } from 'react'
import type { TaskTreeAggregate } from './treeAggregates'

type Props = {
  aggregate: TaskTreeAggregate
  /** Destaque visual: 'ok' | 'warn' (ex.: sem responsável na subárvore) */
  variant?: 'neutral' | 'warn'
  className?: string
}

export const MatrixSummaryBadge = memo(function MatrixSummaryBadge({
  aggregate,
  variant = 'neutral',
  className = '',
}: Props) {
  const base =
    variant === 'warn'
      ? 'border-amber-500/35 bg-amber-500/10 text-amber-100/90'
      : 'border-white/[0.1] bg-white/[0.04] text-slate-300'
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2 py-0.5 text-[10px] font-medium tabular-nums ${base} ${className}`}
    >
      <span title="Setores">{aggregate.sectorsCount} set.</span>
      <span className="text-white/15" aria-hidden>
        ·
      </span>
      <span title="Atividades">{aggregate.activitiesCount} ativ.</span>
      <span className="text-white/15" aria-hidden>
        ·
      </span>
      <span title="Minutos totais">{aggregate.totalMinutes} min</span>
    </span>
  )
})
