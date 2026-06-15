import {
  PRINT_AGENT_AVAILABLE_LABEL,
  PRINT_AGENT_FALLBACK_NOTICE,
  PRINT_AGENT_UNAVAILABLE_LABEL,
} from './activityTicketPrintCopy'

export type PrintAgentUiStatus = 'checking' | 'available' | 'unavailable'

type ThermalPrintAgentControlsProps = {
  agentStatus: PrintAgentUiStatus
  fallbackNotice: string | null
  onDismissFallback?: () => void
  onTestPrint?: () => void
  testLoading?: boolean
  compact?: boolean
}

function statusLabel(status: PrintAgentUiStatus): string {
  if (status === 'checking') return 'Verificando agente local...'
  if (status === 'available') return PRINT_AGENT_AVAILABLE_LABEL
  return PRINT_AGENT_UNAVAILABLE_LABEL
}

function statusClass(status: PrintAgentUiStatus): string {
  if (status === 'available') return 'text-emerald-400'
  if (status === 'checking') return 'text-slate-400'
  return 'text-amber-400'
}

export function ThermalPrintAgentControls(props: ThermalPrintAgentControlsProps) {
  const { agentStatus, fallbackNotice, onDismissFallback, onTestPrint, testLoading, compact } =
    props

  return (
    <div className={compact ? 'space-y-2' : 'mt-3 space-y-2'}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`text-[11px] font-medium ${statusClass(agentStatus)}`}>
          {statusLabel(agentStatus)}
        </span>
        {onTestPrint ? (
          <button
            type="button"
            className="rounded-lg border border-white/[0.10] px-2.5 py-1 text-[11px] text-slate-300 hover:bg-white/[0.06] disabled:opacity-50"
            disabled={agentStatus !== 'available' || testLoading}
            onClick={onTestPrint}
          >
            {testLoading ? 'Testando...' : 'Testar impressora térmica'}
          </button>
        ) : null}
      </div>

      {fallbackNotice ? (
        <div className="flex flex-wrap items-start justify-between gap-2 rounded-xl border border-amber-500/25 bg-amber-500/10 px-3 py-2">
          <p className="text-[11px] leading-relaxed text-amber-100/90">{fallbackNotice}</p>
          {onDismissFallback ? (
            <button
              type="button"
              className="text-[11px] text-amber-200/80 hover:text-amber-50"
              onClick={onDismissFallback}
            >
              Fechar
            </button>
          ) : null}
        </div>
      ) : null}

      {agentStatus === 'unavailable' && !fallbackNotice ? (
        <p className="text-[10px] leading-relaxed text-slate-500">
          Sem o agente, tickets usam {PRINT_AGENT_FALLBACK_NOTICE.toLowerCase()}
        </p>
      ) : null}
    </div>
  )
}
