import type {
  ConveyorCreatedSummary,
  ConveyorDetail,
  ConveyorListItem,
  CreateConveyorInput,
  ListConveyorsQuery,
  PatchConveyorDadosBody,
  ConveyorReturnBody,
  PatchConveyorStatusBody,
  PatchConveyorStepCompletionBody,
  PatchConveyorStructureBody,
  PostConveyorStructureItemBody,
} from '../../domain/conveyors/conveyor.types'
import type {
  ConveyorHealthAnalysisHistoryItem,
  ConveyorHealthSummaryItem,
  ConveyorHealthAnalysisV1,
} from '../../domain/conveyors/conveyorHealth.types'
import type { ConveyorNodeWorkload } from '../../domain/conveyors/conveyorNodeWorkload.types'
import type { ConveyorOperationalEvent } from '../../domain/conveyors/conveyorOperationalEvents.types'
import { requestJson, requestJsonEnvelope } from '../../lib/api/client'

const BASE = '/api/v1'

function buildConveyorsQueryString(q: ListConveyorsQuery): string {
  const sp = new URLSearchParams()
  if (q.q?.trim()) sp.set('q', q.q.trim())
  if (q.priority) sp.set('priority', q.priority)
  if (q.responsible?.trim()) sp.set('responsible', q.responsible.trim())
  if (q.operationalStatus) sp.set('operationalStatus', q.operationalStatus)
  const s = sp.toString()
  return s ? `?${s}` : ''
}

/**
 * Registo oficial no servidor — POST /api/v1/conveyors.
 */
export async function createConveyor(
  input: CreateConveyorInput,
): Promise<ConveyorCreatedSummary> {
  return requestJson<ConveyorCreatedSummary>('POST', `${BASE}/conveyors`, {
    body: input,
  })
}

/**
 * Listagem operacional — GET /api/v1/conveyors.
 */
export async function listConveyors(
  query: ListConveyorsQuery = {},
): Promise<ConveyorListItem[]> {
  const qs = buildConveyorsQueryString(query)
  return requestJson<ConveyorListItem[]>('GET', `${BASE}/conveyors${qs}`)
}

/**
 * Detalhe persistido — GET /api/v1/conveyors/:id.
 */
export async function getConveyorById(id: string): Promise<ConveyorDetail> {
  return requestJson<ConveyorDetail>('GET', `${BASE}/conveyors/${encodeURIComponent(id)}`)
}

/**
 * Pendência e concentração por área/STEP — GET /api/v1/conveyors/:id/node-workload.
 */
export async function getConveyorNodeWorkload(
  id: string,
): Promise<ConveyorNodeWorkload> {
  return requestJson<ConveyorNodeWorkload>(
    'GET',
    `${BASE}/conveyors/${encodeURIComponent(id)}/node-workload`,
  )
}

/**
 * Eventos operacionais do detalhe — GET /api/v1/conveyors/:id/operational-events
 */
export async function getConveyorOperationalEvents(
  id: string,
  options?: { limit?: number },
): Promise<{ data: ConveyorOperationalEvent[]; meta: Record<string, unknown> }> {
  const limit = Math.min(Math.max(1, Math.floor(options?.limit ?? 20)), 200)
  return requestJsonEnvelope<ConveyorOperationalEvent[]>(
    'GET',
    `${BASE}/conveyors/${encodeURIComponent(id)}/operational-events?limit=${limit}`,
  )
}

/**
 * Análise de saúde operacional (ARGOS via SGP) — POST /api/v1/conveyors/:id/health-analysis
 */
export async function postConveyorHealthAnalysis(id: string): Promise<{
  data: ConveyorHealthAnalysisV1
  meta: Record<string, unknown>
}> {
  return requestJsonEnvelope<ConveyorHealthAnalysisV1>(
    'POST',
    `${BASE}/conveyors/${encodeURIComponent(id)}/health-analysis`,
    { body: { policy: 'balanced' } },
  )
}

/**
 * Última análise persistida (se existir) — GET /api/v1/conveyors/:id/health-analysis/latest
 */
export async function getLatestConveyorHealthAnalysis(id: string): Promise<{
  data: ConveyorHealthAnalysisV1 | null
  meta: Record<string, unknown>
}> {
  return requestJsonEnvelope<ConveyorHealthAnalysisV1 | null>(
    'GET',
    `${BASE}/conveyors/${encodeURIComponent(id)}/health-analysis/latest`,
  )
}

