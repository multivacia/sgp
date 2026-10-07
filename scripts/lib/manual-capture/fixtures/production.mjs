/** Modo Fábrica (/api/v1/production/*) — contratos de `src/domain/production/production.types.ts`. */
import { TODAY } from './common.mjs'

function summary(id, fullName, status = 'READY', teamName = 'Equipe Estofaria') {
  const parts = fullName.split(' ')
  return {
    id,
    fullName,
    name: parts[0],
    displayName: fullName,
    avatarUrl: null,
    initials: `${parts[0][0]}${parts[1]?.[0] ?? ''}`,
    teamName,
    productionCredentialStatus: status,
    mustChangePin: false,
  }
}

export const KIOSK_COLLABORATORS = [
  summary('col-carlos', 'Carlos Demo'),
  summary('col-bruno', 'Bruno Exemplo'),
  summary('col-diana', 'Diana Exemplo'),
  summary('col-eduardo', 'Eduardo Teste', 'READY', 'Acabamento'),
  summary('col-fernanda', 'Fernanda Teste', 'DISABLED'),
  summary('col-gabriel', 'Gabriel Exemplo', 'NEEDS_INITIAL_PIN', 'Montagem'),
]

function wq(o) {
  return {
    taskTitle: 'Bancos dianteiros',
    sectorTitle: 'Tapeçaria',
    plannedDate: TODAY,
    activityOperationalStatus: 'IN_PROGRESS',
    isActivityCompleted: false,
    isOverdue: false,
    isOutOfSequence: false,
    isNextRecommended: false,
    hasPreviousPendingStep: false,
    previousOpenCount: 0,
    previousOpenActivities: [],
    allPreviousOpenActivities: [],
    awaitingPreviousActivities: [],
    hasPreviousOpenActivitiesFromOtherCollaborators: false,
    previousOpenActivitiesFromOtherCollaborators: [],
    previousOpenActivitiesWarningMessage: null,
    group: 'today',
    canTrackTime: true,
    canPointTime: true,
    canCompleteStep: true,
    requiresOutOfSequenceJustification: false,
    lastSessionCompletionPct: 50,
    ...o,
    pendingMinutes: Math.max(0, o.plannedMinutes - o.realizedMinutes),
  }
}

export function productionWorkQueue({ nearLimit = false } = {}) {
  const items = [
    wq({
      workPlanItemId: 'wpi-k1',
      conveyorId: 'conv-101',
      conveyorTitle: 'ET-0101 · Reforma de bancos — Veículo Exemplo',
      activityNodeId: 'step-3',
      activityTitle: 'Recuperar espuma',
      plannedMinutes: 120,
      realizedMinutes: nearLimit ? 100 : 60,
      isNextRecommended: true,
    }),
    wq({
      workPlanItemId: 'wpi-k2',
      conveyorId: 'conv-103',
      conveyorTitle: 'ET-0103 · Painéis de porta — Veículo Exemplo',
      activityNodeId: 'step-p1',
      activityTitle: 'Desmontar painéis',
      taskTitle: 'Portas dianteiras',
      plannedMinutes: 180,
      realizedMinutes: 0,
      activityOperationalStatus: 'PENDING',
      lastSessionCompletionPct: null,
    }),
  ]
  return {
    date: TODAY,
    planStatus: 'PUBLISHED',
    summary: { plannedItemsToday: items.length, overdueItems: 0, completedItemsToday: 0 },
    items,
  }
}
