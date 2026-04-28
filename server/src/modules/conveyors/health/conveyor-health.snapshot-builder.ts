import type { ConveyorDetailApi, ConveyorStructureApi, ConveyorStructureStepApi } from '../conveyors.dto.js'
import type { ConveyorNodeWorkloadApi, ConveyorNodeWorkloadStepApi } from '../conveyorNodeWorkload.dto.js'
import {
  CONVEYOR_HEALTH_CALLER_SYSTEM,
  CONVEYOR_HEALTH_INTENT,
  CONVEYOR_HEALTH_METADATA_SOURCE,
  CONVEYOR_HEALTH_SNAPSHOT_TIMEZONE,
  CONVEYOR_OPERATIONAL_SNAPSHOT_SCHEMA_VERSION,
  CONVEYOR_OPERATIONAL_SNAPSHOT_VERSION,
  DEFAULT_CONVEYOR_HEALTH_POLICY,
  type AreaExecutionSummaryV1,
  type ConveyorHealthExecutionAggregatesV1,
  type ConveyorOperationalDataQualityV1,
  type ConveyorOperationalSnapshotAssigneeV1,
  type ConveyorOperationalSnapshotConveyorV1,
  type ConveyorOperationalSnapshotMetadataV1,
  type ConveyorOperationalSnapshotRequestV1,
  type ConveyorOperationalSnapshotStructureAreaV1,
  type ConveyorOperationalSnapshotStructureOptionV1,
  type ConveyorOperationalSnapshotStructureStepV1,
  type ConveyorOperationalSnapshotTotalsV1,
  type ConveyorOperationalSnapshotV1,
  type ConveyorOperationalStatusV1,
  type ConveyorStepStatusV1,
} from './conveyor-health.argos-types.js'

export type BuildConveyorOperationalSnapshotV1Input = {
  conveyorDetail: ConveyorDetailApi
  nodeWorkload: ConveyorNodeWorkloadApi
  policy?: 'economy' | 'balanced' | 'quality'
  requestId: string
  correlationId: string
  now: Date | string
  aggregates?: ConveyorHealthExecutionAggregatesV1
}

function toIsoInstant(now: Date | string): string {
  return typeof now === 'string' ? now : now.toISOString()
}

function safeRatio(realized: number, planned: number): number | null {
  if (planned <= 0) return null
  return Math.max(0, Math.min(1, realized / planned))
}

function workloadStepIndex(steps: ConveyorNodeWorkloadStepApi[]): Map<string, ConveyorNodeWorkloadStepApi> {
  const index = new Map<string, ConveyorNodeWorkloadStepApi>()
  for (const step of steps) index.set(step.stepId, step)
  return index
}

type OperationalStatusMapping = {
  status: ConveyorOperationalStatusV1
  usedFallback: boolean
}

function mapOperationalStatus(raw: string): OperationalStatusMapping {
  const normalized = raw.trim().toLowerCase()
  if (normalized === 'no_backlog') return { status: 'no_backlog', usedFallback: false }
  if (normalized === 'em_revisao' || normalized === 'pronta_liberar')
    return { status: 'em_revisao', usedFallback: false }
  if (normalized === 'em_andamento' || normalized === 'em_producao')
    return { status: 'em_andamento', usedFallback: false }
  if (normalized === 'em_atraso') return { status: 'em_atraso', usedFallback: false }
  if (normalized === 'concluidas' || normalized === 'concluida')
    return { status: 'concluidas', usedFallback: false }
  return { status: 'no_backlog', usedFallback: true }
}

export function toArgosOperationalStatus(raw: string): ConveyorOperationalStatusV1 {
  return mapOperationalStatus(raw).status
}

function mapConveyor(
  detail: ConveyorDetailApi,
  operationalStatus: ConveyorOperationalStatusV1,
): ConveyorOperationalSnapshotConveyorV1 {
  return {
    id: detail.id,
    code: detail.code,
    name: detail.name,
    customerName: detail.clientName,
    vehicle: detail.vehicle,
    priority: detail.priority,
    operationalStatus,
    createdAt: detail.createdAt,
    completedAt: detail.completedAt,
  }
}

function mapAssignees(step: ConveyorStructureStepApi): ConveyorOperationalSnapshotAssigneeV1[] {
  return step.assignees
    .map((assignee) => {
      const id = assignee.type === 'COLLABORATOR' ? assignee.collaboratorId : assignee.teamId
      const name = assignee.type === 'COLLABORATOR' ? assignee.collaboratorName : assignee.teamName
      if (!id || !name) return null
      return { type: assignee.type, id, name, isPrimary: assignee.isPrimary }
    })
    .filter((entry): entry is ConveyorOperationalSnapshotAssigneeV1 => entry !== null)
}

function mapStepStatus(step: { realizedMinutes: number; pendingMinutes: number }, isOverdueContext: boolean): ConveyorStepStatusV1 {
  if (step.pendingMinutes <= 0 && step.realizedMinutes > 0) return 'completed'
  if (isOverdueContext && step.pendingMinutes > 0) return 'overdue'
  if (step.realizedMinutes > 0) return 'in_progress'
  return 'not_started'
}

