import type { PlanningSuggestionCardView } from './planningSuggestionPresentation'

type PlanningCollaboratorSuggestionCardsProps = {
  cards: readonly PlanningSuggestionCardView[]
  capacityMessage: string | null
  originalResponsibleName: string | null
  loading?: boolean
  errorMessage?: string | null
  emptyMessage?: string | null
  onSelect: (card: PlanningSuggestionCardView) => void
}

export function PlanningCollaboratorSuggestionCards(
  props: PlanningCollaboratorSuggestionCardsProps,
) {
  const {
    cards,
    capacityMessage,
    originalResponsibleName,
    loading = false,
    errorMessage = null,
    emptyMessage = null,
    onSelect,
  } = props

  return (
    <section
      className="mt-4 space-y-2"
      aria-label="Sugestões de colaborador e dia"
      data-testid="planning-collaborator-suggestions"
    >
      {originalResponsibleName ? (
        <p className="text-[12px] text-slate-400">
          Responsável original:{' '}
          <span className="font-medium text-slate-200">{originalResponsibleName}</span>
        </p>
      ) : null}

      {loading ? (
        <p className="text-[12px] text-slate-500" role="status">
          Carregando sugestões…
        </p>
      ) : null}

      {errorMessage ? (
        <p className="text-[12px] text-rose-300" role="alert">
          {errorMessage}
        </p>
      ) : null}

      {capacityMessage ? (
        <p className="rounded-xl border border-amber-400/25 bg-amber-500/10 px-3 py-2 text-[12px] text-amber-100">
          {capacityMessage}
        </p>
      ) : null}

      {!loading && !errorMessage && cards.length === 0 && emptyMessage ? (
        <p className="text-[12px] text-slate-500" role="status">
          {emptyMessage}
        </p>
      ) : null}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {cards.map((card) => (
          <button
            key={`${card.option.kind}-${card.option.collaboratorId}-${card.option.day}`}
            type="button"
            data-testid={card.testId}
            aria-pressed={card.selected}
            aria-label={`${card.title}. ${card.subtitle}. ${card.detail}`}
            onClick={() => onSelect(card)}
            className={[
              'min-h-11 rounded-xl border px-3 py-2.5 text-left transition-colors',
              card.selected
                ? 'border-sgp-gold/45 bg-sgp-gold/15 ring-1 ring-sgp-gold/40'
                : 'border-white/[0.08] bg-white/[0.04] hover:bg-white/[0.08]',
            ].join(' ')}
          >
            <span className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {card.title}
              </span>
              {card.selected ? (
                <span className="text-[10px] font-semibold text-sgp-gold">Selecionada</span>
              ) : null}
            </span>
            <span className="mt-1 block text-[13px] font-medium text-slate-50">{card.subtitle}</span>
            <span className="mt-0.5 block text-[11px] text-slate-500">{card.detail}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
