import type { ConveyorOperationalPlanGenerationPreview } from '../../../domain/conveyor-operational-plan/conveyor-operational-plan.types'
import {
  buildConveyorPlanGenerationImpactSections,
  formatConveyorPlanGenerationPreviewWarnings,
} from '../../../domain/conveyor-operational-plan/conveyorPlanGenerationPreviewDisplay'

type Props = {
  preview: ConveyorOperationalPlanGenerationPreview
  busy: boolean
  onConfirm: () => void
  onCancel: () => void
}

const TONE_CLASS = {
  neutral: 'border-white/12 bg-white/[0.04] text-slate-200',
  warning: 'border-amber-400/30 bg-amber-500/10 text-amber-50',
  info: 'border-sky-400/25 bg-sky-500/10 text-sky-100',
} as const

export function ConveyorOperationalPlanGenerationPreviewPanel({
  preview,
  busy,
  onConfirm,
  onCancel,
}: Props) {
  const sections = buildConveyorPlanGenerationImpactSections(preview)
  const warnings = formatConveyorPlanGenerationPreviewWarnings(preview.warnings)

  return (
    <aside className="space-y-4 rounded-xl border border-amber-400/30 bg-amber-500/[0.08] p-4">
      <header>
        <h4 className="text-[13px] font-semibold text-amber-50">Impacto da regeneração</h4>
        <p className="mt-1 text-[12px] text-amber-100/80">
          Confira o que será alterado antes de confirmar. Itens manuais e revisados serão
          substituídos.
        </p>
      </header>

      <ul className="space-y-3">
        {sections.map((section) => (
          <li
            key={section.id}
            className={`rounded-lg border px-3 py-2 ${TONE_CLASS[section.tone]}`}
          >
            <p className="text-[12px] font-semibold">{section.title}</p>
            <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-[12px] opacity-90">
              {section.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      {warnings.length > 0 ? (
        <ul className="space-y-1.5" aria-label="Alertas">
          {warnings.map((msg) => (
            <li
              key={msg}
              className="rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-100"
            >
              {msg}
            </li>
          ))}
        </ul>
      ) : null}

      <footer className="flex flex-wrap gap-2 border-t border-amber-400/20 pt-3">
        <button
          type="button"
          disabled={busy}
          className="rounded-lg border border-amber-300/40 bg-amber-400/20 px-3 py-2 text-[13px] font-medium text-amber-50 hover:bg-amber-400/30 disabled:opacity-50"
          onClick={onConfirm}
        >
          Confirmar regeneração
        </button>
        <button
          type="button"
          disabled={busy}
          className="rounded-lg border border-white/15 px-3 py-2 text-[13px] text-slate-200 hover:bg-white/[0.06] disabled:opacity-50"
          onClick={onCancel}
        >
          Cancelar
        </button>
      </footer>
    </aside>
  )
}
