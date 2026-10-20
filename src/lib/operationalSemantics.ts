/**
 * Linguagem oficial V1.5 — indicadores operacionais (SGP+ Web).
 * Alinhar labels de UI; o backend continua a ser a fonte de verdade numérica.
 */

export const OP_SEMANTICS_VERSION = '1.5' as const

export const operationalLabels = {
  minutosApontadosAcumulado: 'Minutos apontados (acumulado)',
  minutosApontadosPeriodo: 'Minutos apontados (período)',
  previstoEstrutural: 'Previsto estrutural',
  pressaoAtraso: 'Pressão de atraso',
  coberturaTempo: 'Cobertura de tempo',
  pendenciaTempo: 'Pendência de tempo',
  /** Total OS — coluna de apoio na mesma vista. */
  totalPorEsteiraOs: 'Total por esteira (OS)',
} as const

/**
 * Rótulos do Dashboard (Operacional e Gerencial) em linguagem de usuário: sem «STEP»,
 * «bucket», «snapshot» ou «preset». Os valores continuam em minutos no contrato e são
 * exibidos com `formatHumanMinutes` (h/min).
 */
export const dashboardLabels = {
  totalHorasApontadas: 'Total de horas apontadas',
  horasApontadasPeriodo: 'Horas apontadas no período',
  tempoPrevistoAtividades: 'Tempo previsto das atividades',
  totalPorEsteiraOs: 'Total por esteira (OS)',
  esteirasEmAtraso: 'Esteiras em atraso',
  esteirasPorSituacao: 'Esteiras por situação operacional',
  periodoAnalise: 'Período de análise',
  alocacoesAtividades: 'Alocações em atividades',
  esteirasConcluidas: 'Esteiras concluídas',
  tempoPrevistoVsHoras: 'Tempo previsto x horas apontadas',
} as const

/** «Esteiras concluídas — 01/10/2026 a 20/10/2026». */
export function dashboardConcluidasNoPeriodoLabel(periodLabel: string): string {
  return `${dashboardLabels.esteirasConcluidas} — ${periodLabel}`
}

/** Copy do dashboard gerencial (agregados). */
export const executiveDashboardCopy = {
  headerMicrocopyExecutive: 'Visão gerencial: totais da operação e esteiras concluídas no período.',
  participacaoAtrasoTitulo: 'Participação de atraso (ativas)',
  participacaoAtrasoHint:
    'Proporção de esteiras em atraso em relação às esteiras ativas (situação atual).',
  secaoAgregadaTitulo: 'Tempo previsto e horas apontadas',
  listaAtrasoTitulo: 'Esteiras em atraso (amostra)',
  pizzaTitulo: 'Ativas · Concluídas · Em atraso (esteiras)',
  pieTooltipValueLabel: 'Esteiras',
  /** Nome da série no gráfico de barras. */
  barSeriesName: 'Tempo total',
  /** Linha curta no tooltip das barras, abaixo do valor numérico. */
  barTooltipValueCaption:
    'Cada barra corresponde ao rótulo do eixo: tempo previsto das atividades, total por esteira (OS) ou total de horas apontadas.',
} as const

/** Textos curtos para tooltips nativos e gráficos (dashboard). */
export const dashboardHints = {
  acumuladoGlobal: 'Soma de todas as horas apontadas, sem filtro de período.',
  previstoEstruturalSteps:
    'Soma do tempo previsto (tempo unitário × quantidade) das atividades ativas.',
  totalOsApoio:
    'Soma do tempo previsto registrado em cada OS. Pode diferir do tempo previsto das atividades se o total da OS não foi recalculado.',
  /** Horas apontadas no período: pela data de realização do trabalho. */
  periodo: (periodLabel: string) =>
    `Soma das horas apontadas com data de realização de ${periodLabel}.`,
  drillBacklogTodas: 'Abre o painel de esteiras com todas as esteiras, em nova aba.',
  drillBacklogAtraso: 'Abre o painel de esteiras com as esteiras em atraso, em nova aba.',
  drillBacklogAtivas: 'Abre o painel de esteiras somente com as esteiras ativas, em nova aba.',
  /** Barras / legenda do gráfico operacional — mesmo gesto que os cartões KPI. */
  drillBacklogSameBucket: 'Abre o painel de esteiras com a mesma situação, em nova aba.',
  /** Pizza gerencial (ativas / atraso / concluídas no período). */
  drillBacklogChartSlice: 'Abre o painel de esteiras com o filtro deste segmento, em nova aba.',
  drillBacklogConcluidas: (periodLabel: string) =>
    `Abre o painel de esteiras com as esteiras concluídas de ${periodLabel}, em nova aba.`,
} as const

/** Presets alinhados ao backend (`operationalPeriod` / query da jornada). */
export const periodPresetOptions: {
  value: '7d' | '15d' | '30d' | 'month' | 'custom'
  label: string
}[] = [
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '15d', label: 'Últimos 15 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: 'month', label: 'Mês atual (UTC)' },
  { value: 'custom', label: 'Intervalo personalizado' },
]

export function formatCoberturaTempoRatio(ratio: number | null): string {
  if (ratio === null || Number.isNaN(ratio)) return '— (não aplicável)'
  return `${Math.round(ratio * 1000) / 10} %`
}

/** V1 leitura por área/STEP no detalhe da esteira — sem «gargalo» como label principal. */
export const nodeWorkloadLabels = {
  sectionTitle: 'Pendência e concentração por setor e atividade',
  pendenciaTempoStep: 'Pendência de tempo (etapa)',
  concentracaoPrevisto: 'Concentração de trabalho — previsto',
  concentracaoRealizado: 'Concentração de trabalho — realizado',
  pressaoAtrasoContexto: 'Pressão de atraso (contexto da esteira)',
  bucketOperacional: 'Bucket operacional (esteira)',
  colunas: {
    opcao: 'Tarefa',
    area: 'Setor',
    step: 'Atividade',
    previsto: 'Previsto estrutural',
    realizado: 'Realizado (acum.)',
    pendencia: 'Pendência',
  },
  /** Tooltip do bloco + alinhamento ao texto fixo da API. */
  tooltipBloco:
    'Pendência de tempo compara o previsto estrutural da etapa com os minutos apontados acumulados. Não identifica causa raiz. O atraso e a pressão referem-se à esteira, não à etapa.',
} as const
