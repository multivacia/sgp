export type PolicyMode = 'economy' | 'balanced' | 'quality'

/** Contrato local alinhado a ConveyorOperationalSnapshotV1 (ARGOS R5 S1). */
export const CONVEYOR_OPERATIONAL_SNAPSHOT_VERSION = 'conveyor_operational_snapshot_v1' as const
export const CONVEYOR_OPERATIONAL_SNAPSHOT_SCHEMA_VERSION = '1.0.0' as const

export const CONVEYOR_HEALTH_METADATA_SOURCE = 'SGP_POSTGRES' as const
export const CONVEYOR_HEALTH_CALLER_SYSTEM = 'SGP' as const
export const CONVEYOR_HEALTH_INTENT = 'conveyor_health_analysis' as const

/** Policy quando o body/caller não envia valor explícito. */
export const DEFAULT_CONVEYOR_HEALTH_POLICY: PolicyMode = 'balanced'

/** Fuso para metadados do snapshot (SGP; sem stack IANA no servidor nesta sprint). */
export const CONVEYOR_HEALTH_SNAPSHOT_TIMEZONE = 'America/Sao_Paulo' as const

/** Limite por defeito para linhas em `recentActivity` (histórico completo nunca é enviado). */
export const DEFAULT_RECENT_ACTIVITY_LIMIT = 80

/** Truncagem de `notes` em previews de atividade recente (evitar payload grande). */
export const RECENT_ACTIVITY_NOTE_PREVIEW_MAX_CHARS = 240

export type ConveyorOperationalSnapshotRequestV1 = {
  requestId: string
  correlationId: string
  policy: PolicyMode
  /** ISO 8601 instantâneo do snapshot. */
  generatedAt: string
  callerSystem: typeof CONVEYOR_HEALTH_CALLER_SYSTEM
  intent: typeof CONVEYOR_HEALTH_INTENT
}

export type ConveyorOperationalStatusV1 =
  | 'no_backlog'
  | 'em_revisao'
  | 'em_andamento'
  | 'em_atraso'
  | 'concluidas'

export type ConveyorOperationalSnapshotConveyorV1 = {
  id: string
  code: string | null
  name: string
  customerName?: string | null
  vehicle?: string | null
  priority: 'alta' | 'media' | 'baixa'
  operationalStatus: ConveyorOperationalStatusV1
  completedAt: string | null
  createdAt: string
  plannedStartAt?: string | null
  plannedEndAt?: string | null
}

export type ConveyorOperationalSnapshotTotalsV1 = {
  plannedMinutes: number
  realizedMinutes: number
  pendingMinutes: number
  completionRatio: number | null
  totalOptions: number
  totalAreas: number
  totalSteps: number
  completedSteps: number
  pendingSteps: number
  unassignedSteps: number
  overdueSteps: number
  blockedSteps?: number
}

export type ConveyorStepStatusV1 = 'not_started' | 'in_progress' | 'completed' | 'overdue' | 'blocked'

export type ConveyorOperationalSnapshotAssigneeV1 = {
  type: 'COLLABORATOR' | 'TEAM'
  id: string
  name: string
  isPrimary: boolean
}

export type ConveyorOperationalSnapshotStructureStepV1 = {
  id: string
  name: string
  orderIndex: number
  plannedMinutes: number
  realizedMinutes: number
  pendingMinutes: number
  completionRatio: number | null
  status: ConveyorStepStatusV1
  plannedStartAt?: string | null
  plannedEndAt?: string | null
  completedAt?: string | null
  assignees: ConveyorOperationalSnapshotAssigneeV1[]
  hasPrimaryResponsible: boolean
  assigneeCount: number
  teamCount: number
  collaboratorCount: number
}

export type ConveyorOperationalSnapshotStructureAreaV1 = {
  id: string
  name: string
  orderIndex: number
  plannedMinutes: number
  realizedMinutes: number
  pendingMinutes: number
  completionRatio: number | null
  totalSteps: number
  completedSteps: number
  pendingSteps: number
  unassignedSteps: number
  overdueSteps: number
  steps: ConveyorOperationalSnapshotStructureStepV1[]
}

