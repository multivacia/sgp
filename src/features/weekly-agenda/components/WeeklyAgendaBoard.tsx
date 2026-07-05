import type { Collaborator } from '../../../domain/collaborators/collaborator.types'
import type { OperationalPlanningWeekPayload } from '../../../domain/operational-planning/operational-planning.types'
import {
  buildPlanningAssigneeSummaries,
  buildPlanningDaySummaries,
  formatPlanningCapacityExceededMessage,
  formatPlanningMinutes,
  resolvePlanningCapacityState,
  sumPlanningItemMinutes,
} from '../../operational-planning/planningBoardHelpers'
import type { DraftPlanItem } from '../weeklyAgendaDraft'
import { dragPlanId } from '../weeklyAgendaDnD'
import { weeklyAgendaDayColumnClass } from '../weeklyAgendaDayColumnVisibility'
import { WeeklyAgendaCell } from './WeeklyAgendaCell'
import { WeeklyAgendaPlanCard } from './WeeklyAgendaPlanCard'

type WeeklyAgendaBoardProps = {
  collaborators: readonly Collaborator[]
  draftItems: readonly DraftPlanItem[]
  weekdayDates: readonly string[]
  weekdayLabels: readonly string[]
  capacityRows: OperationalPlanningWeekPayload['capacityByCollaboratorDay']
  selectedDay: string
  todayIso: string
  todayInDisplayedWeek: boolean
  dragDisabled?: boolean
  canAlterConveyor?: boolean
  cardActionBusyKey?: string | null
  onCardPointTime?: (item: DraftPlanItem) => void
  onCardComplete?: (item: DraftPlanItem) => void
  onCardPrintTicket?: (item: DraftPlanItem) => void
  onCardRemoveFromPlan?: (item: DraftPlanItem) => void
  backlogTapPlaceActivityId?: string | null
  onBacklogCellTap?: (collaboratorId: string, plannedDate: string) => void
}

function cellItems(
  items: readonly DraftPlanItem[],
  collaboratorId: string,
  plannedDate: string,
): DraftPlanItem[] {
  return items
    .filter((it) => it.assignedCollaboratorId === collaboratorId && it.plannedDate === plannedDate)
    .sort((a, b) => a.plannedOrder - b.plannedOrder)
}

