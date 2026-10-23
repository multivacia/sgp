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
import { requireTimeEntryPlanningEligibility } from '../operational-planning/time-entry-planning.repository.js'
import type { ProductionUnassignedTimeEntryBody } from './production-time-entries.schemas.js'

/** Busca excepcional: só atividades planejadas para outros (ou para o próprio). */
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

  const eligibility = await requireTimeEntryPlanningEligibility(pool, {
    conveyorId: body.conveyorId,
    stepNodeId: body.stepNodeId,
    collaboratorId,
  })
  const assigneeId = eligibility.scope === 'MINE'
    ? await resolveProductionStepAssigneeId(pool, {
        collaboratorId,
        conveyorId: body.conveyorId,
        stepNodeId: body.stepNodeId,
      })
    : null

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
    entryOrigin: eligibility.scope === 'MINE' ? 'ASSIGNED' : 'UNASSIGNED_EXCEPTION',
    enforcePublishedPlan: true,
    exceptionJustification: body.exceptionJustification ?? null,
    exceptionJustificationId: body.exceptionJustificationId ?? null,
    exceptionJustificationComplement: body.exceptionJustificationComplement ?? null,
    isOutOfSequence: sequence.isOutOfSequence,
    outOfSequenceJustification: body.outOfSequenceJustification ?? null,
    outOfSequenceJustificationId: body.outOfSequenceJustificationId ?? null,
    outOfSequenceJustificationComplement: body.outOfSequenceJustificationComplement ?? null,
    actorAppUserId,
    sequence,
  })
}
