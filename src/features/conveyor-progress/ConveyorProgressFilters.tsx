import type { ReactNode } from 'react'
import { CONVEYOR_OPERATIONAL_STATUS_LABELS } from '../../domain/conveyors/conveyorOperationalStatus'
import type { ConveyorOperationalStatus } from '../../domain/conveyors/conveyor.types'

export type ConveyorProgressFiltersState = {
  search: string
  operationalStatus: string
  timeEntryFrom: string
  timeEntryTo: string
  collaboratorId: string
  onlyExceeded: boolean
}

export const EMPTY_CONVEYOR_PROGRESS_FILTERS: ConveyorProgressFiltersState = {
  search: '',
  operationalStatus: '',
  timeEntryFrom: '',
  timeEntryTo: '',
  collaboratorId: '',
  onlyExceeded: false,
}

type CollaboratorOption = { id: string; label: string }

type Props = {
  filters: ConveyorProgressFiltersState
  onChange: (next: ConveyorProgressFiltersState) => void
  collaboratorOptions: CollaboratorOption[]
  collaboratorsLoading?: boolean
  advancedOpen: boolean
  onToggleAdvanced: () => void
  onGeneratePdf: () => void
  pdfDisabled: boolean
  pdfLoading: boolean
  selectionHint?: string
}

export function ConveyorProgressFilters({
  filters,
  onChange,
  collaboratorOptions,
  collaboratorsLoading,
  advancedOpen,
  onToggleAdvanced,
  onGeneratePdf,
  pdfDisabled,
  pdfLoading,
  selectionHint,
}: Props) {
  const patch = (partial: Partial<ConveyorProgressFiltersState>) =>
    onChange({ ...filters, ...partial })

  const periodLabel = formatPeriodLabel(filters.timeEntryFrom, filters.timeEntryTo)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200/90 bg-white px-4 py-3 shadow-sm">
        <FilterField label="Período" className="min-w-[10rem]">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <input
              type="date"
              className="conveyor-progress-filter-input w-full min-w-[7rem]"
              value={filters.timeEntryFrom}
              onChange={(e) => patch({ timeEntryFrom: e.target.value })}
              aria-label="Apontamentos a partir de"
            />
            <span className="text-slate-400">–</span>
            <input
              type="date"
              className="conveyor-progress-filter-input w-full min-w-[7rem]"
              value={filters.timeEntryTo}
              onChange={(e) => patch({ timeEntryTo: e.target.value })}
              aria-label="Apontamentos até"
            />
          </div>
          {periodLabel ? (
            <span className="mt-0.5 block text-[10px] text-slate-400">{periodLabel}</span>
          ) : null}
        </FilterField>

        <FilterField label="Esteira" className="min-w-[9rem] flex-1">
          <input
            type="search"
            className="conveyor-progress-filter-input w-full"
            value={filters.search}
            onChange={(e) => patch({ search: e.target.value })}
            placeholder="Buscar…"
          />
        </FilterField>

        <FilterField label="Status" className="min-w-[9rem]">
          <select
            className="conveyor-progress-filter-input w-full"
            value={filters.operationalStatus}
            onChange={(e) => patch({ operationalStatus: e.target.value })}
          >
            <option value="">Todos</option>
            {(Object.keys(CONVEYOR_OPERATIONAL_STATUS_LABELS) as ConveyorOperationalStatus[]).map(
              (key) => (
                <option key={key} value={key}>
                  {CONVEYOR_OPERATIONAL_STATUS_LABELS[key]}
                </option>
              ),
            )}
          </select>
        </FilterField>

        <FilterField label="Agrupar por" className="min-w-[8rem]">
          <select className="conveyor-progress-filter-input w-full" disabled value="hierarchy">
            <option value="hierarchy">Hierarquia</option>
          </select>
        </FilterField>

        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          onClick={onToggleAdvanced}
          aria-expanded={advancedOpen}
        >
          <span aria-hidden>▾</span> Filtros
        </button>

        <div className="ml-auto flex flex-col items-end gap-1">
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={pdfDisabled || pdfLoading}
            onClick={onGeneratePdf}
          >
            {pdfLoading ? 'Gerando PDF…' : 'Gerar PDF'}
          </button>
          {selectionHint ? (
            <span className="text-[11px] text-slate-500">{selectionHint}</span>
          ) : null}
        </div>
      </div>

      {advancedOpen ? (
        <div className="grid gap-4 rounded-xl border border-slate-200/80 bg-white px-4 py-4 shadow-sm md:grid-cols-2 lg:grid-cols-3">
          <FilterField label="Colaborador">
            <select
              className="conveyor-progress-filter-input w-full"
              value={filters.collaboratorId}
              onChange={(e) => patch({ collaboratorId: e.target.value })}
              disabled={collaboratorsLoading}
            >
              <option value="">Todos</option>
              {collaboratorOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </FilterField>

          <label className="flex items-center gap-2 self-end pb-2">
            <input
              type="checkbox"
              className="size-4 rounded border-slate-300 accent-amber-500"
              checked={filters.onlyExceeded}
              onChange={(e) => patch({ onlyExceeded: e.target.checked })}
            />
            <span className="text-sm text-slate-700">Somente com tempo excedido</span>
          </label>
        </div>
      ) : null}
    </div>
  )
}

function FilterField({
  label,
  children,
  className = '',
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={`block space-y-1 ${className}`}>
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      {children}
    </label>
  )
}

function formatPeriodLabel(from: string, to: string): string | null {
  if (!from && !to) return null
  const fmt = (d: string) => {
    try {
      return new Intl.DateTimeFormat('pt-BR').format(new Date(`${d}T12:00:00`))
    } catch {
      return d
    }
  }
  if (from && to) return `${fmt(from)} – ${fmt(to)}`
  if (from) return `A partir de ${fmt(from)}`
  return `Até ${fmt(to)}`
}

export function filtersToApiParams(filters: ConveyorProgressFiltersState) {
  const toIsoStart = (date: string) =>
    date ? new Date(`${date}T00:00:00`).toISOString() : undefined
  const toIsoEnd = (date: string) =>
    date ? new Date(`${date}T23:59:59.999`).toISOString() : undefined

  return {
    search: filters.search.trim() || undefined,
    operationalStatus: filters.operationalStatus || undefined,
    timeEntryFrom: toIsoStart(filters.timeEntryFrom),
    timeEntryTo: toIsoEnd(filters.timeEntryTo),
    collaboratorId: filters.collaboratorId || undefined,
    onlyExceeded: filters.onlyExceeded || undefined,
  }
}
