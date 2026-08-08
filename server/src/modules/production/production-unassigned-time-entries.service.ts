import type pg from 'pg'
import { findAppUserIdByCollaboratorId } from '../auth/auth.repository.js'
import {
  assertNodeIsStepForConveyor,
  serviceCreateConveyorTimeEntry,
  serviceCreateConveyorTimeEntryForAppUser,
} from '../conveyors/conveyorAssignments.service.js'
import { findAssigneeIdForStepAndCollaborator } from '../conveyors/conveyorAssignments.repository.js'
import type { TimeEntryCreatedDto } from '../conveyors/conveyorAssignments.dto.js'
import { serviceAnalyzeConveyorActivitySequence } from '../conveyors/conveyorActivitySequence.service.js'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import {
  resolveTimeEntryJustification,
  TIME_ENTRY_JUSTIFICATION_REQUIRED_MESSAGE,
} from '../../shared/timeEntryJustificationResolver.js'
import { resolveProductionStepAssigneeId } from './production-plan-assignee.js'
import type { ProductionUnassignedTimeEntryBody } from './production-time-entries.schemas.js'

export async function serviceCreateProductionUnassignedTimeEntry(
  pool: pg.Pool,
  input: {
    collaboratorId: string
    body: ProductionUnassignedTimeEntryBody
  },
): Promise<TimeEntryCreatedDto> {
  const { body, collaboratorId } = input
  const appUserId = await findAppUserIdByCollaboratorId(pool, collaboratorId)

  if (appUserId) {
    return serviceCreateConveyorTimeEntryForAppUser(pool, {
      appUserId,
      conveyorId: body.conveyorId,
      conveyorNodeId: body.stepNodeId,
      minutes: body.minutes,
      notes: body.note ?? null,
      entryMode: 'manual',
      exceptionJustification: body.exceptionJustification ?? undefined,
      exceptionJustificationId: body.exceptionJustificationId,
      exceptionJustificationComplement:
        body.exceptionJustificationComplement ?? undefined,
      outOfSequenceJustification:
        body.outOfSequenceJustification ?? undefined,
      outOfSequenceJustificationId: body.outOfSequenceJustificationId,
      outOfSequenceJustificationComplement:
        body.outOfSequenceJustificationComplement ?? undefined,
    })
  }

  await assertNodeIsStepForConveyor(pool, body.conveyorId, body.stepNodeId)
  const sequence = await serviceAnalyzeConveyorActivitySequence(
    pool,
    body.conveyorId,
    body.stepNodeId,
    collaboratorId,
  )
  if (!sequence.targetFound) {
    throw new AppError(
      'Esta atividade não está incluída na sequência operacional recomendada.',
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }

  const outOfSequenceResolved = sequence.isOutOfSequence
    ? await resolveTimeEntryJustification(pool, {
        required: true,
        justificationId: body.outOfSequenceJustificationId,
        justificationComplement: body.outOfSequenceJustificationComplement,
        legacyText: body.outOfSequenceJustification,
        requiredErrorCode:
          ErrorCodes.TIME_ENTRY_OUT_OF_SEQUENCE_REQUIRES_JUSTIFICATION,
        requiredErrorMessage: TIME_ENTRY_JUSTIFICATION_REQUIRED_MESSAGE,
      })
    : null

  const structuralAssigneeId = await findAssigneeIdForStepAndCollaborator(
    pool,
    body.conveyorId,
    body.stepNodeId,
    collaboratorId,
  )
  const assigneeId =
    structuralAssigneeId ??
    (await resolveProductionStepAssigneeId(pool, {
      conveyorId: body.conveyorId,
      stepNodeId: body.stepNodeId,
      collaboratorId,
    }))

  if (assigneeId) {
    return serviceCreateConveyorTimeEntry(pool, {
      conveyorId: body.conveyorId,
      conveyorNodeId: body.stepNodeId,
      collaboratorId,
      conveyorNodeAssigneeId: assigneeId,
      minutes: body.minutes,
      notes: body.note ?? null,
      entryMode: 'manual',
      metadataJson: { accessChannel: 'PRODUCTION_AVATAR_PIN' },
      entryOrigin: 'ASSIGNED',
      exceptionJustification: null,
      isOutOfSequence: sequence.isOutOfSequence,
      outOfSequenceJustification:
        outOfSequenceResolved?.legacyText ?? null,
      outOfSequenceJustificationId: body.outOfSequenceJustificationId,
      outOfSequenceJustificationComplement:
        body.outOfSequenceJustificationComplement ?? null,
      actorAppUserId: null,
      sequence,
      standardJustificationException: null,
      standardJustificationOos: outOfSequenceResolved?.standard ?? null,
    })
  }

  const exceptionResolved = await resolveTimeEntryJustification(pool, {
    required: true,
    justificationId: body.exceptionJustificationId,
    justificationComplement: body.exceptionJustificationComplement,
    legacyText: body.exceptionJustification,
    requiredErrorCode:
      ErrorCodes.TIME_ENTRY_UNASSIGNED_REQUIRES_JUSTIFICATION,
    requiredErrorMessage: TIME_ENTRY_JUSTIFICATION_REQUIRED_MESSAGE,
  })

  return serviceCreateConveyorTimeEntry(pool, {
    conveyorId: body.conveyorId,
    conveyorNodeId: body.stepNodeId,
    collaboratorId,
    conveyorNodeAssigneeId: null,
    minutes: body.minutes,
    notes: body.note ?? null,
    entryMode: 'manual',
    metadataJson: { accessChannel: 'PRODUCTION_AVATAR_PIN' },
    entryOrigin: 'UNASSIGNED_EXCEPTION',
    exceptionJustification: exceptionResolved.legacyText,
    isOutOfSequence: sequence.isOutOfSequence,
    outOfSequenceJustification: outOfSequenceResolved?.legacyText ?? null,
    outOfSequenceJustificationId: body.outOfSequenceJustificationId,
    outOfSequenceJustificationComplement:
      body.outOfSequenceJustificationComplement ?? null,
    actorAppUserId: null,
    sequence,
    standardJustificationException: exceptionResolved.standard,
    standardJustificationOos: outOfSequenceResolved?.standard ?? null,
  })
}
