import { useEffect, useMemo, useState } from 'react'
import { PageCanvas } from '../../components/ui/PageCanvas'
import { listPlanningSyncIssues } from '../../domain/operational-planning/planningSyncIssues'
import { buildPlanningDaySummaries } from '../operational-planning/planningBoardHelpers'
import {
  isIsoDateInWeekdays,
  localTodayIsoDate,
  weekdayLabelsPt,
} from '../operational-planning/operationalPlanningWeekRange'
import { WeeklyAgendaAttentionDrawer } from './components/WeeklyAgendaAttentionDrawer'
import { WeeklyAgendaBacklogDrawer } from './components/WeeklyAgendaBacklogDrawer'
import { WeeklyAgendaBacklogFab } from './components/WeeklyAgendaBacklogFab'
import { WeeklyAgendaBoard } from './components/WeeklyAgendaBoard'
import { WeeklyAgendaDayTabs } from './components/WeeklyAgendaDayTabs'
import { WeeklyAgendaHeader } from './components/WeeklyAgendaHeader'
import { WeeklyAgendaSummaryStrip } from './components/WeeklyAgendaSummaryStrip'
import { useWeeklyAgendaBacklog } from './hooks/useWeeklyAgendaBacklog'
import { useWeeklyAgendaWeek } from './hooks/useWeeklyAgendaWeek'
import { buildWeeklyAgendaBacklogEmptyMessage } from './weeklyAgendaBacklogEmptyMessage'
import { buildWeeklyAgendaSummaryStrip } from './weeklyAgendaSummary'