type BuildComputed = {
  structure: { options: ConveyorOperationalSnapshotStructureOptionV1[] }
  totals: ConveyorOperationalSnapshotTotalsV1
  areaExecutionSummary: AreaExecutionSummaryV1[]
  dataQuality: ConveyorOperationalDataQualityV1
}

function buildComputed(
  structure: ConveyorStructureApi,
  byStep: Map<string, ConveyorNodeWorkloadStepApi>,
  isOverdueContext: boolean,
  unknownOperationalStatusFallbackApplied: boolean,
): BuildComputed {
  let plannedMinutes = 0
  let realizedMinutes = 0
  let pendingMinutes = 0
  let completedSteps = 0
  let pendingSteps = 0
  let unassignedSteps = 0
  let overdueSteps = 0
  let missingPlannedMinutesSteps = 0
  let missingAssigneeSteps = 0
  let missingPrimaryResponsibleSteps = 0
  let inconsistentTimeEntries = 0
  const warnings: ConveyorOperationalDataQualityV1['warnings'] = []
  const areaExecutionSummary: AreaExecutionSummaryV1[] = []

  const options = structure.options.map((option): ConveyorOperationalSnapshotStructureOptionV1 => {
    const areas = option.areas.map((area): ConveyorOperationalSnapshotStructureAreaV1 => {
      const steps = area.steps.map((step): ConveyorOperationalSnapshotStructureStepV1 => {
        const workload = byStep.get(step.id)
        const stepPlannedMinutes = Math.max(0, step.plannedMinutes ?? 0)
        const stepRealizedMinutes = Math.max(0, workload?.realizedMinutes ?? 0)
        const stepPendingMinutes = Math.max(
          0,
          workload?.pendingMinutes ?? Math.max(0, stepPlannedMinutes - stepRealizedMinutes),
        )
        const assignees = mapAssignees(step)
        const hasPrimaryResponsible = assignees.some((assignee) => assignee.isPrimary)
        const status = mapStepStatus(
          { realizedMinutes: stepRealizedMinutes, pendingMinutes: stepPendingMinutes },
          isOverdueContext,
        )
        if (step.plannedMinutes == null) missingPlannedMinutesSteps++
        if (assignees.length === 0) missingAssigneeSteps++
        if (!hasPrimaryResponsible) missingPrimaryResponsibleSteps++
        if (stepRealizedMinutes > stepPlannedMinutes) inconsistentTimeEntries++
        if (status === 'completed') completedSteps++
        else pendingSteps++
        if (assignees.length === 0) unassignedSteps++
        if (status === 'overdue') overdueSteps++
        return {
          id: step.id,
          name: step.name,
          orderIndex: step.orderIndex,
          plannedMinutes: stepPlannedMinutes,
          realizedMinutes: stepRealizedMinutes,
          pendingMinutes: stepPendingMinutes,
          completionRatio: safeRatio(stepRealizedMinutes, stepPlannedMinutes),
          status,
          assignees,
          hasPrimaryResponsible,
          assigneeCount: assignees.length,
          teamCount: assignees.filter((assignee) => assignee.type === 'TEAM').length,
          collaboratorCount: assignees.filter((assignee) => assignee.type === 'COLLABORATOR').length,
        }
      })

      const areaPlannedMinutes = steps.reduce((sum, step) => sum + step.plannedMinutes, 0)
      const areaRealizedMinutes = steps.reduce((sum, step) => sum + step.realizedMinutes, 0)
      const areaPendingMinutes = steps.reduce((sum, step) => sum + step.pendingMinutes, 0)
      const areaCompletedSteps = steps.filter((step) => step.status === 'completed').length
      const areaPendingSteps = steps.length - areaCompletedSteps
      const areaUnassignedSteps = steps.filter((step) => step.assigneeCount === 0).length
      const areaOverdueSteps = steps.filter((step) => step.status === 'overdue').length
      const areaCollaboratorCount = new Set(
        steps.flatMap((step) =>
          step.assignees
            .filter((assignee) => assignee.type === 'COLLABORATOR')
            .map((assignee) => assignee.id),
        ),
      ).size
      const areaTeamCount = new Set(
        steps.flatMap((step) =>
          step.assignees.filter((assignee) => assignee.type === 'TEAM').map((assignee) => assignee.id),
        ),
      ).size

      plannedMinutes += areaPlannedMinutes
      realizedMinutes += areaRealizedMinutes
      pendingMinutes += areaPendingMinutes

      areaExecutionSummary.push({
        areaId: area.id,
        areaName: area.name,
        plannedMinutes: areaPlannedMinutes,
        realizedMinutes: areaRealizedMinutes,
        pendingMinutes: areaPendingMinutes,
        completionRatio: safeRatio(areaRealizedMinutes, areaPlannedMinutes),
        totalSteps: steps.length,
        completedSteps: areaCompletedSteps,
        pendingSteps: areaPendingSteps,
        unassignedSteps: areaUnassignedSteps,
        overdueSteps: areaOverdueSteps,
        collaboratorCount: areaCollaboratorCount,
        teamCount: areaTeamCount,
      })

      return {
        id: area.id,
        name: area.name,
        orderIndex: area.orderIndex,
        plannedMinutes: areaPlannedMinutes,
        realizedMinutes: areaRealizedMinutes,
        pendingMinutes: areaPendingMinutes,
        completionRatio: safeRatio(areaRealizedMinutes, areaPlannedMinutes),
        totalSteps: steps.length,
        completedSteps: areaCompletedSteps,
        pendingSteps: areaPendingSteps,
        unassignedSteps: areaUnassignedSteps,
        overdueSteps: areaOverdueSteps,
        steps,
      }
    })
    const optionPlannedMinutes = areas.reduce((sum, area) => sum + area.plannedMinutes, 0)
    const optionRealizedMinutes = areas.reduce((sum, area) => sum + area.realizedMinutes, 0)
    const optionPendingMinutes = areas.reduce((sum, area) => sum + area.pendingMinutes, 0)
    return {
      id: option.id,
      name: option.name,
      orderIndex: option.orderIndex,
      plannedMinutes: optionPlannedMinutes,
      realizedMinutes: optionRealizedMinutes,
      pendingMinutes: optionPendingMinutes,
      completionRatio: safeRatio(optionRealizedMinutes, optionPlannedMinutes),
      areas,
    }
  })

  if (inconsistentTimeEntries > 0) {
    warnings.push({
      code: 'inconsistent_time_entries',
      message: `${inconsistentTimeEntries} step(s) com realizado maior que planejado`,
      scope: 'conveyor',
    })
  }
  if (unknownOperationalStatusFallbackApplied) {
    warnings.push({
      code: 'unknown_operational_status_fallback',
      message: 'operationalStatus desconhecido recebido do SGP; aplicado fallback para no_backlog.',
      scope: 'conveyor',
    })
  }

  return {
    structure: { options },
    totals: {
      plannedMinutes,
      realizedMinutes,
      pendingMinutes,
      completionRatio: safeRatio(realizedMinutes, plannedMinutes),
      totalOptions: options.length,
      totalAreas: options.reduce((sum, option) => sum + option.areas.length, 0),
      totalSteps: completedSteps + pendingSteps,
      completedSteps,
      pendingSteps,
      unassignedSteps,
      overdueSteps,
    },
    areaExecutionSummary,
    dataQuality: {
      missingPlannedMinutesSteps,
      missingAssigneeSteps,
      missingPrimaryResponsibleSteps,
      inconsistentTimeEntries,
      warnings,
    },
  }
}