/**
 * Histórico de análises persistidas — GET /api/v1/conveyors/:id/health-analysis/history
 */
export async function getConveyorHealthAnalysisHistory(
  id: string,
  options?: { limit?: number },
): Promise<{
  data: ConveyorHealthAnalysisHistoryItem[]
  meta: Record<string, unknown>
}> {
  const limit = Math.min(Math.max(1, Math.floor(options?.limit ?? 10)), 50)
  return requestJsonEnvelope<ConveyorHealthAnalysisHistoryItem[]>(
    'GET',
    `${BASE}/conveyors/${encodeURIComponent(id)}/health-analysis/history?limit=${limit}`,
  )
}

/**
 * Resumo executivo ARGOS (última análise por esteira) — GET /api/v1/conveyors/health-analysis/summary
 */
export async function getConveyorHealthSummary(
  options?: { limit?: number },
): Promise<{ data: ConveyorHealthSummaryItem[]; meta: Record<string, unknown> }> {
  const limit = Math.min(Math.max(1, Math.floor(options?.limit ?? 100)), 500)
  return requestJsonEnvelope<ConveyorHealthSummaryItem[]>(
    'GET',
    `${BASE}/conveyors/health-analysis/summary?limit=${limit}`,
  )
}

/**
 * Transição oficial de pipeline — PATCH /api/v1/conveyors/:id/status.
 * Resposta: mesmo contrato do GET detalhe (enriquecido).
 */
export async function patchConveyorStatus(
  id: string,
  body: PatchConveyorStatusBody,
): Promise<ConveyorDetail> {
  return requestJson<ConveyorDetail>(
    'PATCH',
    `${BASE}/conveyors/${encodeURIComponent(id)}/status`,
    { body },
  )
}

/**
 * Retrocesso operacional para backlog — POST /api/v1/conveyors/:id/return-to-backlog.
 */
export async function postConveyorReturnToBacklog(
  id: string,
  body: ConveyorReturnBody,
): Promise<ConveyorDetail> {
  return requestJson<ConveyorDetail>(
    'POST',
    `${BASE}/conveyors/${encodeURIComponent(id)}/return-to-backlog`,
    { body },
  )
}

/**
 * Retrocesso operacional para planejamento — POST /api/v1/conveyors/:id/return-to-planning.
 */
export async function postConveyorReturnToPlanning(
  id: string,
  body: ConveyorReturnBody,
): Promise<ConveyorDetail> {
  return requestJson<ConveyorDetail>(
    'POST',
    `${BASE}/conveyors/${encodeURIComponent(id)}/return-to-planning`,
    { body },
  )
}

/**
 * Atualização de dados cadastrais — PATCH /api/v1/conveyors/:id
 */
export async function patchConveyorDados(
  id: string,
  body: PatchConveyorDadosBody,
): Promise<ConveyorDetail> {
  return requestJson<ConveyorDetail>(
    'PATCH',
    `${BASE}/conveyors/${encodeURIComponent(id)}`,
    { body },
  )
}

/**
 * Substituição da estrutura (opções/áreas/etapas) — PATCH /api/v1/conveyors/:id/structure
 */
export async function patchConveyorStructure(
  id: string,
  body: PatchConveyorStructureBody,
): Promise<ConveyorDetail> {
  return requestJson<ConveyorDetail>(
    'PATCH',
    `${BASE}/conveyors/${encodeURIComponent(id)}/structure`,
    { body },
  )
}

/**
 * Inclusão tardia append-only — POST /api/v1/conveyors/:id/structure/items
 * Requer header Idempotency-Key estável (cliente reenvia no retry).
 */
export async function appendConveyorStructureItem(
  id: string,
  body: PostConveyorStructureItemBody,
  options?: { idempotencyKey?: string },
): Promise<{ data: ConveyorDetail; meta: Record<string, unknown> }> {
  const idempotencyKey = options?.idempotencyKey?.trim() || crypto.randomUUID()
  return requestJsonEnvelope<ConveyorDetail>(
    'POST',
    `${BASE}/conveyors/${encodeURIComponent(id)}/structure/items`,
    {
      body,
      headers: { 'Idempotency-Key': idempotencyKey },
    },
  )
}

/**
 * Conclusão explícita de etapa (STEP) — PATCH …/steps/:stepNodeId/completion
 */