export function WeeklyAgendaBoard(props: WeeklyAgendaBoardProps) {
  const boardItems = props.draftItems.map((item) => ({
    ...item,
    assignedCollaboratorId: item.assignedCollaboratorId ?? undefined,
  }))
  const daySummaries = buildPlanningDaySummaries(boardItems)
  const assigneeSummaryById = new Map(
    buildPlanningAssigneeSummaries(boardItems).map((row) => [row.assigneeId, row]),
  )

  const columns = props.weekdayDates.map((dateIso, index) => ({
    dateIso,
    label: props.weekdayLabels[index] ?? dateIso,
  }))

  return (
    <div
      className="overflow-x-auto overscroll-x-contain rounded-lg pb-1"
      data-testid="weekly-agenda-board"
    >
      <table className="w-full min-w-0 border-separate border-spacing-2 lg:min-w-[1050px]">
        <thead>
          <tr>
            <th className="w-36 rounded-lg bg-white/[0.03] px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500 sm:w-40">
              Colaborador
            </th>
            {columns.map((col) => {
              const isTodayCol = props.todayInDisplayedWeek && col.dateIso === props.todayIso
              const dayTotal = daySummaries[col.dateIso]?.totalMinutes ?? 0
              return (
                <th
                  key={col.dateIso}
                  data-testid={`weekly-agenda-day-col-${col.dateIso}`}
                  className={[
                    weeklyAgendaDayColumnClass(props.selectedDay, col.dateIso),
                    'rounded-lg px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wide',
                    isTodayCol
                      ? 'border border-sgp-gold/25 bg-sgp-gold/[0.06] text-slate-200 ring-1 ring-sgp-gold/20'
                      : 'bg-white/[0.03] text-slate-500',
                  ].join(' ')}
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span>{col.label}</span>
                    {isTodayCol ? (
                      <span className="rounded-md border border-sgp-gold/30 bg-sgp-gold/10 px-1.5 py-0.5 text-[9px] font-semibold normal-case tracking-normal text-amber-100/90">
                        Hoje
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-0.5 font-normal normal-case tracking-normal text-[10px] text-slate-600">
                    {col.dateIso}
                  </div>
                  <div className="mt-1 font-normal normal-case tracking-normal text-[10px] text-slate-400">
                    {formatPlanningMinutes(dayTotal)} planejadas
                  </div>
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {props.collaborators.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + 1}
                className="py-10 text-center text-[13px] text-slate-500"
              >
                Nenhum colaborador ativo encontrado.
              </td>
            </tr>
          ) : (
            props.collaborators.map((collaborator) => {
              const assigneeWeek = assigneeSummaryById.get(collaborator.id)
              return (
                <tr key={collaborator.id}>
                  <td className="align-top">
                    <p className="text-[13px] font-medium text-slate-200">{collaborator.fullName}</p>
                    {assigneeWeek && assigneeWeek.totalMinutes > 0 ? (
                      <p className="mt-1 text-[10px] text-slate-500">
                        {formatPlanningMinutes(assigneeWeek.totalMinutes)} na semana
                        {assigneeWeek.itemsCount > 0
                          ? ` · ${assigneeWeek.itemsCount} atividade${assigneeWeek.itemsCount === 1 ? '' : 's'}`
                          : ''}
                      </p>
                    ) : (
                      <p className="mt-1 text-[10px] text-slate-600">Sem atividades nesta semana</p>
                    )}
                  </td>
                  {columns.map((col) => {
                    const items = cellItems(props.draftItems, collaborator.id, col.dateIso)
                    const sortableIds = items.map((item) => dragPlanId(item.localKey))
                    const cap = props.capacityRows.find(
                      (row) => row.collaboratorId === collaborator.id && row.date === col.dateIso,
                    )
                    const plannedSum = sumPlanningItemMinutes(
                      items.map((item) => ({
                        plannedDate: item.plannedDate,
                        plannedMinutes: item.plannedMinutes,
                        assignedCollaboratorId: item.assignedCollaboratorId ?? undefined,
                      })),
                    )
                    const capacityState = resolvePlanningCapacityState(plannedSum, cap?.capacityMinutes)
                    const isTodayCol = props.todayInDisplayedWeek && col.dateIso === props.todayIso

                    return (
                      <td
                        key={col.dateIso}
                        data-testid={`weekly-agenda-cell-${collaborator.id}-${col.dateIso}`}
                        className={[
                          weeklyAgendaDayColumnClass(props.selectedDay, col.dateIso),
                          isTodayCol ? 'rounded-lg bg-sgp-gold/[0.02]' : '',
                          'align-top',
                        ].join(' ')}
                      >
                        <WeeklyAgendaCell
                          collaboratorId={collaborator.id}
                          plannedDate={col.dateIso}
                          sortableIds={sortableIds}
                          tapPlaceActive={Boolean(props.backlogTapPlaceActivityId)}
                          onTapPlace={
                            props.onBacklogCellTap
                              ? () => props.onBacklogCellTap!(collaborator.id, col.dateIso)
                              : undefined
                          }
                        >
                          {capacityState === 'over_capacity' && cap ? (
                            <p className="mb-1 text-[10px] font-medium text-amber-200/90">
                              {formatPlanningCapacityExceededMessage(plannedSum, cap.capacityMinutes)}
                            </p>
                          ) : null}
                          <p className="mb-2 text-[10px] text-slate-500">
                            {formatPlanningMinutes(plannedSum)} planejados
                            {cap && capacityState !== 'unknown'
                              ? ` · capacidade ${formatPlanningMinutes(cap.capacityMinutes)}`
                              : ''}
                          </p>
                          <div className="min-h-[3rem] space-y-2">
                            {items.length === 0 ? (
                              <p className="py-4 text-center text-[10px] leading-relaxed text-slate-600">
                                {props.backlogTapPlaceActivityId
                                  ? 'Toque para atribuir aqui'
                                  : 'Nenhuma atividade planejada.'}
                              </p>
                            ) : (
                              items.map((item, idx) => (
                                <WeeklyAgendaPlanCard
                                  key={item.localKey}
                                  order={idx + 1}
                                  item={item}
                                  dragDisabled={props.dragDisabled}
                                  canAlterConveyor={props.canAlterConveyor}
                                  actionBusy={props.cardActionBusyKey === item.localKey}
                                  onPointTime={
                                    props.onCardPointTime
                                      ? () => props.onCardPointTime!(item)
                                      : undefined
                                  }
                                  onComplete={
                                    props.onCardComplete
                                      ? () => props.onCardComplete!(item)
                                      : undefined
                                  }
                                  onPrintTicket={
                                    props.onCardPrintTicket
                                      ? () => props.onCardPrintTicket!(item)
                                      : undefined
                                  }
                                  onRemoveFromPlan={
                                    props.onCardRemoveFromPlan
                                      ? () => props.onCardRemoveFromPlan!(item)
                                      : undefined
                                  }
                                />
                              ))
                            )}
                          </div>
                        </WeeklyAgendaCell>
                      </td>
                    )
                  })}
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}
