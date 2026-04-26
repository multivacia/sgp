import type { SupportTicketListParams, SupportTicketPeriodParam } from './support-list.types'

type Props = {
  value: SupportTicketListParams
  onChange: (next: SupportTicketListParams) => void
  onApply: () => void
  loading: boolean
}

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'OPEN', label: 'Aberto' },
  { value: 'IN_PROGRESS', label: 'Em progresso' },
  { value: 'RESOLVED', label: 'Resolvido' },
  { value: 'CLOSED', label: 'Fechado' },
]

const SEVERITY_OPTIONS: { value: string; label: string }[] = [
  { value: '', label: 'Todas' },
  { value: 'LOW', label: 'Baixa' },
  { value: 'MEDIUM', label: 'Média' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'CRITICAL', label: 'Crítica' },
]

const PERIOD_OPTIONS: { value: SupportTicketPeriodParam; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'today', label: 'Hoje' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
]

export function SupportTicketsFilters({ value, onChange, onApply, loading }: Props) {
  function patch(patch: Partial<SupportTicketListParams>) {
    onChange({ ...value, ...patch })
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/[0.08] bg-sgp-app-panel-deep/40 p-4 shadow-inner ring-1 ring-white/[0.04] md:flex-row md:flex-wrap md:items-end">
      <label className="flex min-w-[12rem] flex-1 flex-col gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        Busca (protocolo ou assunto)
        <input
          type="search"
          value={value.q ?? ''}
          onChange={(e) => patch({ q: e.target.value })}
          placeholder="Ex.: CHM- ou palavra-chave"
          className="rounded-xl border border-white/[0.1] bg-sgp-void/80 px-3 py-2 text-[13px] text-slate-100 placeholder:text-slate-600 focus:border-sgp-gold/40 focus:outline-none focus:ring-1 focus:ring-sgp-gold/25"
        />
      </label>
      <label className="flex min-w-[9rem] flex-col gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        Status
        <select
          value={value.status ?? ''}
          onChange={(e) => patch({ status: e.target.value || undefined })}
          className="rounded-xl border border-white/[0.1] bg-sgp-void/80 px-3 py-2 text-[13px] text-slate-100 focus:border-sgp-gold/40 focus:outline-none focus:ring-1 focus:ring-sgp-gold/25"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value || 'all'} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-w-[8rem] flex-col gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        Categoria
        <input
          type="text"
          value={value.category ?? ''}
          onChange={(e) => patch({ category: e.target.value })}
          placeholder="Código exato"
          className="rounded-xl border border-white/[0.1] bg-sgp-void/80 px-3 py-2 text-[13px] text-slate-100 placeholder:text-slate-600 focus:border-sgp-gold/40 focus:outline-none focus:ring-1 focus:ring-sgp-gold/25"
        />
      </label>
      <label className="flex min-w-[9rem] flex-col gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        Severidade
        <select
          value={value.severity ?? ''}
          onChange={(e) => patch({ severity: e.target.value || undefined })}
          className="rounded-xl border border-white/[0.1] bg-sgp-void/80 px-3 py-2 text-[13px] text-slate-100 focus:border-sgp-gold/40 focus:outline-none focus:ring-1 focus:ring-sgp-gold/25"
        >
          {SEVERITY_OPTIONS.map((o) => (
            <option key={o.value || 'all'} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-w-[9rem] flex-col gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        Período (criação)
        <select
          value={value.period ?? 'all'}
          onChange={(e) => patch({ period: e.target.value as SupportTicketPeriodParam })}
          className="rounded-xl border border-white/[0.1] bg-sgp-void/80 px-3 py-2 text-[13px] text-slate-100 focus:border-sgp-gold/40 focus:outline-none focus:ring-1 focus:ring-sgp-gold/25"
        >
          {PERIOD_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <div className="flex shrink-0 items-center gap-2 md:pb-0.5">
        <button
          type="button"
          onClick={onApply}
          disabled={loading}
          className="rounded-xl border border-sgp-gold/35 bg-sgp-gold/15 px-4 py-2 text-[13px] font-semibold text-sgp-gold-warm shadow-sm transition hover:bg-sgp-gold/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Aplicar filtros
        </button>
      </div>
    </div>
  )
}
