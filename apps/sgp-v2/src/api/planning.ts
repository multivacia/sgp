import type { BacklogItem, IntakeItem, WeekResponse } from '../domain/planejarSemana'
import { getConveyor } from './conveyors'
import { api } from './client'

/** Planejamento semanal pela API da V1 (`conveyors.create`), sem endpoint novo. */
export function getWeek(weekStart: string): Promise<WeekResponse> {
  return api<WeekResponse>(`/operational-planning/week?weekStart=${weekStart}`)
}

export function saveWeek(body: unknown): Promise<WeekResponse> {
  return api<WeekResponse>('/operational-planning/week', { method: 'POST', body: JSON.stringify(body) })
}

export function publishWeek(planId: string): Promise<WeekResponse> {
  return api<WeekResponse>(`/operational-planning/week/${planId}/publish`, { method: 'POST' })
}

export async function listIntake(weekStart: string): Promise<IntakeItem[]> {
  return (await api<{ items: IntakeItem[] }>(`/operational-planning/factory-intake?weekStart=${weekStart}`)).items
}

const LIMITE = 100

function backlog(params: string): Promise<BacklogItem[]> {
  return api<{ items: BacklogItem[] }>(`/operational-planning/backlog?limit=${LIMITE}&${params}`).then((r) => r.items)
}

/**
 * Atividades da esteira esperando semana. A V1 devolve no máximo 100 por pedido;
 * esteira maior é buscada por responsável e remontada na ordem da esteira.
 */
export async function listBacklogOf(conveyorId: string): Promise<BacklogItem[]> {
  const first = await backlog(`conveyorId=${conveyorId}`)
  if (first.length < LIMITE) return first
  const d = await getConveyor(conveyorId)
  const ordem = new Map<string, number>()
  const pessoas = new Set<string>()
  for (const o of d.structure.options)
    for (const a of o.areas)
      for (const s of a.steps) {
        ordem.set(s.id, ordem.size)
        for (const x of s.assignees) if (x.collaboratorId) pessoas.add(x.collaboratorId)
      }
  const porId = new Map(first.map((b) => [b.activityNodeId, b]))
  for (const p of pessoas) for (const b of await backlog(`conveyorId=${conveyorId}&collaboratorId=${p}`)) porId.set(b.activityNodeId, b)
  return [...porId.values()].sort((a, b) => (ordem.get(a.activityNodeId) ?? 1e9) - (ordem.get(b.activityNodeId) ?? 1e9))
}