function buildMetadata(): ConveyorOperationalSnapshotMetadataV1 {
  return {
    source: CONVEYOR_HEALTH_METADATA_SOURCE,
    snapshotVersion: CONVEYOR_OPERATIONAL_SNAPSHOT_VERSION,
    timezone: CONVEYOR_HEALTH_SNAPSHOT_TIMEZONE,
  }
}

function buildRequest(input: BuildConveyorOperationalSnapshotV1Input): ConveyorOperationalSnapshotRequestV1 {
  return {
    requestId: input.requestId,
    correlationId: input.correlationId,
    generatedAt: toIsoInstant(input.now),
    callerSystem: CONVEYOR_HEALTH_CALLER_SYSTEM,
    intent: CONVEYOR_HEALTH_INTENT,
    policy: input.policy ?? DEFAULT_CONVEYOR_HEALTH_POLICY,
  }
}

export function buildConveyorOperationalSnapshotV1(
  input: BuildConveyorOperationalSnapshotV1Input,
): ConveyorOperationalSnapshotV1 {
  const operationalStatus = mapOperationalStatus(input.conveyorDetail.operationalStatus)
  const byStep = workloadStepIndex(input.nodeWorkload.steps)
  const computed = buildComputed(
    input.conveyorDetail.structure,
    byStep,
    input.nodeWorkload.conveyor.isOverdueContext,
    operationalStatus.usedFallback,
  )

  return {
    schemaVersion: CONVEYOR_OPERATIONAL_SNAPSHOT_SCHEMA_VERSION,
    request: buildRequest(input),
    conveyor: mapConveyor(input.conveyorDetail, operationalStatus.status),
    totals: computed.totals,
    structure: computed.structure,
    areaExecutionSummary: computed.areaExecutionSummary,
    peopleExecutionSummary: input.aggregates?.peopleExecutionSummary ?? [],
    teamExecutionSummary: input.aggregates?.teamExecutionSummary ?? [],
    recentActivity: input.aggregates?.recentActivity ?? { timeEntries: [] },
    dataQuality: computed.dataQuality,
    metadata: buildMetadata(),
  }
}
