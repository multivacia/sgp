import { BACKLOG_MOCK_ROWS } from './backlog'

export const legacyDashboardDecorative = {
  ordensBacklog: BACKLOG_MOCK_ROWS.filter((r) => r.status === 'em_elaboracao')
    .length,
  emExecucao: BACKLOG_MOCK_ROWS.filter((r) => r.status === 'em_andamento')
    .length,
  concluidasHoje: BACKLOG_MOCK_ROWS.filter((r) => r.status === 'finalizada')
    .length,
  altaPrioridadeAbertas: BACKLOG_MOCK_ROWS.filter(
    (r) => r.priority === 'alta' && r.status !== 'finalizada',
  ).length,
}

const nElaboracao = BACKLOG_MOCK_ROWS.filter((r) => r.status === 'em_elaboracao')
  .length
const nExec = BACKLOG_MOCK_ROWS.filter((r) => r.status === 'em_andamento').length
const nAguard = BACKLOG_MOCK_ROWS.filter(
  (r) => r.status === 'aguardando_planejamento',
).length
const nFin = BACKLOG_MOCK_ROWS.filter((r) => r.status === 'finalizada').length

export const legacyDashboardMiniCards = {
  nElaboracao,
  nExec,
  nAguard,
  nFin,
}
