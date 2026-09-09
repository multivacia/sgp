/**
 * Contrato de apresentação dos KPIs no topo da tela Planejamento.
 * Conceitos de “aguardando encaixe” / “fora do planejado” permanecem no domínio;
 * apenas deixam de ser renderizados como cards de resumo nesta tela.
 */
export const PLANNING_SUMMARY_KPI_LABELS = [
  'Minutos planejados',
  'Atividades planejadas',
  'Colaboradores no plano',
] as const

/** Labels que não devem mais aparecer nos cards de resumo superiores. */
export const PLANNING_SUMMARY_HIDDEN_KPI_LABELS = [
  'Aguardando encaixe',
  'Fora do planejado',
] as const

export const PLANNING_SUMMARY_KPI_GRID_CLASS =
  'mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3'

export const PLANNING_SUMMARY_SYNC_CARD_CLASS =
  'rounded-xl border border-amber-400/25 bg-amber-500/[0.06] p-4 sm:col-span-2 lg:col-span-3'
