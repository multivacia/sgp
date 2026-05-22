import { buildConveyorPlanReviewSummary } from '../../../domain/conveyor-operational-plan/conveyorPlanReviewDisplay'
import type { ConveyorOperationalPlanItem } from '../../../domain/conveyor-operational-plan/conveyor-operational-plan.types'

type Props = {
  items: ConveyorOperationalPlanItem[]
}

export function ConveyorOperationalPlanReviewSummary({ items }: Props) {
  const reviewSummary = buildConveyorPlanReviewSummary(items)

  if (reviewSummary.totalActive === 0) {
    return null
  }

  return (
    <section
      className="space-y-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4"
      aria-label="Resumo de revisao"
    >
      <h3 className="text-[13px] font-semibold text-slate-200">Resumo de revisão</h3>
      <dl className="grid gap-2 text-[13px] sm:grid-cols-3">
        <Stat label="Prontos" value={reviewSummary.readyCount} tone="ready" />
        <Stat label="Com revisão" value={reviewSummary.reviewCount} tone="review" />
        <Stat label="Total ativo" value={reviewSummary.totalActive} tone="neutral" />
      </dl>

      {reviewSummary.reviewCount > 0 ? (
        <aside className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[13px] text-amber-100">
          <p className="font-medium">Existem itens que precisam revisão antes de aprovar o plano.</p>
          {reviewSummary.reasonCounts.length > 0 ? (
            <ul className="mt-2 list-inside list-disc text-[12px] text-amber-100/90">
              {reviewSummary.reasonCounts.map((r) => (
                <li key={r.code}>
                  {r.count} {r.label}
                </li>
              ))}
            </ul>
          ) : null}
        </aside>
      ) : null}
    </section>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'ready' | 'review' | 'neutral'
}) {
  const valueClass =
    tone === 'ready'
      ? 'text-emerald-100'
      : tone === 'review'
        ? 'text-amber-100'
        : 'text-slate-100'

  return (
    <div>
      <dt className="text-[10px] uppercase text-slate-500">{label}</dt>
      <dd className={`font-medium ${valueClass}`}>{value}</dd>
    </div>
  )
}
