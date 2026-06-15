import type { OperationalBucket } from '../../lib/backlog/operationalBuckets'
import { OPERATIONAL_BUCKET_LABELS } from '../../lib/backlog/operationalBuckets'

const styles: Record<OperationalBucket, string> = {
  em_elaboracao:
    'border-white/14 bg-white/[0.07] text-slate-300 ring-1 ring-white/[0.06]',
  aguardando_planejamento:
    'border-amber-400/45 bg-amber-500/18 text-amber-50 ring-1 ring-amber-500/18',
  em_planejamento:
    'border-violet-400/40 bg-violet-500/14 text-violet-100 ring-1 ring-violet-500/20',
  em_execucao:
    'border-sgp-blue-bright/50 bg-sgp-blue/28 text-sky-100 ring-1 ring-sgp-blue/22',
  em_atraso:
    'border-rose-400/45 bg-rose-500/16 text-rose-50 ring-1 ring-rose-500/20',
  finalizadas:
    'border-emerald-400/45 bg-emerald-500/16 text-emerald-50 ring-1 ring-emerald-500/18',
  canceladas:
    'border-rose-400/40 bg-rose-500/14 text-rose-100 ring-1 ring-rose-500/18',
}

type Props = {
  bucket: OperationalBucket
}

export function OperationalBucketBadge({ bucket }: Props) {
  return (
    <span
      className={`sgp-chip transition-colors duration-200 ${styles[bucket]}`}
    >
      {OPERATIONAL_BUCKET_LABELS[bucket]}
    </span>
  )
}
