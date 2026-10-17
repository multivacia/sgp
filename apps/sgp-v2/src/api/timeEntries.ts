import type { Lancamento } from '../domain/apontamentos'
import { api } from './client'

const base = (conveyorId: string, stepId: string) => `/conveyors/${conveyorId}/steps/${stepId}/time-entries`

export function listarLancamentos(conveyorId: string, stepId: string): Promise<Lancamento[]> {
  return api<Lancamento[]>(base(conveyorId, stepId))
}

/** Correção gerencial (`time_entries.edit_any`). */
export function corrigirLancamento(conveyorId: string, stepId: string, id: string, body: unknown): Promise<Lancamento> {
  return api<Lancamento>(`${base(conveyorId, stepId)}/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
}

/** Remoção com motivo (`time_entries.delete_any`). */
export function removerLancamento(conveyorId: string, stepId: string, id: string, body: unknown): Promise<unknown> {
  return api<unknown>(`${base(conveyorId, stepId)}/${id}`, { method: 'DELETE', body: JSON.stringify(body) })
}
