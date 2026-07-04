import { useEffect, useMemo, useState } from 'react'
import { PageCanvas } from '../../components/ui/PageCanvas'
import { buildPlanningDaySummaries } from '../operational-planning/planningBoardHelpers'
import {
  isIsoDateInWeekdays,
  localTodayIsoDate,
  weekdayLabelsPt,
} from '../operational-planning/operationalPlanningWeekRange'
import { WeeklyAgendaBoard } from './components/WeeklyAgendaBoard'
import { WeeklyAgendaDayTabs } from './components/WeeklyAgendaDayTabs'
import { WeeklyAgendaHeader } from './components/WeeklyAgendaHeader'
import { WeeklyAgendaSummaryStrip } from './components/WeeklyAgendaSummaryStrip'
import { useWeeklyAgendaWeek } from './hooks/useWeeklyAgendaWeek'
import { useMinLgViewport } from './hooks/useMinLgViewport'
import { buildWeeklyAgendaSummaryStrip } from './weeklyAgendaSummary'

export function WeeklyAgendaPage() {
  const { weekMonday, setWeekMonday, weekPayload, collaborators, loading, error } =
    useWeeklyAgendaWeek()
  const isLargeScreen = useMinLgViewport()

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

  useEffect(() => {
    if (weekdayDates.length === 0) {
      setSelectedDay('')
      return
    }
    if (todayInDisplayedWeek && weekdayDates.includes(todayIso)) {
      setSelectedDay(todayIso)
      return
    }
    setSelectedDay(weekdayDates[0] ?? '')
  }, [weekMonday, weekdayDates, todayInDisplayedWeek, todayIso])

  const summaryStrip = useMemo(() => buildWeeklyAgendaSummaryStrip(weekPayload), [weekPayload])

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

  const visibleWeekdayDates = useMemo(() => {
    if (weekdayDates.length === 0) return []
    if (isLargeScreen) return weekdayDates
    const day = selectedDay || weekdayDates[0]
    return day ? [day] : weekdayDates
  }, [weekdayDates, selectedDay, isLargeScreen])

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
              <WeeklyAgendaSummaryStrip summary={summaryStrip} />
            </div>

            <section className="mt-8 space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h2 className="text-[15px] font-semibold text-slate-100">Grade da semana</h2>
                  <p className="mt-1 text-[12px] text-slate-500">
                    Somente leitura nesta versão — arrastar e editar chegam no PR-4.
                  </p>
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
                  selectedDay={selectedDay || weekdayDates[0]}
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
                selectedDay={selectedDay}
                visibleWeekdayDates={visibleWeekdayDates}
                todayIso={todayIso}
                todayInDisplayedWeek={todayInDisplayedWeek}
              />
            </section>
          </>
        ) : null}
      </div>
    </PageCanvas>
  )
}
