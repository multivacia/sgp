import type pg from 'pg'
import { findAppUserIdByCollaboratorId } from '../auth/auth.repository.js'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import { parseEntryAtInput } from '../../shared/operationalWorkDate.js'
import { serviceAnalyzeConveyorActivitySequence } from '../conveyors/conveyorActivitySequence.service.js'
import {
  assertNodeIsStepForConveyor,
  serviceCreateConveyorTimeEntry,
} from '../conveyors/conveyorAssignments.service.js'
import type { TimeEntryCreatedDto } from '../conveyors/conveyorAssignments.dto.js'
import { resolveProductionStepAssigneeId } from './production-plan-assignee.js'
import {
  resolveCollaboratorExcessCheck,
  resolveTimeEntryPlanningGate,
  TIME_ENTRY_EXCEEDED_PLANNED_JUSTIFICATION_MESSAGE,
  TIME_ENTRY_NOT_PLANNED_MESSAGE,
} from '../operational-planning/planned-activity.service.js'
import { resolveTimeEntryJustification } from '../../shared/timeEntryJustificationResolver.js'
import type { ProductionUnassignedTimeEntryBody } from './production-time-entries.schemas.js'

/**
 * Apontamento de tempo em uma atividade real de uma esteira ("Outra Atividade") — Modo
 * Fábrica. Segue a regra canônica de `serviceCreateConveyorTimeEntryForAppUser`
 * (TASK apontamento-somente-planejado):
 * 1. Planejada para o colaborador (qualquer semana) → `ASSIGNED`; reutiliza ou cria apoio.
 *    Acima do previsto dele exige justificativa (`justificationId`), salvo fora de sequência.
 * 2. Planejada só para outro colaborador → `UNASSIGNED_EXCEPTION`, com justificativa de
 *    exceção (validada dentro de `serviceCreateConveyorTimeEntry`).
 * 3. Não planejada para ninguém → `TIME_ENTRY_NOT_PLANNED`.
 */
export async function serviceCreateProductionUnassignedTimeEntry(
  pool: pg.Pool,
  input: { collaboratorId: string; body: ProductionUnassignedTimeEntryBody },
): Promise<TimeEntryCreatedDto> {
  const { collaboratorId, body } = input

  await assertNodeIsStepForConveyor(pool, body.conveyorId, body.stepNodeId)

  const sequence = await serviceAnalyzeConveyorActivitySequence(
    pool,
    body.conveyorId,
    body.stepNodeId,
    collaboratorId,
  )
  if (!sequence.targetFound) {
    throw new AppError(
      'Esta atividade não está incluída na sequência operacional da esteira.',
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }

  const gate = await resolveTimeEntryPlanningGate(pool, {
    conveyorId: body.conveyorId,
    stepNodeId: body.stepNodeId,
    collaboratorId,
  })

  let assigneeId: string | null = null
  if (gate.kind === 'MINE') {
    if (!sequence.isOutOfSequence) {
      const excess = await resolveCollaboratorExcessCheck(pool, {
        stepNodeId: body.stepNodeId,
        collaboratorId,
        plannedMinutesForCollaborator: gate.plannedMinutesForCollaborator,
        minutesNovo: body.minutes,
      })
      if (excess.required) {
        await resolveTimeEntryJustification(pool, {
          required: true,
          justificationId: body.justificationId,
          justificationComplement: body.justificationComplement,
          legacyText: null,
          requiredErrorCode: ErrorCodes.TIME_ENTRY_EXCEEDED_PLANNED_REQUIRES_JUSTIFICATION,
          requiredErrorMessage: TIME_ENTRY_EXCEEDED_PLANNED_JUSTIFICATION_MESSAGE,
        })
      }
    }
    assigneeId = await resolveProductionStepAssigneeId(pool, {
      collaboratorId,
      conveyorId: body.conveyorId,
      stepNodeId: body.stepNodeId,
    })
    if (!assigneeId) {
      throw new AppError(TIME_ENTRY_NOT_PLANNED_MESSAGE, 422, ErrorCodes.TIME_ENTRY_NOT_PLANNED)
    }
  }

  const actorAppUserId = await findAppUserIdByCollaboratorId(pool, collaboratorId)

  return serviceCreateConveyorTimeEntry(pool, {
    conveyorId: body.conveyorId,
    conveyorNodeId: body.stepNodeId,
    collaboratorId,
    conveyorNodeAssigneeId: assigneeId ?? null,
    entryAt: body.entryAt !== undefined ? parseEntryAtInput(body.entryAt) : undefined,
    minutes: body.minutes,
    notes: body.note ?? null,
    entryMode: 'manual',
    metadataJson: { accessChannel: 'PRODUCTION_AVATAR_PIN' },
    entryOrigin: assigneeId ? 'ASSIGNED' : 'UNASSIGNED_EXCEPTION',
    exceptionJustification: body.exceptionJustification ?? null,
    exceptionJustificationId: body.exceptionJustificationId ?? null,
    exceptionJustificationComplement: body.exceptionJustificationComplement ?? null,
    isOutOfSequence: sequence.isOutOfSequence,
    outOfSequenceJustification: body.outOfSequenceJustification ?? null,
    outOfSequenceJustificationId: body.outOfSequenceJustificationId ?? null,
    outOfSequenceJustificationComplement: body.outOfSequenceJustificationComplement ?? null,
    voluntaryJustificationId: gate.kind === 'MINE' ? (body.justificationId ?? null) : null,
    voluntaryJustificationComplement:
      gate.kind === 'MINE' ? (body.justificationComplement ?? null) : null,
    actorAppUserId,
    sequence,
  })
}
