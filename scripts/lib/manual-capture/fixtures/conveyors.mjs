/** Esteiras fictícias (lista do painel e detalhe) — contratos de `src/domain/conveyors/conveyor.types.ts`. */

function li(id, code, name, status, extra = {}) {
  return {
    id,
    code,
    name,
    clientName: 'Cliente Exemplo',
    responsible: 'Ana Demo',
    priority: 'media',
    originRegister: 'BASE',
    createdAt: '2026-06-15T12:00:00.000Z',
    operationalStatus: status,
    completedAt: null,
    estimatedDeadline: '2026-07-10',
    totalSteps: 12,
    ...extra,
  }
}

export const CONVEYOR_LIST = [
  li('conv-101', 'ET-0101', 'Reforma de bancos — Veículo Exemplo', 'EM_ANDAMENTO', { priority: 'alta', totalSteps: 9 }),
  li('conv-102', 'ET-0102', 'Revestimento de teto — Veículo Exemplo', 'A_INICIAR', { estimatedDeadline: '2026-07-09' }),
  li('conv-103', 'ET-0103', 'Painéis de porta — Veículo Exemplo', 'EM_ANDAMENTO', { estimatedDeadline: '2026-07-06', responsible: 'Carlos Demo' }),
  li('conv-104', 'ET-0104', 'Volante em couro — Veículo Exemplo', 'EM_ANDAMENTO', { estimatedDeadline: '2026-06-26', priority: 'alta' }),
  li('conv-105', 'ET-0105', 'Carpete completo — Veículo Exemplo', 'EM_PLANEJAMENTO', { estimatedDeadline: '2026-07-17' }),
  li('conv-106', 'ET-0106', 'Bancos traseiros — Veículo Exemplo', 'AGUARDANDO_PLANEJAMENTO', { estimatedDeadline: '2026-07-20', priority: 'baixa' }),
  li('conv-107', 'ET-0107', 'Console central — Veículo Exemplo', 'EM_ELABORACAO', { estimatedDeadline: null, originRegister: 'MANUAL' }),
  li('conv-108', 'ET-0108', 'Forro de porta-malas — Veículo Exemplo', 'FINALIZADA', { completedAt: '2026-06-27T19:00:00.000Z', estimatedDeadline: '2026-06-30' }),
  li('conv-109', 'ET-0109', 'Tapetes personalizados — Veículo Exemplo', 'A_INICIAR', { estimatedDeadline: '2026-06-29' }),
]

function step(id, name, orderIndex, plannedMinutes, status = 'PENDING', extra = {}) {
  const done = status === 'COMPLETED'
  return {
    id,
    name,
    orderIndex: orderIndex + 1,
    plannedMinutes,
    plannedQuantity: 1,
    assignees: [
      {
        type: 'COLLABORATOR',
        collaboratorId: 'col-carlos',
        collaboratorName: 'Carlos Demo',
        teamId: null,
        teamName: null,
        isPrimary: true,
        orderIndex: 0,
      },
    ],
    operationalStatus: status,
    isCompleted: done,
    completedAt: done ? '2026-06-30T18:00:00.000Z' : null,
    completedByName: done ? 'Carlos Demo' : null,
    completionEventId: done ? `evt-${id}` : null,
    abortedAt: null,
    abortedByName: null,
    abortReasonCode: null,
    abortReasonText: null,
    abortReasonLabelSnapshot: null,
    ...extra,
  }
}

/** Detalhe da esteira ET-0101 (em andamento) — 1 tarefa, 2 setores, atividades com tempo. */
export function conveyorDetail(overrides = {}) {
  const structure = {
    options: [
      {
        id: 'opt-1',
        name: 'Bancos dianteiros',
        orderIndex: 1,
        areas: [
          {
            id: 'area-1',
            name: 'Tapeçaria',
            orderIndex: 1,
            steps: [
              step('step-1', 'Desmontar bancos', 0, 60, 'COMPLETED'),
              step('step-2', 'Remover revestimento antigo', 1, 90, 'COMPLETED'),
              step('step-3', 'Recuperar espuma', 2, 120, 'IN_PROGRESS'),
              step('step-4', 'Aplicar manta acústica', 3, 45, 'ABORTED', {
                abortedAt: '2026-06-30T15:00:00.000Z',
                abortedByName: 'Ana Demo',
                abortReasonCode: 'NOT_REQUIRED',
                abortReasonText: 'Cliente optou por não aplicar.',
                abortReasonLabelSnapshot: 'Não necessário',
              }),
              step('step-5', 'Revestir assentos', 4, 180),
            ],
          },
          {
            id: 'area-2',
            name: 'Costura',
            orderIndex: 2,
            steps: [
              step('step-6', 'Cortar couro', 0, 90, 'COMPLETED'),
              step('step-7', 'Costurar capas', 1, 150, 'IN_PROGRESS'),
              step('step-8', 'Pespontar detalhes', 2, 60),
            ],
          },
        ],
      },
      {
        id: 'opt-2',
        name: 'Montagem final',
        orderIndex: 2,
        areas: [
          {
            id: 'area-3',
            name: 'Montagem',
            orderIndex: 1,
            steps: [step('step-9', 'Reinstalar bancos', 0, 60)],
          },
        ],
      },
    ],
  }
  const steps = structure.options.flatMap((o) => o.areas.flatMap((a) => a.steps))
  return {
    id: 'conv-101',
    code: 'ET-0101',
    name: 'Reforma de bancos — Veículo Exemplo',
    clientName: 'Cliente Exemplo',
    vehicle: 'Veículo Exemplo',
    modelVersion: 'Sedã 2.0',
    plate: 'ABC1D23',
    initialNotes: 'Couro sintético preto, pesponto cinza.',
    responsible: 'Ana Demo',
    priority: 'alta',
    originRegister: 'BASE',
    baseRefSnapshot: null,
    baseCodeSnapshot: 'BASE-BANCOS',
    baseNameSnapshot: 'Reforma de bancos',
    baseVersionSnapshot: 1,
    matrixRootItemId: null,
    operationalStatus: 'EM_ANDAMENTO',
    createdAt: '2026-06-15T12:00:00.000Z',
    completedAt: null,
    estimatedDeadline: '2026-07-10',
    totalOptions: structure.options.length,
    totalAreas: structure.options.reduce((n, o) => n + o.areas.length, 0),
    totalSteps: steps.length,
    totalPlannedMinutes: steps.reduce((n, s) => n + (s.plannedMinutes ?? 0), 0),
    structure,
    ...overrides,
  }
}