export async function patchConveyorStepCompletion(
  conveyorId: string,
  stepNodeId: string,
  body: PatchConveyorStepCompletionBody,
): Promise<{ data: ConveyorDetail; meta: Record<string, unknown> }> {
  return requestJsonEnvelope<ConveyorDetail>(
    'PATCH',
    `${BASE}/conveyors/${encodeURIComponent(conveyorId)}/steps/${encodeURIComponent(stepNodeId)}/completion`,
    { body },
  )
}

/** GET …/sequence-check — esta recomendada vs. pendências anteriores (S3). */
export type ConveyorStepSequenceCheckResult = {
  targetFound: boolean
  isOutOfSequence: boolean
  hasPreviousPendingStep: boolean
  sequenceWarningType?: 'PREVIOUS_STEP_PENDING' | 'OUT_OF_SEQUENCE'
  sequenceWarningLabel?: string
  requiresJustification: boolean
  previousOpenCount: number
  previousOpenActivities: Array<{
    activityNodeId: string
    activityTitle: string
    sectorTitle: string
    taskTitle: string
    orderPath: string
  }>
  allPreviousOpenActivities?: Array<{
    activityNodeId: string
    activityTitle: string
    sectorTitle: string
    taskTitle: string
    orderPath: string
  }>
  awaitingPreviousActivities: Array<{
    activityNodeId: string
    activityTitle: string
    sectorTitle: string
    taskTitle: string
    orderPath: string
  }>
}

export async function getConveyorStepSequenceCheck(
  conveyorId: string,
  stepNodeId: string,
): Promise<ConveyorStepSequenceCheckResult> {
  return requestJson<ConveyorStepSequenceCheckResult>(
    'GET',
    `${BASE}/conveyors/${encodeURIComponent(conveyorId)}/steps/${encodeURIComponent(stepNodeId)}/sequence-check`,
  )
}

export type { ConveyorStepCompletionAction } from '../../domain/conveyors/conveyor.types'

/**
 * Reabertura explícita de etapa (STEP) — mesmo endpoint que `patchConveyorStepCompletion` com `action: 'REOPEN'`.
 */
export async function reopenConveyorStep(
  conveyorId: string,
  stepNodeId: string,
  body: { note?: string } = {},
): Promise<{ data: ConveyorDetail; meta: Record<string, unknown> }> {
  return patchConveyorStepCompletion(conveyorId, stepNodeId, {
    action: 'REOPEN',
    note: body.note,
  })
}

/**
 * Dispensa operacional de STEP — POST …/steps/:stepNodeId/abort
 * Requer header Idempotency-Key estável (cliente reenvia no retry).
 */
export async function abortConveyorStep(
  conveyorId: string,
  stepNodeId: string,
  body: { reasonCode: string; reasonText?: string | null },
  options?: { idempotencyKey?: string },
): Promise<{ data: ConveyorDetail; meta: Record<string, unknown> }> {
  const idempotencyKey = options?.idempotencyKey?.trim() || crypto.randomUUID()
  return requestJsonEnvelope<ConveyorDetail>(
    'POST',
    `${BASE}/conveyors/${encodeURIComponent(conveyorId)}/steps/${encodeURIComponent(stepNodeId)}/abort`,
    {
      body,
      headers: { 'Idempotency-Key': idempotencyKey },
    },
  )
}

/**
 * Restaura STEP dispensado — POST …/steps/:stepNodeId/restore-aborted
 */
export async function restoreAbortedConveyorStep(
  conveyorId: string,
  stepNodeId: string,
  options?: { idempotencyKey?: string },
): Promise<{ data: ConveyorDetail; meta: Record<string, unknown> }> {
  const idempotencyKey = options?.idempotencyKey?.trim() || crypto.randomUUID()
  return requestJsonEnvelope<ConveyorDetail>(
    'POST',
    `${BASE}/conveyors/${encodeURIComponent(conveyorId)}/steps/${encodeURIComponent(stepNodeId)}/restore-aborted`,
    {
      body: {},
      headers: { 'Idempotency-Key': idempotencyKey },
    },
  )
}

/**
 * Exclusão física — DELETE /api/v1/conveyors/:id.
 * Somente esteiras com `operational_status = NO_BACKLOG` e sem dependências operacionais bloqueantes.
 * RBAC: `conveyors.create` (evolução futura: `conveyors.delete`).
 */
export async function deleteConveyor(conveyorId: string): Promise<void> {
  await requestJson<void>(
    'DELETE',
    `${BASE}/conveyors/${encodeURIComponent(conveyorId)}`,
  )
}
