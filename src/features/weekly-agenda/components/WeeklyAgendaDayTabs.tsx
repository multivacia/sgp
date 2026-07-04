type WeeklyAgendaDayTabsProps = {
  weekdayDates: readonly string[]
  weekdayLabels: readonly string[]
  selectedDay: string
  dayLoadMinutes: Record<string, number>
  maxDayMinutes: number
  onSelectDay: (isoDate: string) => void
}

function formatShortDate(isoDate: string): string {
  const [, month, day] = isoDate.split('-')
  return `${day}/${month}`
}

export function WeeklyAgendaDayTabs(props: WeeklyAgendaDayTabsProps) {
  return (
    <div
      className="grid grid-cols-5 gap-1.5 sm:gap-2 lg:hidden"
      data-testid="weekly-agenda-day-tabs"
    >
      {props.weekdayDates.map((isoDate, index) => {
        const active = isoDate === props.selectedDay
        const load = props.dayLoadMinutes[isoDate] ?? 0
        const fillPct =
          props.maxDayMinutes > 0 ? Math.min(100, Math.round((load / props.maxDayMinutes) * 100)) : 0

        return (
          <button
            key={isoDate}
            type="button"
            data-testid={`weekly-agenda-day-tab-${isoDate}`}
            aria-pressed={active}
            onClick={() => props.onSelectDay(isoDate)}
            className={[
              'rounded-xl border px-1 py-2 text-center transition',
              active
                ? 'border-sgp-gold/35 bg-sgp-gold/10 text-slate-50'
                : 'border-white/[0.08] bg-white/[0.03] text-slate-300 hover:bg-white/[0.05]',
            ].join(' ')}
          >
            <p className="text-[11px] font-semibold">{props.weekdayLabels[index] ?? isoDate}</p>
            <p className="mt-0.5 text-[9px] text-slate-500">{formatShortDate(isoDate)}</p>
            <div className="mx-auto mt-1.5 h-0.5 w-[85%] overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-sky-700 to-sky-400"
                style={{ width: `${fillPct}%` }}
              />
            </div>
          </button>
        )
      })}
    </div>
  )
}
