type WeeklyAgendaPlacingBannerProps = {
  activityTitle: string
  mode: 'drag' | 'tap'
  onCancel: () => void
}

export function WeeklyAgendaPlacingBanner(props: WeeklyAgendaPlacingBannerProps) {
  const verb = props.mode === 'tap' ? 'Atribuindo' : 'Arrastando'
  const hint =
    props.mode === 'tap'
      ? 'toque num espaço livre da grade'
      : 'solte sobre um espaço livre da agenda'

  return (
    <div
      className="sticky top-0 z-40 -mx-4 mb-4 flex items-center justify-between gap-3 border-b border-sgp-gold/40 bg-gradient-to-b from-sgp-navy-deep/97 to-sgp-navy-deep/90 px-4 py-3 backdrop-blur-sm sm:-mx-6 sm:px-6"
      data-testid="weekly-agenda-placing-banner"
      data-placing-mode={props.mode}
      role="status"
      aria-live="polite"
    >
      <p className="text-[12.5px] leading-snug text-amber-100/90">
        {verb}:{' '}
        <span className="font-semibold text-slate-50">{props.activityTitle}</span>
        {' — '}
        {hint}
      </p>
      <button
        type="button"
        className="shrink-0 rounded-xl border border-white/[0.10] bg-white/[0.06] px-3 py-1.5 text-[11.5px] text-slate-300 hover:bg-white/[0.09]"
        data-testid="weekly-agenda-placing-cancel"
        onClick={props.onCancel}
      >
        Cancelar
      </button>
    </div>
  )
}
