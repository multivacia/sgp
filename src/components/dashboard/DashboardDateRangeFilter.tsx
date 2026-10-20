import { useId, useState, type FormEvent } from 'react'
import {
  formatDashboardDateRange,
  isSameDashboardDateRange,
  validateDashboardDateRange,
  type DashboardDateRange,
} from '../../lib/dashboard/dashboardDateRange'

type Props = {
  /** Período aplicado (usado nas consultas). */
  value: DashboardDateRange
  /** Chamado só ao clicar em «Aplicar período» com um intervalo válido e diferente do aplicado. */
  onApply: (range: DashboardDateRange) => void
  /** Consulta em andamento — informativo; não bloqueia a edição. */
  refreshing?: boolean
}

const inputClass = [
  'mt-1 w-full min-w-0 rounded-lg border bg-sgp-app-panel-deep px-3 py-2 text-sm text-slate-200',
  'outline-none transition focus:ring-2 focus:ring-sgp-blue-bright/25 sm:w-[10.5rem]',
].join(' ')

/**
 * Filtro único de período do Dashboard (Operacional e Gerencial): Data inicial, Data final e
 * «Aplicar período». A edição não dispara consultas; só a aplicação altera o período.
 */
export function DashboardDateRangeFilter({ value, onApply, refreshing = false }: Props) {
  const id = useId()
  const [draft, setDraft] = useState<DashboardDateRange>(value)
  const [appliedSeen, setAppliedSeen] = useState<DashboardDateRange>(value)
  if (!isSameDashboardDateRange(appliedSeen, value)) {
    // Período aplicado mudou por fora (ex.: preferência salva): o rascunho acompanha.
    setAppliedSeen(value)
    setDraft(value)
  }

  const errors = validateDashboardDateRange(draft)
  const dirty = !isSameDashboardDateRange(draft, value)
  const canApply = !errors && dirty
  const startErrorId = `${id}-start-error`
  const endErrorId = `${id}-end-error`
  const rangeErrorId = `${id}-range-error`
  const startInvalid = Boolean(errors?.startDate || errors?.range)
  const endInvalid = Boolean(errors?.endDate || errors?.range)

  function submit(e: FormEvent) {
    e.preventDefault()
    if (canApply) onApply({ startDate: draft.startDate.trim(), endDate: draft.endDate.trim() })
  }

  const fieldBorder = (invalid: boolean) =>
    invalid ? 'border-rose-400/60' : 'border-white/10'

  return (
    <form
      onSubmit={submit}
      noValidate
      aria-label="Período de análise"
      data-testid="dashboard-date-range-filter"
      className="flex w-full flex-col gap-2 sm:w-auto"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-end">
          <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Data inicial
            <input
              type="date"
              lang="pt-BR"
              value={draft.startDate}
              onChange={(e) => setDraft((d) => ({ ...d, startDate: e.target.value }))}
              aria-invalid={startInvalid}
              aria-describedby={
                [errors?.startDate && startErrorId, errors?.range && rangeErrorId]
                  .filter(Boolean)
                  .join(' ') || undefined
              }
              className={`${inputClass} ${fieldBorder(startInvalid)}`}
            />
          </label>
          <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
            Data final
            <input
              type="date"
              lang="pt-BR"
              value={draft.endDate}
              onChange={(e) => setDraft((d) => ({ ...d, endDate: e.target.value }))}
              aria-invalid={endInvalid}
              aria-describedby={
                [errors?.endDate && endErrorId, errors?.range && rangeErrorId]
                  .filter(Boolean)
                  .join(' ') || undefined
              }
              className={`${inputClass} ${fieldBorder(endInvalid)}`}
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={!canApply}
          className="sgp-cta-primary !py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40"
        >
          Aplicar período
        </button>
      </div>
      <div className="text-[11px] leading-snug" aria-live="polite">
        {errors?.startDate ? (
          <p id={startErrorId} className="text-rose-300">
            {errors.startDate}
          </p>
        ) : null}
        {errors?.endDate ? (
          <p id={endErrorId} className="text-rose-300">
            {errors.endDate}
          </p>
        ) : null}
        {errors?.range ? (
          <p id={rangeErrorId} className="text-rose-300">
            {errors.range}
          </p>
        ) : null}
        {dirty && !errors ? (
          <p className="text-sky-200/90" data-testid="dashboard-draft-period">
            Novo período: {formatDashboardDateRange(draft)} · clique em «Aplicar período» para
            atualizar
          </p>
        ) : null}
        <p className="text-slate-500" data-testid="dashboard-applied-period">
          Período aplicado: {formatDashboardDateRange(value)}
          {refreshing ? ' · Atualizando…' : ''}
        </p>
      </div>
    </form>
  )
}
