import type pg from 'pg'
import { findAppUserIdByCollaboratorId } from '../auth/auth.repository.js'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import { serviceAnalyzeConveyorActivitySequence } from '../conveyors/conveyorActivitySequence.service.js'
import {
  assertNodeIsStepForConveyor,
  serviceCreateConveyorTimeEntry,
} from '../conveyors/conveyorAssignments.service.js'
import { findAssigneeIdForStepAndCollaborator } from '../conveyors/conveyorAssignments.repository.js'
import type { TimeEntryCreatedDto } from '../conveyors/conveyorAssignments.dto.js'
import { resolveProductionStepAssigneeId } from './production-plan-assignee.js'
import type { ProductionUnassignedTimeEntryBody } from './production-time-entries.schemas.js'

/**
 * Apontamento de tempo em uma atividade real de uma esteira ("Outra Atividade") — Modo
 * Fábrica. Resolve a alocação seguindo a mesma regra canônica de
 * `serviceCreateConveyorTimeEntryForAppUser` (`conveyorAssignments.service.ts`):
 * 1. Alocação estrutural existente (`findAssigneeIdForStepAndCollaborator`) → `ASSIGNED`.
 * 2. Sem alocação estrutural, mas com item no planejamento semanal publicado vigente
 *    (`resolveProductionStepAssigneeId`) → cria alocação de apoio (`is_primary=false`) e
 *    também resulta em `ASSIGNED`.
 * 3. Nenhuma das duas → `UNASSIGNED_EXCEPTION`, exigindo justificativa (validada dentro de
 *    `serviceCreateConveyorTimeEntry`, não duplicada aqui).
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

  let assigneeId = await findAssigneeIdForStepAndCollaborator(
    pool,
    body.conveyorId,
    body.stepNodeId,
    collaboratorId,
  )
  if (!assigneeId) {
    assigneeId = await resolveProductionStepAssigneeId(pool, {
      collaboratorId,
      conveyorId: body.conveyorId,
      stepNodeId: body.stepNodeId,
    })
  }

  const actorAppUserId = await findAppUserIdByCollaboratorId(pool, collaboratorId)

  return serviceCreateConveyorTimeEntry(pool, {
    conveyorId: body.conveyorId,
    conveyorNodeId: body.stepNodeId,
    collaboratorId,
    conveyorNodeAssigneeId: assigneeId ?? null,
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
    actorAppUserId,
    sequence,
  })
}
