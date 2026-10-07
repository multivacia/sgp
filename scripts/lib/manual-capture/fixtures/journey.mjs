/** Jornada operacional (GET /my-operational-journey e /collaborators/operational-journey). */
import { collaboratorName } from './common.mjs'

const CONVEYORS = [
  ['conv-101', 'ET-0101', 'Reforma de bancos — Veículo Exemplo', 'EM_ANDAMENTO', '2026-07-10', 'em_execucao'],
  ['conv-103', 'ET-0103', 'Painéis de porta — Veículo Exemplo', 'EM_ANDAMENTO', '2026-07-06', 'em_execucao'],
  ['conv-104', 'ET-0104', 'Volante em couro — Veículo Exemplo', 'EM_ANDAMENTO', '2026-06-26', 'em_atraso'],
]

const ACTIVITIES = {
  'col-carlos': [
    [0, 'step-3', 'Recuperar espuma', 'Tapeçaria', 120, 60],
    [1, 'step-p1', 'Desmontar painéis', 'Tapeçaria', 180, 0],
    [0, 'step-5', 'Revestir assentos', 'Tapeçaria', 180, 0],
    [2, 'step-v1', 'Remover couro antigo', 'Tapeçaria', 60, 75],
  ],
  'col-bruno': [
    [0, 'step-7', 'Costurar capas', 'Costura', 150, 75],
    [0, 'step-8', 'Pespontar detalhes', 'Costura', 60, 0],
  ],
  'col-diana': [
    [1, 'step-p2', 'Revestir painéis', 'Tapeçaria', 120, 30],
    [2, 'step-v2', 'Revestir volante', 'Acabamento', 150, 40],
  ],
  'col-eduardo': [[2, 'step-v3', 'Costurar volante', 'Acabamento', 120, 0]],
}

function assignment(collabId, [ci, stepId, name, area, planned, realized], i) {
  const [conveyorId, code, cname, status, deadline, bucket] = CONVEYORS[ci]
  return {
    assigneeId: `asg-${collabId}-${i}`,
    conveyorId,
    conveyorCode: code,
    conveyorName: cname,
    conveyorStatus: status,
    estimatedDeadline: deadline,
    operationalBucket: bucket,
    stepNodeId: stepId,
    stepName: name,
    optionName: ci === 0 ? 'Bancos dianteiros' : ci === 1 ? 'Portas dianteiras' : 'Volante',
    areaName: area,
    roleInStep: 'primary',
    plannedMinutes: planned,
    plannedQuantity: 1,
    plannedTotalMinutes: planned,
    realizedMinutes: realized,
    collaboratorId: collabId,
    collaboratorName: collaboratorName(collabId),
  }
}

export function journeyPayload(collabIds, { periodPreset = '7d', from = '2026-06-25', to = '2026-07-01' } = {}) {
  const assignments = collabIds.flatMap((c) => (ACTIVITIES[c] ?? []).map((a, i) => assignment(c, a, i)))
  const planned = assignments.reduce((n, a) => n + a.plannedTotalMinutes, 0)
  const realized = assignments.reduce((n, a) => n + (a.realizedMinutes ?? 0), 0)
  const atRisk = assignments.filter((a) => a.operationalBucket === 'em_atraso')
  const pend = assignments
    .filter((a) => (a.realizedMinutes ?? 0) > a.plannedTotalMinutes)
    .map((a) => ({
      assigneeId: a.assigneeId,
      collaboratorId: a.collaboratorId,
      collaboratorName: a.collaboratorName,
      conveyorId: a.conveyorId,
      conveyorName: a.conveyorName,
      stepNodeId: a.stepNodeId,
      stepName: a.stepName,
      areaName: a.areaName,
      optionName: a.optionName,
      plannedMinutes: a.plannedMinutes,
      realizedMinutes: a.realizedMinutes,
      gapMinutes: (a.realizedMinutes ?? 0) - a.plannedTotalMinutes,
    }))
  const recent = assignments
    .filter((a) => (a.realizedMinutes ?? 0) > 0)
    .map((a, i) => ({
      id: `jte-${i}`,
      collaboratorId: a.collaboratorId,
      collaboratorName: a.collaboratorName,
      conveyorId: a.conveyorId,
      conveyorName: a.conveyorName,
      stepNodeId: a.stepNodeId,
      stepName: a.stepName,
      minutes: a.realizedMinutes,
      entryAt: `2026-06-${30 - (i % 3)}T1${i % 8}:00:00.000Z`,
      notes: null,
      entryOrigin: 'ASSIGNED',
      exceptionJustification: null,
      isOutOfSequence: false,
      outOfSequenceJustification: null,
    }))
  const byBucket = { em_elaboracao: 0, aguardando_planejamento: 0, em_planejamento: 0, em_execucao: 0, em_atraso: 0, finalizadas: 0, canceladas: 0 }
  for (const a of assignments) byBucket[a.operationalBucket] = (byBucket[a.operationalBucket] ?? 0) + 1
  return {
    meta: { semanticsVersion: '1.5' },
    collaborator: { id: collabIds[0], fullName: collaboratorName(collabIds[0]) },
    collaborators: collabIds.map((id) => ({ id, fullName: collaboratorName(id) })),
    // Mesmo formato do servidor: ISO completo nos limites do dia operacional (America/Sao_Paulo).
    period: { from: `${from}T03:00:00.000Z`, to: new Date(Date.parse(`${to}T03:00:00.000Z`) + 86400000 - 1).toISOString() },
    query: { limit: 20, conveyorId: null, periodPreset, collaboratorIds: collabIds },
    load: { assignmentCount: assignments.length, plannedMinutesOnStepsSum: planned },
    coberturaTempo: {
      ratio: planned ? realized / planned : null,
      previstoMinutosEscopo: planned,
      realizadoMinutosAcumuladoEscopo: realized,
      formula: 'realizado acumulado / previsto do escopo',
    },
    execution: { realizedMinutesInPeriod: realized, realizedMinutesTotal: realized },
    extraTimeEntriesSummary: { totalMinutes: 30, entriesCount: 1, topDescriptions: [{ descriptionId: 'xd-1', description: 'Organização da bancada', totalMinutes: 30, entriesCount: 1 }] },
    risk: { byBucket, overdueCount: atRisk.length },
    signals: { pressaoAtrasoAlocacoes: atRisk.length, pendenciaTempo: { count: pend.length, items: pend } },
    assignmentsOpen: assignments,
    assignmentsAtRisk: atRisk,
    recentTimeEntries: recent,
  }
}
