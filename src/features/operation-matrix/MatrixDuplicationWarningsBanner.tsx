import type { MatrixDuplicationWarning } from '../../domain/operation-matrix/operation-matrix.types'

type Props = {
  warnings: MatrixDuplicationWarning[]
  onDismiss?: () => void
}

/**
 * Avisos não bloqueantes após duplicar item/nó da Matriz (responsável não copiado).
 * Lista completa — nunca só o primeiro item — visível imediatamente, sem navegação
 * adicional. Estilo alinhado a `ConveyorOperationalPlanGenerationPreviewPanel.tsx`.
 */
export function MatrixDuplicationWarningsBanner({ warnings, onDismiss }: Props) {
  if (warnings.length === 0) return null
  return (
    <div
      role="status"
      aria-label="Avisos da duplicação"
      className="mt-4 rounded-xl border border-amber-400/30 bg-amber-500/[0.08] p-4"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-[13px] font-semibold text-amber-50">
          Duplicação concluída com {warnings.length === 1 ? 'um aviso' : `${warnings.length} avisos`}
        </p>
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="text-[11px] font-semibold text-amber-100/80 hover:text-amber-50"
          >
            Dispensar
          </button>
        ) : null}
      </div>
      <ul className="mt-2 space-y-1.5" aria-label="Alertas">
        {warnings.map((w, i) => (
          <li
            key={`${w.duplicatedActivityId}-${i}`}
            className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-100"
          >
            <span className="font-semibold">{w.activityName}:</span> {w.message}
          </li>
        ))}
      </ul>
    </div>
  )
}
