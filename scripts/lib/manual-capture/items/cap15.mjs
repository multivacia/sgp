/** Capítulo 15 — Dashboard e indicadores. */
import { h, ok } from '../mock-api.mjs'
import { FIXED_NOW_ISO } from '../fixtures/common.mjs'

const operational = {
  meta: { generatedAt: FIXED_NOW_ISO, scope: 'snapshot_atual', bucketRule: 'Mesma regra de bucket do painel operacional.', semanticsVersion: '1.5' },
  conveyorsByBucket: { em_elaboracao: 1, aguardando_planejamento: 1, em_planejamento: 1, em_execucao: 3, em_atraso: 2, finalizadas: 1, canceladas: 0 },
  overdueHighlight: [
    { conveyorId: 'conv-104', name: 'Volante em couro — Veículo Exemplo', code: 'ET-0104', operationalStatus: 'EM_ANDAMENTO', estimatedDeadline: '2026-06-26' },
    { conveyorId: 'conv-109', name: 'Tapetes personalizados — Veículo Exemplo', code: 'ET-0109', operationalStatus: 'A_INICIAR', estimatedDeadline: '2026-06-29' },
  ],
  assignees: { totalAllocations: 24, primaryAllocations: 18, supportAllocations: 6 },
  plannedVsRealized: {
    plannedMinutesConveyorTotal: 5400,
    plannedMinutesStepNodes: 5160,
    realizedMinutesTotal: 2275,
    realizedMinutesInPeriod: 1380,
    realizedPeriod: { from: '2026-06-25T03:00:00.000Z', to: '2026-07-02T02:59:59.999Z', preset: '7d' },
    notes: 'Previsto canônico = soma das atividades; realizado = soma dos apontamentos.',
  },
  collaboratorLoad: [
    { collaboratorId: 'col-carlos', fullName: 'Carlos Demo', assignmentCount: 9, primaryCount: 8, supportCount: 1, plannedMinutesOnSteps: 1290, realizedMinutes: 465 },
    { collaboratorId: 'col-bruno', fullName: 'Bruno Exemplo', assignmentCount: 5, primaryCount: 4, supportCount: 1, plannedMinutesOnSteps: 510, realizedMinutes: 165 },
    { collaboratorId: 'col-diana', fullName: 'Diana Exemplo', assignmentCount: 6, primaryCount: 4, supportCount: 2, plannedMinutesOnSteps: 690, realizedMinutes: 175 },
    { collaboratorId: 'col-eduardo', fullName: 'Eduardo Teste', assignmentCount: 4, primaryCount: 2, supportCount: 2, plannedMinutesOnSteps: 420, realizedMinutes: 40 },
  ],
  recentTimeEntries: [
    { id: 'rte-1', conveyorId: 'conv-101', conveyorName: 'Reforma de bancos — Veículo Exemplo', stepNodeId: 'step-3', stepName: 'Recuperar espuma', collaboratorId: 'col-carlos', collaboratorName: 'Carlos Demo', minutes: 60, entryAt: '2026-06-30T19:00:00.000Z', notes: null },
    { id: 'rte-2', conveyorId: 'conv-101', conveyorName: 'Reforma de bancos — Veículo Exemplo', stepNodeId: 'step-7', stepName: 'Costurar capas', collaboratorId: 'col-bruno', collaboratorName: 'Bruno Exemplo', minutes: 75, entryAt: '2026-06-30T17:30:00.000Z', notes: null },
  ],
}

const executive = {
  meta: { generatedAt: FIXED_NOW_ISO, completedWithinDays: 30, scope: 'snapshot_atual' },
  totals: { activeConveyors: 7, completedInWindow: 1, overdueConveyors: 2, delayRateVsActive: 2 / 7 },
  plannedVsRealized: { plannedMinutesConveyorTotal: 5400, plannedMinutesStepNodes: 5160, realizedMinutesTotal: 2275, notes: '' },
  topOverdueConveyors: operational.overdueHighlight.map(({ operationalStatus, ...r }) => r),
}

export default [
  {
    id: 'cap15-01',
    slug: 'dashboards-operacional-cards',
    match: 'Tela Dashboards na visão Operacional, modo Cards',
    route: '/app/dashboard',
    scenario: 'Dashboards na visão Operacional em modo Cards: faixa Operacional/Gerencial, Cards/Gráficos e Atualizar; bloco Resumo com os quatro cartões.',
    notes: 'Observação de auditoria: o cartão "Alocações em STEPs" expõe o termo técnico STEP ao usuário.',
    handlers: () => [
      h('GET', '/api/v1/dashboard/operational', () => ok(operational)),
      h('GET', '/api/v1/dashboard/executive', () => ok(executive)),
    ],
    async run({ page, shot }) {
      await page.getByText('Resumo', { exact: true }).first().waitFor()
      await shot()
    },
  },
]