const REALIZED_BY_STATUS = { COMPLETED: 1, IN_PROGRESS: 0.5 }

function allSteps(detail) {
  return detail.structure.options.flatMap((o) =>
    o.areas.flatMap((a) => a.steps.map((s) => ({ option: o, area: a, step: s }))),
  )
}

export function realizedMinutesFor(s) {
  return Math.round((s.plannedMinutes ?? 0) * (REALIZED_BY_STATUS[s.operationalStatus] ?? 0))
}

/** GET /conveyors/:id/node-workload — derivado da estrutura do detalhe. */
export function nodeWorkload(detail) {
  const steps = allSteps(detail).map(({ option, area, step: s }) => {
    const planned = s.operationalStatus === 'ABORTED' ? 0 : s.plannedMinutes ?? 0
    const realized = realizedMinutesFor(s)
    return {
      optionId: option.id,
      optionName: option.name,
      areaId: area.id,
      areaName: area.name,
      stepId: s.id,
      stepName: s.name,
      operationalStatus: s.operationalStatus,
      isOperationallyCompleted: s.operationalStatus === 'COMPLETED' || s.operationalStatus === 'ABORTED',
      plannedMinutes: s.plannedMinutes,
      realizedMinutes: realized,
      pendingMinutes: Math.max(0, planned - realized),
    }
  })
  const areas = detail.structure.options.flatMap((o) =>
    o.areas.map((a) => {
      const own = steps.filter((x) => x.areaId === a.id)
      return {
        optionId: o.id,
        optionName: o.name,
        areaId: a.id,
        areaName: a.name,
        plannedMinutesSum: own.reduce((n, x) => n + (x.operationalStatus === 'ABORTED' ? 0 : x.plannedMinutes ?? 0), 0),
        realizedMinutesSum: own.reduce((n, x) => n + x.realizedMinutes, 0),
        pendingMinutesSum: own.reduce((n, x) => n + x.pendingMinutes, 0),
      }
    }),
  )
  return {
    semanticsVersion: '1.5',
    conveyorId: detail.id,
    conveyor: { operationalBucket: 'em_execucao', isOverdueContext: false },
    steps,
    areas,
    notes: '',
  }
}

/** GET /conveyors/:id/steps/:stepId/time-entries */
export function stepTimeEntries(detail, stepId) {
  const s = allSteps(detail).find((x) => x.step.id === stepId)?.step
  if (!s) return []
  const minutes = realizedMinutesFor(s)
  if (!minutes) return []
  return [
    {
      id: `te-${stepId}`,
      collaboratorId: 'col-carlos',
      collaboratorName: 'Carlos Demo',
      conveyorNodeAssigneeId: `asg-${stepId}`,
      minutes,
      executedQuantity: s.operationalStatus === 'COMPLETED' ? 1 : null,
      notes: null,
      entryMode: 'manual',
      entryOrigin: 'ASSIGNED',
      exceptionJustification: null,
      isOutOfSequence: false,
      outOfSequenceJustification: null,
      entryAt: '2026-06-30T14:00:00.000Z',
      createdAt: '2026-06-30T14:00:00.000Z',
      updatedAt: '2026-06-30T14:00:00.000Z',
      isDelegated: false,
      recordedByAppUserId: 'user-carlos-demo',
      recordedByUserEmail: 'carlos.demo@sgp.example',
      delegationReason: null,
    },
  ]
}

/** GET /conveyors/:id/steps/:stepId/assignees */
export function stepAssignees(detail, stepId) {
  const s = allSteps(detail).find((x) => x.step.id === stepId)?.step
  return (s?.assignees ?? []).map((a, i) => ({
    id: `asg-${stepId}-${i}`,
    ...a,
    assignmentOrigin: 'base',
    orderIndex: i,
    createdAt: '2026-06-15T12:00:00.000Z',
    updatedAt: '2026-06-15T12:00:00.000Z',
  }))
}

export function operationalEvents(detail) {
  return [
    {
      eventId: 'oe-1',
      conveyorId: detail.id,
      nodeId: 'step-2',
      eventType: 'CONVEYOR_STEP_COMPLETED',
      previousValue: 'IN_PROGRESS',
      newValue: 'COMPLETED',
      reason: null,
      source: 'USER_ACTION',
      occurredAt: '2026-06-30T18:00:00.000Z',
      createdAt: '2026-06-30T18:00:00.000Z',
      metadataJson: { stepName: 'Remover revestimento antigo' },
    },
    {
      eventId: 'oe-2',
      conveyorId: detail.id,
      nodeId: 'step-1',
      eventType: 'CONVEYOR_STEP_COMPLETED',
      previousValue: 'IN_PROGRESS',
      newValue: 'COMPLETED',
      reason: null,
      source: 'USER_ACTION',
      occurredAt: '2026-06-29T17:30:00.000Z',
      createdAt: '2026-06-29T17:30:00.000Z',
      metadataJson: { stepName: 'Desmontar bancos' },
    },
  ]
}
