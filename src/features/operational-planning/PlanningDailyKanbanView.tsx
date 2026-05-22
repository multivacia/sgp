import { useMemo } from 'react'
import { formatPlanningMinutes } from './planningBoardHelpers'
import {
  buildPlanningDailyBoardColumns,
  resolvePlanningDailyBoardEmptyMessage,
  type PlanningDailySelectedDay,
} from './planningDailyBoard'
import {
  PlanningDailyPlanCard,
  type PlanningDailyPlanCardItem,
} from './PlanningDailyPlanCard'

type PlanningDailyBoardProps = {
  items: readonly PlanningDailyPlanCardItem[]
  weekdayDates: readonly string[]
  weekdayLabels: readonly string[]
  selectedDay: PlanningDailySelectedDay
  onSelectedDayChange: (day: PlanningDailySelectedDay) => void
  todayIso: string
  todayInDisplayedWeek: boolean
  filtersActive: boolean
  backlogExecutionLookup: ReadonlyMap<string, number>
  canAlterConveyor: boolean
  cardActionBusyKey: string | null
  onCardPointTime: (item: PlanningDailyPlanCardItem) => void
  onCardComplete: (item: PlanningDailyPlanCardItem) => void
  onCardReopen: (item: PlanningDailyPlanCardItem) => void
  onCardPrintTicket?: (item: PlanningDailyPlanCardItem) => void
}

const COLUMN_ACCENT: Record<string, string> = {
  planned: 'border-slate-500/20',
  in_progress: 'border-sky-400/20',
  attention: 'border-amber-400/25',
  completed: 'border-emerald-400/20',
}

function formatPlannedDateLabel(
  plannedDate: string,
  weekdayDates: readonly string[],
  weekdayLabels: readonly string[],
  todayIso: string,
): string {
  const idx = weekdayDates.indexOf(plannedDate)
  if (plannedDate === todayIso) {
    const day = idx >= 0 ? weekdayLabels[idx] : plannedDate
    return `Hoje (${day})`
  }
  if (idx >= 0) {
    return `${weekdayLabels[idx]} (${plannedDate})`
  }
  return plannedDate
}

export function PlanningDailyKanbanView(props: PlanningDailyBoardProps) {
  const board = useMemo(
    () => buildPlanningDailyBoardColumns(props.items, { selectedDay: props.selectedDay }),
    [props.items, props.selectedDay],
  )

  const dayFilteredCount = board.columns.reduce((sum, col) => sum + col.count, 0)
  const emptyMessage = resolvePlanningDailyBoardEmptyMessage(
    props.items.length,
    dayFilteredCount,
    props.filtersActive,
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="block text-[11px] text-slate-500">
          Recorte do dia
          <select
            className="mt-1 min-w-[200px] rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 text-[13px] text-slate-100"
            value={props.selectedDay}
            onChange={(e) => {
              const v = e.target.value
              props.onSelectedDayChange(v === 'week' ? 'week' : v)
            }}
          >
            {props.todayInDisplayedWeek ? (
              <option value={props.todayIso}>Hoje</option>
            ) : null}
            {props.weekdayDates.map((d, i) => (
              <option key={d} value={d}>
                {props.weekdayLabels[i]} ({d})
              </option>
            ))}
            <option value="week">Semana inteira</option>
          </select>
        </label>
        <p className="text-[11px] text-slate-500">
          {dayFilteredCount} atividade{dayFilteredCount === 1 ? '' : 's'} no recorte
        </p>
      </div>

      {emptyMessage ? (
        <p className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-6 text-center text-[13px] text-slate-500">
          {emptyMessage}
        </p>
      ) : (
        <div className="grid gap-3 xl:grid-cols-4">
          {board.columns.map((column) => (
            <section
              key={column.id}
              className={[
                'flex min-h-[200px] flex-col rounded-xl border bg-white/[0.02] p-3',
                COLUMN_ACCENT[column.id] ?? 'border-white/[0.06]',
              ].join(' ')}
            >
              <header className="mb-3 border-b border-white/[0.06] pb-2">
                <h3 className="text-[12px] font-semibold text-slate-200">{column.label}</h3>
                <p className="mt-1 text-[10px] text-slate-500">
                  {column.count} {column.count === 1 ? 'item' : 'itens'}
                  {column.count > 0 ? (
                    <>
                      {' '}
                      · {formatPlanningMinutes(column.plannedMinutes)} planejadas
                      {column.realizedMinutes > 0
                        ? ` · ${formatPlanningMinutes(column.realizedMinutes)} realizadas`
                        : ''}
                    </>
                  ) : null}
                </p>
              </header>
              <div className="flex flex-1 flex-col gap-2 overflow-y-auto lg:max-h-[calc(100vh-320px)]">
                {column.items.length === 0 ? (
                  <p className="py-6 text-center text-[10px] text-slate-600">Nenhum item</p>
                ) : (
                  column.items.map((item) => (
                    <PlanningDailyPlanCard
                      key={item.localKey}
                      item={item}
                      plannedDateLabel={formatPlannedDateLabel(
                        item.plannedDate,
                        props.weekdayDates,
                        props.weekdayLabels,
                        props.todayIso,
                      )}
                      backlogExecutionLookup={props.backlogExecutionLookup}
                      canAlterConveyor={props.canAlterConveyor}
                      actionBusy={props.cardActionBusyKey === item.localKey}
                      onPointTime={() => props.onCardPointTime(item)}
                      onComplete={() => props.onCardComplete(item)}
                      onReopen={() => props.onCardReopen(item)}
                      onPrintTicket={
                        props.onCardPrintTicket
                          ? () => props.onCardPrintTicket!(item)
                          : undefined
                      }
                    />
                  ))
                )}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

