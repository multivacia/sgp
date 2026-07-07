import {
  PLAN_PUBLISHED_HELPER_TEXT,
  PLAN_UNPUBLISHED_CHANGES_BADGE,
  PUBLISH_BUTTON_LABEL,
  resolvePlanningPublishButtonTitle,
  resolvePlanningRevisionContext,
  resolvePlanningSaveButtonLabel,
  resolvePlanningSaveWeekDates,
  resolvePlanningStatusBadgeLabel,
} from '../../operational-planning/operationalPlanningPlanStatusCopy'
import {
  fridayAfterMonday,
  shiftWeek,
} from '../../operational-planning/operationalPlanningWeekRange'
import type { OperationalPlanningWeekPayload } from '../../../domain/operational-planning/operational-planning.types'
import { PlanningWeekTicketsPrintButton } from '../../operational-tickets/PlanningWeekTicketsPrintButton'
import { isWeeklyAgendaPublishDisabled } from '../weeklyAgendaPublish'

type WeeklyAgendaHeaderProps = {
  weekMonday: string
  weekPayload: OperationalPlanningWeekPayload | null
  loading: boolean
  busy: boolean
  dirty: boolean
  draftItemsCount: number
  onWeekChange: (nextMonday: string) => void
  onSaveDraft: () => void
  onPublish: () => void
  weekTicketPrintCount: number
  weekTicketPrintDisabled: boolean
  onOpenWeekTicketPrint: () => void
  successMsg?: string | null
  errorMsg?: string | null
  /** Durante arraste: oculta avisos secundários para não competir com o banner de colocação. */
  suppressSecondaryHints?: boolean
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
  const revisionContext = resolvePlanningRevisionContext(props.weekPayload)
  const publishDisabled = isWeeklyAgendaPublishDisabled({
    busy: props.busy,
    dirty: props.dirty,
    draftItemsCount: props.draftItemsCount,
    hasPlan: Boolean(props.weekPayload?.plan),
    planStatus,
  })

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
            disabled={props.loading || props.busy}
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
            disabled={props.loading || props.busy}
            aria-label="Próxima semana"
          >
            ›
          </button>
        </div>

        <span
          data-testid="weekly-agenda-plan-status"
          className={[
            'inline-flex shrink-0 rounded-full border px-3 py-1 text-[12px]',
            planStatus === 'PUBLISHED'
              ? 'border-emerald-400/25 bg-emerald-500/10 text-emerald-100'
              : revisionContext.hasUnpublishedRevision
                ? 'border-amber-400/25 bg-amber-500/10 text-amber-100'
                : 'border-white/[0.08] bg-white/[0.04] text-slate-300',
          ].join(' ')}
        >
          {resolvePlanningStatusBadgeLabel(revisionContext)}
        </span>
        {revisionContext.hasUnpublishedRevision ? (
          <span className="inline-flex shrink-0 rounded-full border border-amber-400/20 bg-amber-500/5 px-3 py-1 text-[12px] text-amber-100/90">
            {PLAN_UNPUBLISHED_CHANGES_BADGE}
          </span>
        ) : null}

        {!props.weekPayload?.hasPlan ? (
          <span className="text-[12px] text-slate-500">Nenhum plano salvo nesta semana ainda.</span>
        ) : null}

        <PlanningWeekTicketsPrintButton
          testId="weekly-agenda-week-tickets-print"
          count={props.weekTicketPrintCount}
          disabled={props.weekTicketPrintDisabled}
          onClick={props.onOpenWeekTicketPrint}
        />

        <div className="flex flex-wrap gap-2 sm:ml-auto">
          <button
            type="button"
            data-testid="weekly-agenda-save-draft"
            className="rounded-xl border border-white/[0.12] bg-white/[0.06] px-4 py-2 text-[13px] font-medium text-slate-100 hover:bg-white/[0.09] disabled:opacity-50"
            onClick={props.onSaveDraft}
            disabled={props.busy || !props.dirty || !props.weekPayload}
          >
            {resolvePlanningSaveButtonLabel(planStatus)}
          </button>
          <button
            type="button"
            data-testid="weekly-agenda-publish"
            className="rounded-xl border border-sgp-gold/35 bg-sgp-gold/15 px-4 py-2 text-[13px] font-medium text-slate-50 hover:bg-sgp-gold/25 disabled:opacity-50"
            title={resolvePlanningPublishButtonTitle({
              planStatus,
              draftItemsCount: props.draftItemsCount,
            })}
            onClick={props.onPublish}
            disabled={publishDisabled}
          >
            {PUBLISH_BUTTON_LABEL}
          </button>
        </div>
      </div>

      {!props.suppressSecondaryHints &&
      (revisionContext.hasActivePublished || planStatus === 'PUBLISHED') ? (
        <p className="max-w-3xl text-[13px] leading-relaxed text-slate-400">{PLAN_PUBLISHED_HELPER_TEXT}</p>
      ) : null}

      {!props.suppressSecondaryHints && props.dirty ? (
        <p className="text-[12px] text-amber-200/80" data-testid="weekly-agenda-dirty-hint">
          Alterações não salvas — use &quot;Salvar rascunho&quot; antes de publicar.
        </p>
      ) : null}

      {!props.suppressSecondaryHints && (props.successMsg || props.errorMsg) ? (
        <div className="space-y-3 border-t border-white/[0.06] pt-4">
          {props.successMsg ? (
            <p
              role="status"
              aria-live="polite"
              data-testid="weekly-agenda-success-msg"
              className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 px-3 py-2 text-[13px] text-emerald-100"
            >
              {props.successMsg}
            </p>
          ) : null}
          {props.errorMsg ? (
            <p
              role="alert"
              data-testid="weekly-agenda-error-msg"
              className="rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-[13px] text-rose-100"
            >
              {props.errorMsg}
            </p>
          ) : null}
        </div>
      ) : null}
    </header>
  )
}
