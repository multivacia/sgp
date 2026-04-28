import { z } from 'zod'
import {
  CONVEYOR_HEALTH_CALLER_SYSTEM,
  CONVEYOR_HEALTH_INTENT,
  CONVEYOR_HEALTH_METADATA_SOURCE,
  CONVEYOR_OPERATIONAL_SNAPSHOT_SCHEMA_VERSION,
  CONVEYOR_OPERATIONAL_SNAPSHOT_VERSION,
} from './conveyor-health.argos-types.js'

const isoDateString = z.string().min(1)

const assigneeSchema = z.object({
  type: z.enum(['COLLABORATOR', 'TEAM']),
  id: z.string().min(1),
  name: z.string().min(1),
  isPrimary: z.boolean(),
})

const stepSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  orderIndex: z.number().int(),
  plannedMinutes: z.number().finite(),
  realizedMinutes: z.number().finite(),
  pendingMinutes: z.number().finite(),
  completionRatio: z.number().finite().min(0).max(1).nullable(),
  status: z.enum(['not_started', 'in_progress', 'completed', 'overdue', 'blocked']),
  plannedStartAt: isoDateString.nullable().optional(),
  plannedEndAt: isoDateString.nullable().optional(),
  completedAt: isoDateString.nullable().optional(),
  assignees: z.array(assigneeSchema),
  hasPrimaryResponsible: z.boolean(),
  assigneeCount: z.number().int().nonnegative(),
  teamCount: z.number().int().nonnegative(),
  collaboratorCount: z.number().int().nonnegative(),
})

const areaSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  orderIndex: z.number().int(),
  plannedMinutes: z.number().finite(),
  realizedMinutes: z.number().finite(),
  pendingMinutes: z.number().finite(),
  completionRatio: z.number().finite().min(0).max(1).nullable(),
  totalSteps: z.number().int().nonnegative(),
  completedSteps: z.number().int().nonnegative(),
  pendingSteps: z.number().int().nonnegative(),
  unassignedSteps: z.number().int().nonnegative(),
  overdueSteps: z.number().int().nonnegative(),
  steps: z.array(stepSchema),
})

const optionSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  orderIndex: z.number().int(),
  plannedMinutes: z.number().finite(),
  realizedMinutes: z.number().finite(),
  pendingMinutes: z.number().finite(),
  completionRatio: z.number().finite().min(0).max(1).nullable(),
  areas: z.array(areaSchema),
})

const warningSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  scope: z.enum(['conveyor', 'option', 'area', 'step', 'collaborator', 'team']),
  targetId: z.string().optional(),
})

export const conveyorOperationalSnapshotV1Schema = z
  .object({
    schemaVersion: z.literal(CONVEYOR_OPERATIONAL_SNAPSHOT_SCHEMA_VERSION),
    request: z.object({
      requestId: z.string().uuid(),
      correlationId: z.string().min(1).max(512),
      generatedAt: isoDateString,
      callerSystem: z.literal(CONVEYOR_HEALTH_CALLER_SYSTEM),
      intent: z.literal(CONVEYOR_HEALTH_INTENT),
      policy: z.enum(['economy', 'balanced', 'quality']),
    }),
    conveyor: z.object({
      id: z.string().min(1),
      code: z.string().max(256).nullable().optional(),
      name: z.string().min(1),
      customerName: z.string().nullable().optional(),
      vehicle: z.string().nullable().optional(),
      priority: z.enum(['baixa', 'media', 'alta']),
      operationalStatus: z.enum(['no_backlog', 'em_revisao', 'em_andamento', 'em_atraso', 'concluidas']),
      createdAt: isoDateString,
      plannedStartAt: isoDateString.nullable().optional(),
      plannedEndAt: isoDateString.nullable().optional(),
      completedAt: isoDateString.nullable().optional(),
    }),
    totals: z.object({
      plannedMinutes: z.number().finite(),
      realizedMinutes: z.number().finite(),
      pendingMinutes: z.number().finite(),
      completionRatio: z.number().finite().min(0).max(1).nullable(),
      totalOptions: z.number().int().nonnegative(),
      totalAreas: z.number().int().nonnegative(),
      totalSteps: z.number().int().nonnegative(),
      completedSteps: z.number().int().nonnegative(),
      pendingSteps: z.number().int().nonnegative(),
      unassignedSteps: z.number().int().nonnegative(),
      overdueSteps: z.number().int().nonnegative(),
      blockedSteps: z.number().int().nonnegative().optional(),
    }),
    structure: z.object({ options: z.array(optionSchema) }),
    areaExecutionSummary: z
      .array(
        z.object({
          areaId: z.string().min(1),
          areaName: z.string().min(1),
          plannedMinutes: z.number().finite(),
          realizedMinutes: z.number().finite(),
          pendingMinutes: z.number().finite(),
          completionRatio: z.number().finite().min(0).max(1).nullable(),
          totalSteps: z.number().int().nonnegative(),
          completedSteps: z.number().int().nonnegative(),
          pendingSteps: z.number().int().nonnegative(),
          unassignedSteps: z.number().int().nonnegative(),
          overdueSteps: z.number().int().nonnegative(),
          collaboratorCount: z.number().int().nonnegative(),
          teamCount: z.number().int().nonnegative(),
        }),
      )
      .max(256),
    peopleExecutionSummary: z
      .array(
        z.object({
          collaboratorId: z.string().min(1),
          collaboratorName: z.string().min(1),
          assignedSteps: z.number().int().nonnegative(),
          primarySteps: z.number().int().nonnegative(),
          plannedMinutes: z.number().finite(),
          realizedMinutes: z.number().finite(),
          pendingMinutes: z.number().finite(),
          completionRatio: z.number().finite().min(0).max(1).nullable(),
        }),
      )
      .max(512),
    teamExecutionSummary: z
      .array(
        z.object({
          teamId: z.string().min(1),
          teamName: z.string().min(1),
          assignedSteps: z.number().int().nonnegative(),
          plannedMinutes: z.number().finite(),
          realizedMinutes: z.number().finite(),
          pendingMinutes: z.number().finite(),
          completionRatio: z.number().finite().min(0).max(1).nullable(),
        }),
      )
      .max(256),
    recentActivity: z.object({
      lastTimeEntryAt: isoDateString.nullable().optional(),
      lastStatusChangeAt: isoDateString.nullable().optional(),
      timeEntries: z
        .array(
          z.object({
            id: z.string().min(1),
            stepId: z.string().min(1),
            stepName: z.string().min(1),
            collaboratorId: z.string().min(1),
            collaboratorName: z.string().min(1),
            minutes: z.number().finite().nonnegative(),
            entryDate: isoDateString,
            note: z.string().nullable().optional(),
          }),
        )
        .max(200),
    }),
    dataQuality: z.object({
      missingPlannedMinutesSteps: z.number().int().nonnegative(),
      missingAssigneeSteps: z.number().int().nonnegative(),
      missingPrimaryResponsibleSteps: z.number().int().nonnegative(),
      inconsistentTimeEntries: z.number().int().nonnegative(),
      warnings: z.array(warningSchema).max(128),
    }),
    metadata: z.object({
      source: z.literal(CONVEYOR_HEALTH_METADATA_SOURCE),
      snapshotVersion: z.literal(CONVEYOR_OPERATIONAL_SNAPSHOT_VERSION),
      timezone: z.string().min(1).max(128),
    }),
  })
  .strict()
