import { COLABS_PAGE_SIZE_OPTIONS } from '../../lib/admin/collaboratorsListUrlState'
import { backlogFiltersSituationLine } from '../../lib/backlog/backlogCopy'
import type { BacklogSituationFilterValue } from '../../lib/backlog/backlogUrlParams'

type Props = {
  search: string
  onSearchChange: (v: string) => void
  statusFilter: BacklogSituationFilterValue
  onStatusChange: (v: string) => void
  priorityFilter: string
  onPriorityChange: (v: string) => void
  responsibleFilter: string
  onResponsibleChange: (v: string) => void
  /** Quando vazio, só “Todos” (ex.: lista ainda sem responsáveis). */
  responsibleOptions: string[]
  pageSize: number
  onPageSizeChange: (size: number) => void
}

export function BacklogFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  priorityFilter,
  onPriorityChange,
  responsibleFilter,
  onResponsibleChange,
  responsibleOptions,
  pageSize,
  onPageSizeChange,
}: Props) {
  return (
    <>
      <div className="sgp-panel sgp-panel-hover flex flex-col gap-3 !p-4 md:flex-row md:flex-wrap md:items-end">
        <div className="min-w-0 flex-1 md:min-w-[200px]">
          <label
            htmlFor="backlog-search"
            className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400"
          >
            Buscar
          </label>
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              id="backlog-search"
              type="search"
              placeholder="OS, nome ou cliente…"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="sgp-input-app w-full py-2 pl-10 pr-3 text-sm"
            />
          </div>
        </div>

        <div className="w-full min-w-[140px] md:w-auto">
          <label
            htmlFor="backlog-status"
            className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400"
          >
            Situação
          </label>
          <select
            id="backlog-status"
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className="sgp-input-app w-full rounded-lg py-2 pl-3 pr-8 text-sm"
          >
            <option value="">Todas</option>
            <option value="ativas">Ativas</option>
            <option value="no_backlog">No backlog</option>
            <option value="em_revisao">Em revisão</option>
            <option value="em_andamento">Em andamento</option>
            <option value="em_atraso">Em atraso</option>
            <option value="concluidas">Concluídas</option>
          </select>
        </div>

        <div className="w-full min-w-[130px] md:w-auto">
          <label
            htmlFor="backlog-priority"
            className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400"
          >
            Prioridade
          </label>
          <select
            id="backlog-priority"
            value={priorityFilter}
            onChange={(e) => onPriorityChange(e.target.value)}
            className="sgp-input-app w-full rounded-lg py-2 pl-3 pr-8 text-sm"
          >
            <option value="">Todas</option>
            <option value="alta">Alta</option>
            <option value="media">Média</option>
            <option value="baixa">Baixa</option>
          </select>
        </div>

        <div className="w-full min-w-[160px] md:w-auto">
          <label
            htmlFor="backlog-resp"
            className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400"
          >
            Responsável
          </label>
          <select
            id="backlog-resp"
            value={responsibleFilter}
            onChange={(e) => onResponsibleChange(e.target.value)}
            className="sgp-input-app w-full rounded-lg py-2 pl-3 pr-8 text-sm"
          >
            <option value="">Todos</option>
            {responsibleOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <label className="flex min-w-[9rem] flex-col gap-1 text-xs">
          <span className="font-semibold uppercase tracking-wider text-slate-500">
            Por página
          </span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="sgp-input-app rounded-lg border border-white/10 bg-sgp-void/80 px-3 py-2 text-sm text-slate-200"
          >
            {COLABS_PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <div className="flex w-full md:ml-auto md:w-auto">
          <button
            type="button"
            disabled
            title="Funcionalidade em desenvolvimento"
            className="w-full cursor-not-allowed rounded-lg border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-semibold text-slate-500 shadow-sm md:w-auto"
          >
            Mais filtros (em breve)
          </button>
        </div>
      </div>
      <p className="mt-2 max-w-3xl text-[11px] leading-snug text-slate-500">
        {backlogFiltersSituationLine(statusFilter)}
      </p>
    </>
  )
}
