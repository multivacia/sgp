import { formatMinutesToHoursLabel } from '../../../domain/collaborator-health/collaboratorOperationalHealthDisplay'
import type { AppliedMatrixBlock } from './laboratorioEsteiras.types'
import { countStepsInBlock, sumMinutesInBlock } from './laboratorioEsteirasState'

type Props = {
  block: AppliedMatrixBlock
  onEdit: () => void
  onRemove: () => void
}

export function MountedMatrixBlock({ block, onEdit, onRemove }: Props) {
  const activityCount = countStepsInBlock(block)
  const totalMinutes = sumMinutesInBlock(block)

  return (
    <article className="rounded-2xl border border-white/[0.08] bg-[#0f1623] p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-black/30 text-xl" aria-hidden>
          🧩
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-heading text-sm font-bold text-sgp-gold">
            Matriz: {block.matrixName}
          </p>
          <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-400">
            <span className="rounded-full border border-white/[0.08] px-2 py-0.5 tabular-nums">
              {activityCount} {activityCount === 1 ? 'atividade' : 'atividades'}
            </span>
            <span className="rounded-full border border-white/[0.08] px-2 py-0.5 tabular-nums">
              {formatMinutesToHoursLabel(totalMinutes)}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-3">
        {block.options.flatMap((op) =>
          op.areas.map((ar) => (
            <div key={ar.key}>
              <p className="text-xs font-semibold text-slate-400">Setor: {ar.titulo}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {ar.steps.map((st) => (
                  <span
                    key={st.key}
                    className="inline-flex items-center rounded-full border border-white/[0.08] bg-black/30 px-2.5 py-1 text-[11px] text-slate-200"
                  >
                    {st.titulo}
                  </span>
                ))}
              </div>
            </div>
          )),
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 divide-x divide-white/[0.06] overflow-hidden rounded-xl border border-white/[0.06]">
        <button
          type="button"
          onClick={onEdit}
          className="flex min-h-11 items-center justify-center gap-1.5 py-2 text-xs font-semibold text-sgp-gold hover:bg-white/[0.03]"
        >
          <span aria-hidden>✎</span> Editar matriz
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="flex min-h-11 items-center justify-center gap-1.5 py-2 text-xs font-semibold text-rose-300 hover:bg-white/[0.03]"
        >
          <span aria-hidden>🗑</span> Remover
        </button>
      </div>
    </article>
  )
}