export function WeeklyAgendaPage() {
  const { weekMonday, setWeekMonday, weekPayload, collaborators, loading, error, reload } =
    useWeeklyAgendaWeek()
  const {
    backlogItems,
    backlogQ,
    setBacklogQ,
    loading: backlogLoading,
    reloadBacklog,
  } = useWeeklyAgendaBacklog()

  const weekdayDates = useMemo(
    () => weekPayload?.week.weekdayDates ?? [],
    [weekPayload?.week.weekdayDates],
  )
  const weekdayLabels = useMemo(() => weekdayLabelsPt(), [])
  const planItems = useMemo(() => weekPayload?.plan?.items ?? [], [weekPayload?.plan?.items])
  const capacityRows = useMemo(
    () => weekPayload?.capacityByCollaboratorDay ?? [],
    [weekPayload?.capacityByCollaboratorDay],
  )

  const todayIso = useMemo(() => localTodayIsoDate(), [])
  const todayInDisplayedWeek = useMemo(
    () => isIsoDateInWeekdays(todayIso, weekdayDates),
    [todayIso, weekdayDates],
  )

  const [selectedDay, setSelectedDay] = useState<string>('')
  const [attentionDrawerOpen, setAttentionDrawerOpen] = useState(false)
  const [backlogDrawerOpen, setBacklogDrawerOpen] = useState(false)

  useEffect(() => {
    if (weekdayDates.length === 0) {
      setSelectedDay('')
      return
    }
    setSelectedDay((current) => {
      if (current && weekdayDates.includes(current)) return current
      if (todayInDisplayedWeek && weekdayDates.includes(todayIso)) return todayIso
      return weekdayDates[0] ?? ''
    })
  }, [weekMonday, weekdayDates, todayInDisplayedWeek, todayIso])

  const summaryStrip = useMemo(() => buildWeeklyAgendaSummaryStrip(weekPayload), [weekPayload])

  const syncIssueItems = useMemo(() => listPlanningSyncIssues(planItems), [planItems])
  const executionOutsidePlanEntries = useMemo(
    () => weekPayload?.executionOutsidePlanEntries ?? [],
    [weekPayload?.executionOutsidePlanEntries],
  )
  const executionOutsidePlanTotalMinutes = useMemo(
    () => weekPayload?.executionOutsidePlanSummary.totalMinutes ?? 0,
    [weekPayload?.executionOutsidePlanSummary.totalMinutes],
  )

  const backlogEmptyMessage = useMemo(
    () =>
      buildWeeklyAgendaBacklogEmptyMessage({
        visibleCount: backlogItems.length,
        loadedCount: backlogItems.length,
        searchQuery: backlogQ,
      }),
    [backlogItems.length, backlogQ],
  )

  const daySummaries = useMemo(
    () =>
      buildPlanningDaySummaries(
        planItems.map((item) => ({
          plannedDate: item.plannedDate,
          plannedMinutes: item.plannedMinutes,
          assignedCollaboratorId: item.assignedCollaboratorId ?? undefined,
        })),
      ),
    [planItems],
  )
  const maxDayMinutes = useMemo(
    () => Math.max(0, ...Object.values(daySummaries).map((d) => d.totalMinutes)),
    [daySummaries],
  )
  const dayLoadMinutes = useMemo(
    () =>
      Object.fromEntries(
        weekdayDates.map((date) => [date, daySummaries[date]?.totalMinutes ?? 0]),
      ) as Record<string, number>,
    [weekdayDates, daySummaries],
  )

  const activeSelectedDay = selectedDay || weekdayDates[0] || ''

  async function handleWeekApplied() {
    await reload()
    await reloadBacklog()
  }

  return (
    <PageCanvas>
      <div className="mx-auto max-w-[1600px] pb-16">
        <WeeklyAgendaHeader
          weekMonday={weekMonday}
          weekPayload={weekPayload}
          loading={loading}
          onWeekChange={setWeekMonday}
        />

        {loading ? (
          <p className="mt-8 text-center text-[13px] text-slate-500" role="status">
            Carregando semana…
          </p>
        ) : null}

        {error ? (
          <p
            className="mt-8 rounded-lg border border-rose-400/25 bg-rose-500/10 px-3 py-2 text-[13px] text-rose-100"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        {!loading && !error ? (
          <>
            <div className="mt-8">
              <WeeklyAgendaSummaryStrip
                summary={summaryStrip}
                onAttentionClick={() => setAttentionDrawerOpen(true)}
              />
            </div>

            <section className="mt-8 space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-[15px] font-semibold text-slate-100">Grade da semana</h2>
                  <p className="mt-1 text-[12px] text-slate-500">
                    Somente leitura nesta versão — arrastar e editar chegam no PR-4.
                  </p>
                  {activeSelectedDay ? (
                    <p
                      className="mt-1 text-[11px] text-slate-400 lg:hidden"
                      data-testid="weekly-agenda-mobile-selected-day"
                    >
                      Exibindo:{' '}
                      <span className="font-medium text-slate-200">
                        {weekdayLabels[weekdayDates.indexOf(activeSelectedDay)] ?? activeSelectedDay}
                      </span>{' '}
                      ({activeSelectedDay})
                    </p>
                  ) : null}
                </div>
                <div className="hidden flex-wrap gap-3 text-[11px] text-slate-500 lg:flex">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2 rounded-sm bg-white/35" /> Planejada
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2 rounded-sm bg-sky-400/80" /> Em execução
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2 rounded-sm bg-emerald-400/80" /> Concluída
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="size-2 rounded-sm bg-sgp-gold/80" /> Divergente
                  </span>
                </div>
              </div>

              {weekdayDates.length > 0 ? (
                <WeeklyAgendaDayTabs
                  weekdayDates={weekdayDates}
                  weekdayLabels={weekdayLabels}
                  selectedDay={activeSelectedDay}
                  dayLoadMinutes={dayLoadMinutes}
                  maxDayMinutes={maxDayMinutes}
                  onSelectDay={setSelectedDay}
                />
              ) : null}

              <WeeklyAgendaBoard
                collaborators={collaborators}
                planItems={planItems}
                weekdayDates={weekdayDates}
                weekdayLabels={weekdayLabels}
                capacityRows={capacityRows}
                selectedDay={activeSelectedDay}
                todayIso={todayIso}
                todayInDisplayedWeek={todayInDisplayedWeek}
              />
            </section>
          </>
        ) : null}
      </div>

      <WeeklyAgendaBacklogFab
        count={backlogItems.length}
        onClick={() => setBacklogDrawerOpen(true)}
      />

      <WeeklyAgendaAttentionDrawer
        open={attentionDrawerOpen}
        onClose={() => setAttentionDrawerOpen(false)}
        syncItems={syncIssueItems}
        outsidePlanEntries={executionOutsidePlanEntries}
        outsidePlanTotalMinutes={executionOutsidePlanTotalMinutes}
        onWeekApplied={handleWeekApplied}
      />

      <WeeklyAgendaBacklogDrawer
        open={backlogDrawerOpen}
        onClose={() => setBacklogDrawerOpen(false)}
        items={backlogItems}
        searchQuery={backlogQ}
        onSearchChange={setBacklogQ}
        onSearchSubmit={() => void reloadBacklog()}
        emptyMessage={backlogEmptyMessage}
        loading={backlogLoading}
      />
    </PageCanvas>
  )
}
