import type { ConveyorDetail, ConveyorListItem, ConveyorStatus } from '../domain/conveyors'
import { api } from './client'

/** Leitura das esteiras pela API da V1 (sem endpoint novo). */
export function listConveyors(): Promise<ConveyorListItem[]> {
  return api<ConveyorListItem[]>('/conveyors')
}

const detailCache = new Map<string, { at: number; value: Promise<ConveyorDetail> }>()
const DETAIL_TTL_MS = 60_000

/** Detalhe com cache curto: as telas Esteiras e Hoje reaproveitam a mesma leitura. */
export function getConveyor(id: string, fresh = false): Promise<ConveyorDetail> {
  const hit = detailCache.get(id)
  if (!fresh && hit && Date.now() - hit.at < DETAIL_TTL_MS) return hit.value
  const value = api<ConveyorDetail>(`/conveyors/${id}`)
  detailCache.set(id, { at: Date.now(), value })
  value.catch(() => detailCache.delete(id))
  return value
}

/** Busca vários detalhes com no máximo `limit` pedidos ao mesmo tempo. */
export async function getConveyors(ids: string[], onEach: (d: ConveyorDetail) => void, limit = 4, fresh = false): Promise<void> {
  let next = 0
  async function worker() {
    while (next < ids.length) {
      const id = ids[next++]
      try {
        onEach(await getConveyor(id, fresh))
      } catch {
        // uma esteira que falha não impede as outras de aparecerem
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, ids.length) }, worker))
}

/** Cria a esteira pela API da V1 (POST /api/v1/conveyors). Devolve o id criado. */
export function createConveyor(body: unknown): Promise<{ id: string; name: string; operationalStatus: ConveyorStatus }> {
  return api<{ id: string; name: string; operationalStatus: ConveyorStatus }>('/conveyors', { method: 'POST', body: JSON.stringify(body) })
}

/** Altera a estrutura pela API da V1 (PATCH /api/v1/conveyors/:id/structure, motivo obrigatório fora do backlog). */
export async function patchConveyorStructure(id: string, body: unknown): Promise<void> {
  await api<unknown>(`/conveyors/${id}/structure`, { method: 'PATCH', body: JSON.stringify(body) })
  detailCache.delete(id)
}

/** Muda o status pela API da V1 (PATCH /conveyors/:id/status, permissão `conveyors.edit_status`). */
export async function patchConveyorStatus(id: string, operationalStatus: string): Promise<void> {
  await api<unknown>(`/conveyors/${id}/status`, { method: 'PATCH', body: JSON.stringify({ operationalStatus }) })
  detailCache.delete(id)
}
