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
import type { ProductionUnassignedTimeEntryBody } from './production-time-entries.schemas.js'

export type CreateProductionUnassignedTimeEntryInput = {
  collaboratorId: string
  body: ProductionUnassignedTimeEntryBody
}

/**
 * Apontamento em atividade real (esteira/step) fora da alocação atual do
 * colaborador no kiosk — feature "Outra Atividade" (distinta do "+Extra",
 * que é apontamento avulso contra catálogo genérico, sem vínculo com
 * esteira/step — ver `production-extra-time-entries.*`).
 *
 * Ao contrário de `serviceCreateConveyorTimeEntryForAppUser` (usado pelo app
 * web autenticado via JWT), este fluxo não delega para um branch baseado em
 * `appUserId`: o módulo `production` (kiosk/PIN) já opera diretamente sobre
 * `collaboratorId` da sessão de produção em todos os outros endpoints (ver
 * `production-time-entries.service.ts`), então mantemos a mesma consistência
 * aqui. `appUserId` é resolvido apenas para fins de auditoria
 * (`actorAppUserId` em eventos operacionais), nunca para decidir o caminho
 * de resolução de alocação.
 *
 * Resolução de alocação, nesta ordem:
 * 1. Alocação estrutural ativa do colaborador no STEP
 *    (`findAssigneeIdForStepAndCollaborator`) → `entryOrigin: 'ASSIGNED'`.
 * 2. Sem alocação → exige justificativa de exceção (catálogo ou texto livre)
 *    → `entryOrigin: 'UNASSIGNED_EXCEPTION'`.
 *
 * Em ambos os casos, se a atividade estiver fora da sequência recomendada,
 * é exigida justificativa de fora-de-sequência — resolução e validação
 * (`resolveTimeEntryJustification`) ficam a cargo de
 * `serviceCreateConveyorTimeEntry`, reaproveitando a mesma lógica já usada
 * pelo apontamento normal/admin (evita duplicar regras de negócio).
 */
export async function serviceCreateProductionUnassignedTimeEntry(
  pool: pg.Pool,
  input: CreateProductionUnassignedTimeEntryInput,
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
      'Esta atividade não está incluída na sequência operacional recomendada.',
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }

  const actorAppUserId = await findAppUserIdByCollaboratorId(pool, collaboratorId)
  const assigneeId = await findAssigneeIdForStepAndCollaborator(
    pool,
    body.conveyorId,
    body.stepNodeId,
    collaboratorId,
  )

  const commonInput = {
    conveyorId: body.conveyorId,
    conveyorNodeId: body.stepNodeId,
    collaboratorId,
    minutes: body.minutes,
    notes: body.note ?? null,
    entryMode: 'manual' as const,
    metadataJson: { accessChannel: 'PRODUCTION_AVATAR_PIN' },
    isOutOfSequence: sequence.isOutOfSequence,
    outOfSequenceJustification: body.outOfSequenceJustification ?? null,
    outOfSequenceJustificationId: body.outOfSequenceJustificationId ?? null,
    outOfSequenceJustificationComplement: body.outOfSequenceJustificationComplement ?? null,
    actorAppUserId,
    sequence,
  }

  if (assigneeId) {
    return serviceCreateConveyorTimeEntry(pool, {
      ...commonInput,
      conveyorNodeAssigneeId: assigneeId,
      entryOrigin: 'ASSIGNED',
      exceptionJustification: null,
    })
  }

  return serviceCreateConveyorTimeEntry(pool, {
    ...commonInput,
    conveyorNodeAssigneeId: null,
    entryOrigin: 'UNASSIGNED_EXCEPTION',
    exceptionJustification: body.exceptionJustification ?? null,
    exceptionJustificationId: body.exceptionJustificationId ?? null,
    exceptionJustificationComplement: body.exceptionJustificationComplement ?? null,
  })
}
