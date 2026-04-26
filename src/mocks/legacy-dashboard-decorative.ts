/**
 * Legado decorativo — não usar como fonte funcional de KPIs nem importar em telas.
 *
 * Gráficos/KPIs estáticos derivados do seed antigo. O dashboard operacional real é
 * `dashboard-operacional.ts` + agregações sobre projeção e apontamentos.
 *
 * Mantido apenas para referência ou demos que não toquem na espinha dorsal.
 */
import { BACKLOG_MOCK_ROWS } from './backlog'
import { computeResumoEsteira, listOfficialEsteiras } from './esteira-detalhe'

let estimativaTotalMin = 0
let realizadoTotalMin = 0
let totalTarefas = 0
const minutosPorSetor = new Map<string, number>()

for (const e of listOfficialEsteiras()) {
  const r = computeResumoEsteira(e)
  estimativaTotalMin += r.estimativaTotalMin
  realizadoTotalMin += r.realizadoTotalMin
  totalTarefas += e.tarefas.length
  for (const t of e.tarefas) {
    for (const a of t.atividades) {
      minutosPorSetor.set(
        a.setor,
        (minutosPorSetor.get(a.setor) ?? 0) + a.estimativaMin,
      )
    }
  }
}

const eficienciaMediaPct =
  estimativaTotalMin > 0
    ? Math.round((realizadoTotalMin / estimativaTotalMin) * 100)
    : 0

const tempoMedioTarefaH =
  totalTarefas > 0
    ? Math.round((estimativaTotalMin / totalTarefas / 60) * 10) / 10
    : 0

export const DASHBOARD_KPIS = {
  ordensBacklog: BACKLOG_MOCK_ROWS.filter((r) => r.status === 'no_backlog')
    .length,
  emExecucao: BACKLOG_MOCK_ROWS.filter((r) => r.status === 'em_producao')
    .length,
  concluidasHoje: BACKLOG_MOCK_ROWS.filter((r) => r.status === 'concluida')
    .length,
  eficienciaMediaPct,
  tempoMedioTarefaH,
  atrasosCriticos: BACKLOG_MOCK_ROWS.filter(
    (r) => r.priority === 'alta' && r.status !== 'concluida',
  ).length,
} as const

const SETORES_OFICIAIS = [
  'Tapeçaria',
  'Desmontagem',
  'Corte e Costura',
  'Acabamento',
  'Montagem',
  'Qualidade',
] as const

const maxSetor = Math.max(
  ...SETORES_OFICIAIS.map((s) => minutosPorSetor.get(s) ?? 0),
  1,
)

export type ChartBar = { label: string; value: number }

export const CHART_PRODUTIVIDADE_SETOR: ChartBar[] = SETORES_OFICIAIS.map(
  (label) => ({
    label,
    value: Math.round(
      ((minutosPorSetor.get(label) ?? 0) / maxSetor) * 100,
    ),
  }),
)

const nBacklog = BACKLOG_MOCK_ROWS.filter((r) => r.status === 'no_backlog')
  .length
const nExec = BACKLOG_MOCK_ROWS.filter((r) => r.status === 'em_producao')
  .length
const nRev = BACKLOG_MOCK_ROWS.filter((r) => r.status === 'em_revisao').length
const nConc = BACKLOG_MOCK_ROWS.filter((r) => r.status === 'concluida').length

export const CHART_STATUS_ORDENS = [
  { label: 'Backlog', value: nBacklog, color: 'bg-sgp-blue' },
  { label: 'Execução', value: nExec, color: 'bg-sgp-blue-bright' },
  { label: 'Revisão', value: nRev, color: 'bg-amber-500' },
  { label: 'Concluídas', value: nConc, color: 'bg-emerald-600' },
] as const

export const CHART_EVOLUCAO_SEMANAL = [
  { semana: 'S1', ordens: 2 },
  { semana: 'S2', ordens: 2 },
  { semana: 'S3', ordens: 3 },
  { semana: 'S4', ordens: 3 },
] as const
