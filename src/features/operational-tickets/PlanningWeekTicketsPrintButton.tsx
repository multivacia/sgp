type PlanningWeekTicketsPrintButtonProps = {
  count: number
  disabled: boolean
  onClick: () => void
  testId?: string
}

export function PlanningWeekTicketsPrintButton(props: PlanningWeekTicketsPrintButtonProps) {
  return (
    <button
      type="button"
      data-testid={props.testId}
      className="rounded-xl border border-white/[0.12] bg-white/[0.06] px-4 py-2 text-[13px] font-medium text-slate-100 hover:bg-white/[0.09] disabled:opacity-50"
      title={
        props.count === 0
          ? 'Nenhuma atividade planejada nesta semana'
          : 'Imprimir tickets de todas as atividades planejadas na semana'
      }
      disabled={props.disabled}
      onClick={props.onClick}
    >
      Imprimir tickets da semana
      {props.count > 0 ? ` (${props.count})` : ''}
    </button>
  )
}
