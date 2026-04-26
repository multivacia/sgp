import type {
  ConveyorCreatedSummary,
  ConveyorDetail,
  ConveyorListItem,
  CreateConveyorInput,
  ListConveyorsQuery,
  PatchConveyorDadosBody,
  PatchConveyorStatusBody,
  PatchConveyorStructureBody,
} from '../../domain/conveyors/conveyor.types'
import type { ConveyorNodeWorkload } from '../../domain/conveyors/conveyorNodeWorkload.types'
import { requestJson } from '../../lib/api/client'

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
