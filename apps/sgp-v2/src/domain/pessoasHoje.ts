/**
 * "Pessoas hoje" na tela Hoje: quem tem tarefa planejada e ainda não apontou,
 * e quem está sem tarefa. Lê o plano da semana (GET /operational-planning/week)
 * e o histórico da semana (GET /operational-planning/week-activity), ambos da V1.
 */
import type { WeekResponse } from './planejarSemana'

export type AtividadeSemana = {
  kind: 'TIME_ENTRY' | 'STEP_COMPLETED' | 'STEP_REOPENED'
  occurredAt: string
  collaboratorId: string | null
  minutes: number | null
}

export type Pessoa = { id: string; nome: string; planejadoMin: number; tarefas: number; apontadoMin: number }

/** `publicada: false` = a fábrica ainda não vê plano nesta semana (rascunho sem versão publicada). */
export type PessoasHoje = { publicada: boolean; semApontamento: Pessoa[]; semTarefa: Pessoa[]; apontaram: Pessoa[] }

/** Dia local (YYYY-MM-DD) de um instante ISO. */
function diaLocal(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function pessoasHoje(week: WeekResponse, atividade: AtividadeSemana[], hoje: string, nomeDe: (id: string) => string | null): PessoasHoje {
  const porId = new Map<string, Pessoa>()
  const pessoa = (id: string, nome?: string | null) => {
    let p = porId.get(id)
    if (!p) {
      p = { id, nome: nome ?? nomeDe(id) ?? 'Colaborador', planejadoMin: 0, tarefas: 0, apontadoMin: 0 }
      porId.set(id, p)
    } else if (nome && p.nome === 'Colaborador') p.nome = nome
    return p
  }
  // Só quem tem capacidade hoje entra na conta de "sem tarefa" (quem trabalha hoje).
  for (const c of week.capacityByCollaboratorDay) if (c.date === hoje && c.capacityMinutes > 0) pessoa(c.collaboratorId)
  const publicada = week.plan !== null && (week.plan.status === 'PUBLISHED' || week.revision.hasActivePublished)
  for (const it of publicada ? (week.plan?.items ?? []) : []) {
    if (it.plannedDate !== hoje || !it.assignedCollaboratorId || it.status === 'CANCELLED') continue
    const p = pessoa(it.assignedCollaboratorId, it.assignedCollaboratorName)
    p.planejadoMin += Math.max(0, it.plannedMinutes ?? 0)
    p.tarefas++
  }
  for (const a of atividade) {
    if (a.kind !== 'TIME_ENTRY' || !a.collaboratorId || diaLocal(a.occurredAt) !== hoje) continue
    pessoa(a.collaboratorId).apontadoMin += Math.max(0, a.minutes ?? 0)
  }
  const todos = [...porId.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  return {
    publicada,
    semApontamento: todos.filter((p) => p.tarefas > 0 && p.apontadoMin === 0),
    semTarefa: todos.filter((p) => p.tarefas === 0 && p.apontadoMin === 0),
    apontaram: todos.filter((p) => p.apontadoMin > 0),
  }
}