export type ConveyorOperationalSnapshotStructureOptionV1 = {
  id: string
  name: string
  orderIndex: number
  plannedMinutes: number
  realizedMinutes: number
  pendingMinutes: number
  completionRatio: number | null
  areas: ConveyorOperationalSnapshotStructureAreaV1[]
}

export type ConveyorOperationalSnapshotStructureV1 = {
  options: ConveyorOperationalSnapshotStructureOptionV1[]
}

/** Rollup por área — espelha `ConveyorNodeWorkloadAreaApi` para o envelope ARGOS. */
export type AreaExecutionSummaryV1 = {
  areaId: string
  areaName: string
  plannedMinutes: number
  realizedMinutes: number
  pendingMinutes: number
  completionRatio: number | null
  totalSteps: number
  completedSteps: number
  pendingSteps: number
  unassignedSteps: number
  overdueSteps: number
  collaboratorCount: number
  teamCount: number
}

/**
 * Execução agregada por colaborador nesta esteira (`conveyor_time_entries`).
 */
export type PeopleExecutionSummaryRowV1 = {
  collaboratorId: string
  collaboratorName: string
  assignedSteps: number
  primarySteps: number
  plannedMinutes: number
  realizedMinutes: number
  pendingMinutes: number
  completionRatio: number | null
}

/**
 * Resumo por time por **alocação em STEP** + minutos realizados **no STEP** (todos os colaboradores).
 * Não representa execução “direta” do time — apontamentos são por colaborador.
 */
export type TeamInferenceMode = 'BY_STEP_ASSIGNMENT'

export type TeamExecutionSummaryRowV1 = {
  teamId: string
  teamName: string
  assignedSteps: number
  plannedMinutes: number
  realizedMinutes: number
  pendingMinutes: number
  completionRatio: number | null
}

export type RecentActivityEntryV1 = {
  id: string
  stepId: string
  stepName: string
  collaboratorId: string
  collaboratorName: string
  minutes: number
  entryDate: string
  note?: string | null
}

export type RecentActivityV1 = {
  lastTimeEntryAt?: string | null
  lastStatusChangeAt?: string | null
  timeEntries: RecentActivityEntryV1[]
}

export type DataQualityWarningV1 = {
  code: string
  message: string
  scope: 'conveyor' | 'option' | 'area' | 'step' | 'collaborator' | 'team'
  targetId?: string
}

export type ConveyorOperationalDataQualityV1 = {
  missingPlannedMinutesSteps: number
  missingAssigneeSteps: number
  missingPrimaryResponsibleSteps: number
  inconsistentTimeEntries: number
  warnings: DataQualityWarningV1[]
}

export type ConveyorOperationalSnapshotMetadataV1 = {
  source: typeof CONVEYOR_HEALTH_METADATA_SOURCE
  snapshotVersion: typeof CONVEYOR_OPERATIONAL_SNAPSHOT_VERSION
  timezone: string
}

/** Agregações opcionais pré-calculadas (ex.: via `loadConveyorHealthAggregates`). */
export type ConveyorHealthExecutionAggregatesV1 = {
  peopleExecutionSummary: PeopleExecutionSummaryRowV1[]
  teamExecutionSummary: TeamExecutionSummaryRowV1[]
  recentActivity: RecentActivityV1
}

export type ConveyorOperationalSnapshotV1 = {
  schemaVersion: typeof CONVEYOR_OPERATIONAL_SNAPSHOT_SCHEMA_VERSION
  request: ConveyorOperationalSnapshotRequestV1
  conveyor: ConveyorOperationalSnapshotConveyorV1
  totals: ConveyorOperationalSnapshotTotalsV1
  structure: ConveyorOperationalSnapshotStructureV1
  areaExecutionSummary: AreaExecutionSummaryV1[]
  peopleExecutionSummary: PeopleExecutionSummaryRowV1[]
  teamExecutionSummary: TeamExecutionSummaryRowV1[]
  recentActivity: RecentActivityV1
  dataQuality: ConveyorOperationalDataQualityV1
  metadata: ConveyorOperationalSnapshotMetadataV1
}

/**
 * Corpo lógico da análise ARGOS — expandir quando o contrato oficial estiver versionado no repo.
 */
export type ConveyorHealthAnalysisV1 = {
  routeUsed?: string
  llmUsed?: boolean
  [key: string]: unknown
}
