import { useState } from 'react'
import {
  ACTIVITY_TICKET_PRINT_SUPPORT_MESSAGE,
  ACTIVITY_TICKET_SILENT_PRINT_HINT,
} from './activityTicketPrintCopy'
import { ThermalPrintAgentControls } from './ThermalPrintAgentControls'
import type { PrintAgentUiStatus } from './ThermalPrintAgentControls'
import type { ActivityTicketPrintGroupingMode } from './activityTicketPrintGrouping'

export type ConveyorActivityTicketsPrintDialogOptions = {
  grouping: ActivityTicketPrintGroupingMode
  includeCompleted: boolean
}

type ConveyorActivityTicketsPrintDialogProps = {
  open: boolean
  printableCount: number
  totalCount: number
  agentStatus: PrintAgentUiStatus
  agentFallbackNotice: string | null
  testPrintLoading?: boolean
  onClose: () => void
  onPrint: (options: ConveyorActivityTicketsPrintDialogOptions) => void
  onDismissAgentNotice?: () => void
  onTestThermalPrinter?: () => void
}

const GROUPING_OPTIONS: Array<{ value: ActivityTicketPrintGroupingMode; label: string }> = [
  { value: 'structure', label: 'Estrutura da esteira' },
  { value: 'task', label: 'Tarefa' },
  { value: 'responsible', label: 'Responsável' },
]

export function ConveyorActivityTicketsPrintDialog(
  props: ConveyorActivityTicketsPrintDialogProps,
) {
  const [grouping, setGrouping] = useState<ActivityTicketPrintGroupingMode>('structure')
  const [includeCompleted, setIncludeCompleted] = useState(false)

  if (!props.open) return null

  const canPrint = includeCompleted ? props.totalCount > 0 : props.printableCount > 0

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal
      aria-labelledby="conveyor-tickets-print-title"
      onClick={props.onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-white/[0.10] bg-sgp-app-panel-deep p-6 shadow-xl ring-1 ring-white/[0.06]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="conveyor-tickets-print-title"
          className="text-lg font-semibold text-slate-50"
        >
          Imprimir tickets da esteira
        </h2>

        <label className="mt-5 block text-[12px] text-slate-400">
          Agrupar por
          <select
            className="mt-1.5 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[13px] text-slate-100"
            value={grouping}
            onChange={(e) => setGrouping(e.target.value as ActivityTicketPrintGroupingMode)}
          >
            {GROUPING_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-[13px] text-slate-200">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={includeCompleted}
            onChange={(e) => setIncludeCompleted(e.target.checked)}
          />
          <span>Incluir atividades concluídas</span>
        </label>

        <p className="mt-3 text-[11px] text-slate-500">
          {includeCompleted
            ? `${props.totalCount} atividade(s) na estrutura.`
            : `${props.printableCount} atividade(s) elegíveis (${props.totalCount - props.printableCount} concluída(s) oculta(s) por padrão).`}
        </p>

        <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
          {ACTIVITY_TICKET_PRINT_SUPPORT_MESSAGE}
        </p>

        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
          {ACTIVITY_TICKET_SILENT_PRINT_HINT}
        </p>

        <ThermalPrintAgentControls
          compact
          agentStatus={props.agentStatus}
          fallbackNotice={props.agentFallbackNotice}
          onDismissFallback={props.onDismissAgentNotice}
          onTestPrint={props.onTestThermalPrinter}
          testLoading={props.testPrintLoading}
        />

        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="rounded-xl border border-white/[0.10] px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/[0.06]"
            onClick={props.onClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="rounded-xl border border-sgp-gold/35 bg-sgp-gold/10 px-4 py-2 text-sm font-bold text-sgp-gold-warm hover:bg-sgp-gold/[0.14] disabled:opacity-50"
            disabled={!canPrint}
            onClick={() =>
              props.onPrint({
                grouping,
                includeCompleted,
              })
            }
          >
            Imprimir
          </button>
        </div>
      </div>
    </div>
  )
}
