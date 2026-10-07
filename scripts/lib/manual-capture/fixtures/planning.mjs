/**
 * Semana operacional fictícia (29/06–03/07/2026) — contratos de
 * `src/domain/operational-planning/operational-planning.types.ts`.
 * Compartilhada por Planejamento semanal (cap. 8) e Agenda da semana (cap. 9).
 */
import { WEEKDAYS, WEEK_END, WEEK_START, collaboratorName } from './common.mjs'

let seq = 0
function item(collab, date, conveyor, activity, minutes, o = {}) {
  seq += 1
  return {
    id: `wpi-${String(seq).padStart(2, '0')}`,
    conveyorId: conveyor.id,
    conveyorTitle: conveyor.title,
    activityNodeId: `${conveyor.id}-act-${seq}`,
    taskTitle: conveyor.task,
    sectorTitle: o.sector ?? 'Tapeçaria',
    activityTitle: activity,
    assignedCollaboratorId: collab,
    assignedCollaboratorName: collaboratorName(collab),
    plannedDate: date,
    plannedOrder: o.order ?? 0,
    plannedMinutes: minutes,
    status: 'ACTIVE',
    notes: null,
    realizedMinutes: o.realized ?? 0,
    activityOperationalStatus: o.opStatus ?? 'PENDING',
    conveyorOperationalPlanItemId: o.cpi ?? null,
    syncStatus: o.syncStatus ?? null,
    syncDifferences: o.syncDifferences ?? [],
  }
}

const C101 = { id: 'conv-101', title: 'ET-0101 · Reforma de bancos — Veículo Exemplo', task: 'Bancos dianteiros' }
const C102 = { id: 'conv-102', title: 'ET-0102 · Revestimento de teto — Veículo Exemplo', task: 'Teto' }
const C103 = { id: 'conv-103', title: 'ET-0103 · Painéis de porta — Veículo Exemplo', task: 'Portas dianteiras' }
const C104 = { id: 'conv-104', title: 'ET-0104 · Volante em couro — Veículo Exemplo', task: 'Volante' }

const [MON, TUE, WED, THU, FRI] = WEEKDAYS

export function planItems() {
  seq = 0
  return [
    item('col-carlos', MON, C101, 'Desmontar bancos', 60, { realized: 60, opStatus: 'COMPLETED' }),
    item('col-carlos', MON, C101, 'Remover revestimento antigo', 90, { order: 1, realized: 90, opStatus: 'COMPLETED' }),
    item('col-carlos', TUE, C101, 'Recuperar espuma', 120, { realized: 60, opStatus: 'IN_PROGRESS' }),
    item('col-carlos', WED, C103, 'Desmontar painéis', 180, { realized: 0 }),
    item('col-carlos', WED, C101, 'Aplicar manta acústica', 240, { order: 1 }),
    item('col-carlos', THU, C101, 'Revestir assentos', 180),
    item('col-bruno', MON, C101, 'Cortar couro', 90, { sector: 'Costura', realized: 90, opStatus: 'COMPLETED' }),
    item('col-bruno', TUE, C101, 'Costurar capas', 150, { sector: 'Costura', realized: 75, opStatus: 'IN_PROGRESS' }),
    item('col-bruno', THU, C101, 'Pespontar detalhes', 60, { sector: 'Costura' }),
    item('col-diana', TUE, C102, 'Remover forro', 60, {
      cpi: 'cpi-1',
      syncStatus: 'DIVERGED',
      syncDifferences: [
        {
          code: 'PLANNED_MINUTES_CHANGED',
          message: 'Minutos planejados diferentes do Plano da Esteira.',
          planValue: '60',
          factoryValue: '90',
        },
      ],
    }),
    item('col-diana', WED, C102, 'Aplicar tecido', 120, { cpi: 'cpi-2', syncStatus: 'SYNCED' }),
    item('col-eduardo', THU, C104, 'Revestir volante', 150, { sector: 'Acabamento' }),
    item('col-eduardo', FRI, C104, 'Costurar volante', 120, { sector: 'Acabamento' }),
  ]
}

export function capacityFor(items, capacity = 480) {
  const out = []
  for (const c of ['col-carlos', 'col-bruno', 'col-diana', 'col-eduardo', 'col-fernanda', 'col-ana']) {
    for (const d of WEEKDAYS) {
      out.push({
        collaboratorId: c,
        date: d,
        capacityMinutes: capacity,
        plannedMinutes: items.filter((i) => i.assignedCollaboratorId === c && i.plannedDate === d).reduce((n, i) => n + (i.plannedMinutes ?? 0), 0),
      })
    }
  }
  return out
}

export const OUTSIDE_PLAN_ENTRIES = [
  {
    id: 'ope-1',
    conveyorId: 'conv-103',
    conveyorTitle: 'ET-0103 · Painéis de porta — Veículo Exemplo',
    activityNodeId: 'conv-103-act-x',
    activityTitle: 'Revestir painéis',
    taskTitle: 'Portas dianteiras',
    sectorTitle: 'Tapeçaria',
    collaboratorId: 'col-fernanda',
    collaboratorName: 'Fernanda Teste',
    entryAt: '2026-06-30T16:00:00.000Z',
    minutes: 45,
    entryOrigin: 'UNASSIGNED_EXCEPTION',
    exceptionJustification: 'Substituição de colega ausente',
    notes: null,
  },
]

