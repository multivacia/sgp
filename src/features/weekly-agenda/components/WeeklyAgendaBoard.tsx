import type { Collaborator } from '../../../domain/collaborators/collaborator.types'
import type {
  OperationalPlanningPlanItem,
  OperationalPlanningWeekPayload,
} from '../../../domain/operational-planning/operational-planning.types'
import {
  buildPlanningAssigneeSummaries,
  buildPlanningDaySummaries,
  formatPlanningCapacityExceededMessage,
  formatPlanningMinutes,
  resolvePlanningCapacityState,
  sumPlanningItemMinutes,
} from '../../operational-planning/planningBoardHelpers'
import { WeeklyAgendaPlanCard } from './WeeklyAgendaPlanCard'

type WeeklyAgendaBoardProps = {
  collaborators: readonly Collaborator[]
  planItems: readonly OperationalPlanningPlanItem[]
  weekdayDates: readonly string[]
  weekdayLabels: readonly string[]
  capacityRows: OperationalPlanningWeekPayload['capacityByCollaboratorDay']
  selectedDay: string | null
  visibleWeekdayDates: readonly string[]
  todayIso: string
  todayInDisplayedWeek: boolean
}

function cellItems(
  items: readonly OperationalPlanningPlanItem[],
  collaboratorId: string,
  plannedDate: string,
): OperationalPlanningPlanItem[] {
  return items
    .filter((it) => it.assignedCollaboratorId === collaboratorId && it.plannedDate === plannedDate)
    .sort((a, b) => a.plannedOrder - b.plannedOrder)
}

export function WeeklyAgendaBoard(props: WeeklyAgendaBoardProps) {
  const boardItems = props.planItems.map((item) => ({
    ...item,
    assignedCollaboratorId: item.assignedCollaboratorId ?? undefined,
  }))
  const daySummaries = buildPlanningDaySummaries(boardItems)
  const assigneeSummaryById = new Map(
    buildPlanningAssigneeSummaries(boardItems).map((row) => [row.assigneeId, row]),
  )

  const columns = props.visibleWeekdayDates.map((dateIso) => {
    const labelIndex = props.weekdayDates.indexOf(dateIso)
    return {
      dateIso,
      label: labelIndex >= 0 ? (props.weekdayLabels[labelIndex] ?? dateIso) : dateIso,
    }
  })

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-separate border-spacing-2">
        <thead>
          <tr>
            <th className="w-40 rounded-lg bg-white/[0.03] px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Colaborador
            </th>
            {columns.map((col) => {
              const isTodayCol = props.todayInDisplayedWeek && col.dateIso === props.todayIso
              const dayTotal = daySummaries[col.dateIso]?.totalMinutes ?? 0
              return (
                <th
                  key={col.dateIso}
                  className={[
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
                    const items = cellItems(props.planItems, collaborator.id, col.dateIso)
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
                        className={isTodayCol ? 'align-top rounded-lg bg-sgp-gold/[0.02]' : 'align-top'}
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
                        <div className="space-y-2">
                          {items.length === 0 ? (
                            <p className="py-4 text-center text-[10px] leading-relaxed text-slate-600">
                              Nenhuma atividade planejada.
                            </p>
                          ) : (
                            items.map((item, idx) => (
                              <WeeklyAgendaPlanCard key={item.id} order={idx + 1} item={item} />
                            ))
                          )}
                        </div>
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
