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

/** Copy partilhada do dashboard gerencial (agregados) — alinhada ao léxico V1.5. */
export const executiveDashboardCopy = {
  headerMicrocopyExecutive: 'Visão executiva (agregados operacionais)',
  participacaoAtrasoTitulo: 'Participação de atraso (ativas)',
  participacaoAtrasoHint:
    'Razão entre esteiras no bucket em_atraso e esteiras ativas. Indicador derivado.',
  secaoAgregadaTitulo: 'Previsto estrutural e minutos apontados',
  listaAtrasoTitulo: 'Esteiras em atraso (amostra)',
  pizzaTitulo: 'Ativas · Concluídas · Em atraso (esteiras)',
  pieTooltipValueLabel: 'Contagem (esteiras)',
  /** Nome da série no gráfico de barras (substitui «Minutos» genérico). */
  barSeriesName: 'Totais em minutos (por métrica no eixo)',
  /** Linha curta no tooltip das barras, abaixo do valor numérico. */
  barTooltipValueCaption:
    'Cada barra segue o rótulo horizontal: previsto estrutural (STEPs), total por esteira (OS) ou minutos apontados (acumulado).',
} as const

/** Textos curtos para tooltips nativos e gráficos (dashboard). */
export const dashboardHints = {
  acumuladoGlobal:
    'Soma global de minutos apontados na base (sem filtro de período neste número).',
  previstoEstruturalSteps:
    'Soma dos planned_minutes nos nós STEP ativos (estrutura operacional).',
  totalOsApoio: 'Soma de total_planned_minutes nas esteiras — pode divergir do previsto estrutural.',
  periodoUtc: (preset: string) =>
    `Soma dos apontamentos com entry_at na janela do preset ${preset} (UTC).`,
  drillBacklogTodas: 'Abre o backlog de esteiras (todas). Nova aba.',
  drillBacklogAtraso: 'Abre o backlog com situação «em atraso». Nova aba.',
  drillBacklogAtivas: 'Abre o backlog com âmbito «ativas». Nova aba.',
  /** Barras / legenda do gráfico operacional — mesmo gesto que os cartões KPI. */
  drillBacklogSameBucket: 'Abre o backlog com o mesmo recorte de bucket (nova aba).',
  /** Pizza executiva (ativas / atraso / concluídas em janela). */
  drillBacklogChartSlice: 'Abre o backlog com o recorte deste segmento (nova aba).',
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
  sectionTitle: 'Pendência e concentração por área/STEP',
  pendenciaTempoStep: 'Pendência de tempo (STEP)',
  concentracaoPrevisto: 'Concentração de trabalho — previsto',
  concentracaoRealizado: 'Concentração de trabalho — realizado',
  pressaoAtrasoContexto: 'Pressão de atraso (contexto da esteira)',
  bucketOperacional: 'Bucket operacional (esteira)',
  colunas: {
    opcao: 'Opção',
    area: 'Área',
    step: 'STEP',
    previsto: 'Previsto estrutural',
    realizado: 'Realizado (acum.)',
    pendencia: 'Pendência',
  },
  /** Tooltip do bloco + alinhamento ao texto fixo da API. */
  tooltipBloco:
    'Pendência de tempo compara o previsto estrutural do STEP com minutos apontados acumulados na base. Não identifica causa raiz. O bucket de atraso e a pressão referem-se à esteira, não ao STEP.',
} as const
