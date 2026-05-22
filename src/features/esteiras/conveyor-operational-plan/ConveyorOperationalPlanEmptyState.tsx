import type { ConveyorOperationalStatus } from '../../../domain/conveyors/conveyor.types'
import {
  canCreateConveyorOperationalPlan,
  CONVEYOR_PLAN_EMPTY_STATE_HINT,
  CONVEYOR_PLAN_EMPTY_STATE_MESSAGE,
} from '../../../domain/conveyor-operational-plan/conveyorOperationalPlanDisplay'

type Props = {
  canEdit: boolean
  operationalStatus: ConveyorOperationalStatus
  busy: boolean
  onCreate: () => void
}

export function ConveyorOperationalPlanEmptyState({
  canEdit,
  operationalStatus,
  busy,
  onCreate,
}: Props) {
  const allowed = canCreateConveyorOperationalPlan(operationalStatus)

  return (
    <article className="rounded-xl border border-dashed border-white/[0.12] bg-white/[0.02] px-4 py-6">
      <h2 className="text-base font-semibold text-slate-100">Plano Operacional da Esteira</h2>
      <p className="mt-3 text-sm font-medium text-slate-200">{CONVEYOR_PLAN_EMPTY_STATE_MESSAGE}</p>
      <p className="mt-2 text-[13px] leading-relaxed text-slate-500">{CONVEYOR_PLAN_EMPTY_STATE_HINT}</p>
      {canEdit && allowed ? (
        <button
          type="button"
          disabled={busy}
          className="mt-4 rounded-xl border border-sgp-gold/35 bg-sgp-gold/15 px-4 py-2 text-[13px] font-medium text-slate-50 hover:bg-sgp-gold/25 disabled:opacity-50"
          onClick={onCreate}
        >
          Criar plano operacional
        </button>
      ) : (
        <p className="mt-3 text-[12px] text-slate-500">
          {canEdit
            ? 'Disponível quando a esteira estiver pronta para liberar ou em produção.'
            : 'Sem permissão para criar plano.'}
        </p>
      )}
    </article>
  )
}
