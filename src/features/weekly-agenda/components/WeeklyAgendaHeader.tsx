import {
  PLAN_STATUS_DRAFT_LABEL,
  PLAN_STATUS_PUBLISHED_LABEL,
  resolvePlanningSaveWeekDates,
} from '../../operational-planning/operationalPlanningPlanStatusCopy'
import {
  fridayAfterMonday,
  shiftWeek,
} from '../../operational-planning/operationalPlanningWeekRange'
import type { OperationalPlanningWeekPayload } from '../../../domain/operational-planning/operational-planning.types'

type WeeklyAgendaHeaderProps = {
  weekMonday: string
  weekPayload: OperationalPlanningWeekPayload | null
  loading: boolean
  onWeekChange: (nextMonday: string) => void
}

export function WeeklyAgendaHeader(props: WeeklyAgendaHeaderProps) {
  const displayedWeekRange = (() => {
    if (props.weekPayload) {
      const dates = resolvePlanningSaveWeekDates(props.weekPayload)
      return { start: dates.weekStartDate, end: dates.weekEndDate }
    }
    return { start: props.weekMonday, end: fridayAfterMonday(props.weekMonday) }
  })()

  const planStatus = props.weekPayload?.plan?.status

  return (
    <header className="sgp-header-card space-y-5">
      <div className="max-w-3xl">
        <h1 className="sgp-page-title">Agenda da Semana</h1>
        <p className="sgp-page-lead mt-2">
          Distribua e acompanhe atividades por colaborador — visualização da semana operacional.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] px-2 py-1">
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-sm text-slate-300 hover:bg-white/[0.06] disabled:opacity-40"
            onClick={() => props.onWeekChange(shiftWeek(props.weekMonday, -1))}
            disabled={props.loading}
            aria-label="Semana anterior"
          >
            ‹
          </button>
          <span className="min-w-[13.5rem] whitespace-nowrap text-center text-[13px] tabular-nums text-slate-200 sm:min-w-[15rem]">
            {displayedWeekRange.start} → {displayedWeekRange.end}
          </span>
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-sm text-slate-300 hover:bg-white/[0.06] disabled:opacity-40"
            onClick={() => props.onWeekChange(shiftWeek(props.weekMonday, 1))}
            disabled={props.loading}
            aria-label="Próxima semana"
          >
            ›
          </button>
        </div>

        <span
          className={[
            'inline-flex shrink-0 rounded-full border px-3 py-1 text-[12px]',
            planStatus === 'PUBLISHED'
              ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100'
              : 'border-white/[0.08] bg-white/[0.04] text-slate-300',
          ].join(' ')}
        >
          {planStatus === 'PUBLISHED' ? PLAN_STATUS_PUBLISHED_LABEL : PLAN_STATUS_DRAFT_LABEL}
        </span>

        {!props.weekPayload?.hasPlan ? (
          <span className="text-[12px] text-slate-500">Nenhum plano salvo nesta semana ainda.</span>
        ) : null}
      </div>
    </header>
  )
}
