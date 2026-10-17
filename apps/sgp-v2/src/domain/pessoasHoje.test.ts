import { describe, expect, it } from 'vitest'
import { pessoasHoje } from './pessoasHoje'
import type { WeekPlanItem, WeekResponse } from './planejarSemana'

const HOJE = '2026-10-20'
const item = (quem: string, date: string, min: number): WeekPlanItem => ({
  id: `${quem}-${date}-${min}`,
  conveyorId: 'c',
  conveyorTitle: 'Gol',
  activityNodeId: `${quem}${date}${min}`,
  taskTitle: 'Bancos',
  sectorTitle: 'Costura',
  activityTitle: 'Costurar',
  assignedCollaboratorId: quem,
  assignedCollaboratorName: quem.toUpperCase(),
  plannedDate: date,
  plannedOrder: 0,
  plannedMinutes: min,
  status: 'PLANNED',
  notes: null,
  activityOperationalStatus: 'PENDING',
})

function semana(status: 'DRAFT' | 'PUBLISHED', publicadaAntes = false): WeekResponse {
  return {
    hasPlan: true,
    week: { weekStartDate: '2026-10-19', weekEndDate: '2026-10-23', weekdayDates: [] },
    revision: { hasActivePublished: publicadaAntes, hasUnpublishedRevision: publicadaAntes },
    plan: { id: 'p', status, items: [item('marta', HOJE, 240), item('marta', HOJE, 60), item('joao', HOJE, 120), item('luana', '2026-10-21', 480)] },
    capacityByCollaboratorDay: ['marta', 'joao', 'luana', 'pedro'].map((c) => ({ collaboratorId: c, date: HOJE, capacityMinutes: c === 'pedro' ? 0 : 480, plannedMinutes: 0 })),
  }
}

describe('Hoje → pessoas sem apontamento e sem tarefa (plano + histórico da V1)', () => {
  it('quem tem tarefa hoje e não apontou; quem trabalha hoje e não tem tarefa; apontamento de ontem não conta; rascunho nunca publicado não gera cobrança', () => {
    const atividade = [
      { kind: 'TIME_ENTRY' as const, occurredAt: `${HOJE}T10:00:00`, collaboratorId: 'joao', minutes: 30 },
      { kind: 'TIME_ENTRY' as const, occurredAt: '2026-10-19T10:00:00', collaboratorId: 'marta', minutes: 60 },
    ]
    const r = pessoasHoje(semana('PUBLISHED'), atividade, HOJE, () => null)
    expect(r.semApontamento.map((p) => [p.id, p.planejadoMin, p.tarefas])).toEqual([['marta', 300, 2]])
    expect(r.semTarefa.map((p) => p.id)).toEqual(['luana'])
    expect(r.apontaram.map((p) => [p.id, p.apontadoMin])).toEqual([['joao', 30]])

    const rascunho = pessoasHoje(semana('DRAFT'), [], HOJE, () => null)
    expect(rascunho.publicada).toBe(false)
    expect(rascunho.semApontamento).toEqual([])
    expect(pessoasHoje(semana('DRAFT', true), [], HOJE, () => null).semApontamento.map((p) => p.id)).toEqual(['joao', 'marta'])
  })
})
