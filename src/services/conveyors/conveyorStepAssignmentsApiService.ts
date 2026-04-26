import type {
  ConveyorStepAssigneeListItem,
  ConveyorStepTimeEntryCreated,
  ConveyorStepTimeEntryListItem,
  PostConveyorStepTimeEntryBody,
  PostConveyorStepTimeEntryOnBehalfBody,
} from '../../domain/conveyors/conveyor-step-assignments.types'
import { requestJson } from '../../lib/api/client'

const BASE = '/api/v1'

/**
 * GET /api/v1/conveyors/:conveyorId/steps/:stepNodeId/assignees
 */
export async function getConveyorStepAssignees(
  conveyorId: string,
  stepNodeId: string,
): Promise<ConveyorStepAssigneeListItem[]> {
  return requestJson<ConveyorStepAssigneeListItem[]>(
    'GET',
    `${BASE}/conveyors/${encodeURIComponent(conveyorId)}/steps/${encodeURIComponent(stepNodeId)}/assignees`,
  )
}

/**
 * GET /api/v1/conveyors/:conveyorId/steps/:stepNodeId/time-entries
 */
export async function getConveyorStepTimeEntries(
  conveyorId: string,
  stepNodeId: string,
): Promise<ConveyorStepTimeEntryListItem[]> {
  return requestJson<ConveyorStepTimeEntryListItem[]>(
    'GET',
    `${BASE}/conveyors/${encodeURIComponent(conveyorId)}/steps/${encodeURIComponent(stepNodeId)}/time-entries`,
  )
}

/**
 * POST /api/v1/conveyors/:conveyorId/steps/:stepNodeId/time-entries
 * Colaborador vem da sessão (app_users.collaborator_id).
 */
export async function postConveyorStepTimeEntry(
  conveyorId: string,
  stepNodeId: string,
  body: PostConveyorStepTimeEntryBody,
): Promise<ConveyorStepTimeEntryCreated> {
  return requestJson<ConveyorStepTimeEntryCreated>(
    'POST',
    `${BASE}/conveyors/${encodeURIComponent(conveyorId)}/steps/${encodeURIComponent(stepNodeId)}/time-entries`,
    { body },
  )
}

/**
 * POST /api/v1/conveyors/:conveyorId/steps/:stepNodeId/time-entries/on-behalf
 * Requer permissão `time_entries.create_on_behalf`.
 */
export async function postConveyorStepTimeEntryOnBehalf(
  conveyorId: string,
  stepNodeId: string,
  body: PostConveyorStepTimeEntryOnBehalfBody,
): Promise<ConveyorStepTimeEntryCreated> {
  return requestJson<ConveyorStepTimeEntryCreated>(
    'POST',
    `${BASE}/conveyors/${encodeURIComponent(conveyorId)}/steps/${encodeURIComponent(stepNodeId)}/time-entries/on-behalf`,
    { body },
  )
}

export type DeleteConveyorStepTimeEntryBody = {
  /** Obrigatório para remoção gerencial (não é o dono do lançamento). */
  reason?: string
}

/**
 * DELETE /api/v1/conveyors/:conveyorId/steps/:stepNodeId/time-entries/:timeEntryId
 * Corpo opcional `{ reason }` quando a remoção é gerencial.
 */
export async function deleteConveyorStepTimeEntry(
  conveyorId: string,
  stepNodeId: string,
  timeEntryId: string,
  body?: DeleteConveyorStepTimeEntryBody,
): Promise<{ deleted: boolean; id: string }> {
  return requestJson<{ deleted: boolean; id: string }>(
    'DELETE',
    `${BASE}/conveyors/${encodeURIComponent(conveyorId)}/steps/${encodeURIComponent(stepNodeId)}/time-entries/${encodeURIComponent(timeEntryId)}`,
    body && Object.keys(body).length > 0 ? { body } : undefined,
  )
}
