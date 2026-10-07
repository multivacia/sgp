/** Candidatos de apontamento (GET /me/time-entry-candidates) e justificativas padronizadas. */

function cand(o) {
  return {
    conveyorId: 'conv-101',
    conveyorCode: 'ET-0101',
    conveyorName: 'Reforma de bancos — Veículo Exemplo',
    clientName: 'Cliente Exemplo',
    vehicleLabel: 'Veículo Exemplo',
    plate: 'ABC1D23',
    taskTitle: 'Bancos dianteiros',
    areaName: 'Tapeçaria',
    sectorTitle: 'Tapeçaria',
    roleInStep: 'primary',
    assignmentType: 'COLLABORATOR',
    plannedQuantity: 1,
    isAssignedToMe: true,
    requiresJustification: false,
    isOutOfSequence: false,
    hasPreviousPendingStep: false,
    requiresOutOfSequenceJustification: false,
    canPointTime: true,
    previousOpenCount: 0,
    previousOpenActivities: [],
    allPreviousOpenActivities: [],
    awaitingPreviousActivities: [],
    canCompleteStep: true,
    plannedDate: '2026-07-01',
    isOverdue: false,
    ...o,
    stepName: o.activityTitle,
    plannedTotalMinutes: o.plannedMinutes,
    pendingMinutes: Math.max(0, o.plannedMinutes - o.realizedMinutes),
  }
}

const PREV_OPEN = [
  { taskTitle: 'Portas dianteiras', sectorTitle: 'Tapeçaria', activityTitle: 'Desmontar painéis' },
  { taskTitle: 'Portas dianteiras', sectorTitle: 'Tapeçaria', activityTitle: 'Remover forro antigo' },
]

export const TIME_ENTRY_CANDIDATES = [
  cand({ stepNodeId: 'step-3', activityTitle: 'Recuperar espuma', plannedMinutes: 120, realizedMinutes: 60 }),
  cand({ stepNodeId: 'step-7', activityTitle: 'Costurar capas', sectorTitle: 'Costura', areaName: 'Costura', plannedMinutes: 150, realizedMinutes: 75 }),
  cand({
    conveyorId: 'conv-103',
    conveyorCode: 'ET-0103',
    conveyorName: 'Painéis de porta — Veículo Exemplo',
    plate: 'DEF2G34',
    taskTitle: 'Portas dianteiras',
    stepNodeId: 'step-p3',
    activityTitle: 'Revestir painéis',
    plannedMinutes: 120,
    realizedMinutes: 0,
    isOutOfSequence: true,
    hasPreviousPendingStep: true,
    sequenceWarningType: 'PREVIOUS_STEP_PENDING',
    sequenceWarningLabel: 'Há atividades anteriores pendentes',
    requiresOutOfSequenceJustification: true,
    previousOpenCount: 2,
    previousOpenActivities: PREV_OPEN,
    allPreviousOpenActivities: PREV_OPEN,
    awaitingPreviousActivities: PREV_OPEN,
  }),
  cand({
    conveyorId: 'conv-102',
    conveyorCode: 'ET-0102',
    conveyorName: 'Revestimento de teto — Veículo Exemplo',
    plate: 'GHI3J45',
    taskTitle: 'Teto',
    stepNodeId: 'step-t2',
    activityTitle: 'Aplicar tecido',
    plannedMinutes: 120,
    realizedMinutes: 30,
    roleInStep: 'support',
    isAssignedToMe: false,
    requiresJustification: true,
    plannedDate: null,
  }),
]

export const JUSTIFICATIONS = [
  { id: 'just-1', label: 'Atividade anterior aguardando material', description: null, category: 'SEQUENCE', requiresComplement: false, sortOrder: 1 },
  { id: 'just-2', label: 'Substituição de colega ausente', description: null, category: 'SUBSTITUTION', requiresComplement: false, sortOrder: 2 },
  { id: 'just-3', label: 'Retrabalho solicitado pela qualidade', description: null, category: null, requiresComplement: true, sortOrder: 3 },
  { id: 'just-4', label: 'Outro motivo', description: null, category: null, requiresComplement: true, sortOrder: 9 },
]
