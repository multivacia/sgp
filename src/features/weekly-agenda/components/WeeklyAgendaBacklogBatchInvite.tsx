type WeeklyAgendaBacklogBatchInviteProps = {
  itemCount: number
  onStart: () => void
}

export function WeeklyAgendaBacklogBatchInvite(props: WeeklyAgendaBacklogBatchInviteProps) {
  const { itemCount, onStart } = props
  return (
    <div
      className="rounded-xl border border-sgp-gold/35 bg-sgp-gold/[0.06] p-3.5"
      data-testid="weekly-agenda-backlog-batch-invite"
    >
      <p className="text-[12.5px] font-semibold text-slate-50">
        {itemCount} itens parados no backlog
      </p>
      <p className="mt-1 text-[11.5px] leading-relaxed text-slate-400">
        Quer passar por eles um de cada vez, com sugestão de quem tem mais folga? É mais rápido do
        que atribuir manualmente item por item.
      </p>
      <button
        type="button"
        className="mt-2.5 w-full rounded-lg border border-sgp-gold/35 bg-sgp-gold/15 px-3 py-2 text-[12.5px] font-semibold text-slate-50 hover:bg-sgp-gold/25"
        data-testid="weekly-agenda-backlog-batch-start"
        onClick={onStart}
      >
        Alocar tudo em lote
      </button>
    </div>
  )
}