/** GET /operational-planning/week */
export function weekPayload({ status = 'DRAFT', revision = true, items = planItems(), outside = OUTSIDE_PLAN_ENTRIES } = {}) {
  const planned = items.reduce((n, i) => n + (i.plannedMinutes ?? 0), 0)
  return {
    hasPlan: true,
    week: { weekStartDate: WEEK_START, weekEndDate: WEEK_END, weekdayDates: WEEKDAYS },
    plan: {
      id: 'plan-2026-w27',
      weekStartDate: WEEK_START,
      weekEndDate: WEEK_END,
      status,
      publishedAt: status === 'PUBLISHED' ? '2026-06-26T20:00:00.000Z' : null,
      items,
      createdAt: '2026-06-24T12:00:00.000Z',
      updatedAt: '2026-06-30T12:00:00.000Z',
    },
    summary: {
      plannedMinutes: planned,
      plannedItems: items.length,
      collaboratorsCount: new Set(items.map((i) => i.assignedCollaboratorId)).size,
    },
    capacityByCollaboratorDay: capacityFor(items),
    executionOutsidePlanSummary: {
      totalMinutes: outside.reduce((n, e) => n + e.minutes, 0),
      entriesCount: outside.length,
      activitiesCount: outside.length,
      conveyorsCount: new Set(outside.map((e) => e.conveyorId)).size,
    },
    executionOutsidePlanEntries: outside,
    revision: {
      hasActivePublished: revision,
      activePublishedPlanId: revision ? 'plan-2026-w27-pub' : null,
      activePublishedAt: revision ? '2026-06-26T20:00:00.000Z' : null,
      hasUnpublishedRevision: revision,
    },
  }
}

function backlogItem(o) {
  return {
    clientName: 'Cliente Exemplo',
    vehicleDescription: 'Veículo Exemplo',
    licensePlate: 'ABC1D23',
    sectorTitle: 'Tapeçaria',
    realizedMinutes: 0,
    assignedTeams: [],
    isOutOfSequence: false,
    previousOpenCount: 0,
    isOverdue: false,
    hasAssignees: true,
    ...o,
    pendingMinutes: Math.max(0, o.plannedMinutes - (o.realizedMinutes ?? 0)),
  }
}

/** GET /operational-planning/backlog */
export function backlogPayload() {
  return {
    items: [
      backlogItem({
        conveyorId: 'conv-109',
        conveyorTitle: 'ET-0109 · Tapetes personalizados — Veículo Exemplo',
        licensePlate: 'JKL4M56',
        taskTitle: 'Tapetes',
        activityNodeId: 'conv-109-a1',
        activityTitle: 'Cortar tapetes',
        plannedMinutes: 120,
        realizedMinutes: 30,
        assignedCollaborators: [
          { id: 'col-carlos', fullName: 'Carlos Demo' },
          { id: 'col-diana', fullName: 'Diana Exemplo' },
        ],
        isOverdue: true,
      }),
      backlogItem({
        conveyorId: 'conv-109',
        conveyorTitle: 'ET-0109 · Tapetes personalizados — Veículo Exemplo',
        licensePlate: 'JKL4M56',
        taskTitle: 'Tapetes',
        activityNodeId: 'conv-109-a2',
        activityTitle: 'Debruar tapetes',
        sectorTitle: 'Costura',
        plannedMinutes: 90,
        assignedCollaborators: [{ id: 'col-bruno', fullName: 'Bruno Exemplo' }],
        isOutOfSequence: true,
        previousOpenCount: 1,
      }),
      backlogItem({
        conveyorId: 'conv-102',
        conveyorTitle: 'ET-0102 · Revestimento de teto — Veículo Exemplo',
        licensePlate: 'GHI3J45',
        taskTitle: 'Teto',
        activityNodeId: 'conv-102-a3',
        activityTitle: 'Instalar luz de cortesia',
        sectorTitle: 'Montagem',
        plannedMinutes: 45,
        assignedCollaborators: [],
        hasAssignees: false,
      }),
      backlogItem({
        conveyorId: 'conv-104',
        conveyorTitle: 'ET-0104 · Volante em couro — Veículo Exemplo',
        licensePlate: 'MNO5P67',
        taskTitle: 'Volante',
        activityNodeId: 'conv-104-a3',
        activityTitle: 'Acabamento final do volante',
        sectorTitle: 'Acabamento',
        plannedMinutes: 60,
        assignedCollaborators: [{ id: 'col-eduardo', fullName: 'Eduardo Teste' }],
      }),
    ],
    meta: { limit: 100 },
  }
}

/** GET /operational-planning/factory-intake */
export function factoryIntakePayload() {
  return {
    items: [
      {
        conveyorOperationalPlanId: 'cop-105',
        conveyorOperationalPlanItemId: 'cpi-105-1',
        conveyorId: 'conv-105',
        conveyorName: 'ET-0105 · Carpete completo — Veículo Exemplo',
        activityNodeId: 'conv-105-a1',
        plannedDate: THU,
        plannedOrder: 0,
        plannedMinutes: 120,
        plannedCollaboratorId: 'col-diana',
        plannedCollaboratorName: 'Diana Exemplo',
        plannedTeamId: null,
        plannedTeamName: null,
        taskTitle: 'Carpete',
        sectorTitle: 'Tapeçaria',
        activityTitle: 'Remover carpete antigo',
        activityOperationalStatus: 'PENDING',
        realizedMinutes: 0,
        reviewRequired: false,
        syncStatus: 'PENDING',
        factoryPlanningStatus: 'NOT_SCHEDULED',
        operationalPlanStatus: 'APPROVED',
        planItemStatus: 'PLANNED',
        totalPlanItems: 3,
        linkedPlanItems: 0,
        pendingPlanItems: 3,
      },
    ],
  }
}
