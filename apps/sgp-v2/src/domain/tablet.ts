/**
 * Tablet do setor (Modo Produção) na V2, sobre a API de produção da V1:
 * GET /production/collaborators (token do tablet), POST /production/auth/login (PIN),
 * GET /production/me/work-queue, POST /production/time-entries.
 * O cronômetro é só do tablet (localStorage): ao "Terminei" vira um apontamento normal da V1.
 */

export type Pessoa = {
  id: string
  fullName: string
  initials: string
  avatarUrl: string | null
  teamName: string | null
  productionCredentialStatus: 'READY' | 'NEEDS_INITIAL_PIN' | 'LOCKED' | 'DISABLED'
}

export type Tarefa = {
  workPlanItemId: string
  conveyorId: string
  conveyorTitle: string
  activityNodeId: string
  activityTitle: string
  taskTitle: string
  sectorTitle: string
  plannedDate: string
  plannedMinutes: number | null
  realizedMinutes: number
  pendingMinutes: number
  isActivityCompleted: boolean
  isOverdue: boolean
  isNextRecommended: boolean
  group: 'overdue' | 'today' | 'completed'
  canTrackTime: boolean
  blockingReason?: string
  canCompleteStep: boolean
  requiresOutOfSequenceJustification: boolean
  sequenceWarningLabel?: string
}

export type Justificativa = { id: string; label: string; requiresComplement: boolean; sortOrder: number }

/** Tarefas que dá para apontar agora, a recomendada primeiro, depois as atrasadas. */
export function tarefasAbertas(items: Tarefa[]): Tarefa[] {
  const rank = (t: Tarefa) => (t.isNextRecommended ? 0 : t.group === 'overdue' ? 1 : 2)
  return items
    .filter((t) => t.canTrackTime && !t.isActivityCompleted && t.group !== 'completed')
    .map((t, i) => ({ t, i }))
    .sort((a, b) => rank(a.t) - rank(b.t) || a.i - b.i)
    .map((x) => x.t)
}

/** Mesma regra da V1: fora de sequência, ou o tempo novo passa do previsto. */
export function precisaJustificar(t: Pick<Tarefa, 'requiresOutOfSequenceJustification' | 'plannedMinutes' | 'realizedMinutes'>, minutos: number): 'sequencia' | 'excesso' | null {
  if (t.requiresOutOfSequenceJustification) return 'sequencia'
  const p = t.plannedMinutes
  if (minutos > 0 && p != null && p > 0 && t.realizedMinutes + minutos > p) return 'excesso'
  return null
}

export type Cronometro = {
  conveyorId: string
  stepNodeId: string
  /** Momento em que voltou a contar (ms) ou null se pausado. */
  desde: number | null
  acumuladoMs: number
  pausas: string[]
  /** Fora de sequência: a justificativa é pedida antes de começar. */
  justificativa?: { id: string; complemento: string } | null
}

export function iniciar(t: Pick<Tarefa, 'conveyorId' | 'activityNodeId'>, agora: number): Cronometro {
  return { conveyorId: t.conveyorId, stepNodeId: t.activityNodeId, desde: agora, acumuladoMs: 0, pausas: [] }
}

export function decorridoMs(c: Cronometro, agora: number): number {
  return c.acumuladoMs + (c.desde !== null ? Math.max(0, agora - c.desde) : 0)
}

export function pausar(c: Cronometro, motivo: string, agora: number): Cronometro {
  if (c.desde === null) return c
  return { ...c, desde: null, acumuladoMs: decorridoMs(c, agora), pausas: [...c.pausas, motivo] }
}

export function continuar(c: Cronometro, agora: number): Cronometro {
  return c.desde !== null ? c : { ...c, desde: agora }
}

/** Minutos para lançar: arredonda, nunca menos de 1. */
export function minutosDe(c: Cronometro, agora: number): number {
  return Math.max(1, Math.round(decorridoMs(c, agora) / 60_000))
}

/** "1:05" (horas:minutos). */
export function relogio(ms: number): string {
  const m = Math.floor(ms / 60_000)
  return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`
}

export type Lancamento = {
  tarefa: Tarefa
  minutos: number
  /** Quanto ficou pronto: 100 conclui a atividade (se a V1 deixar). */
  pct: number
  /** "ontem" lança na data de ontem; padrão é agora. */
  ontem?: string
  justificativa?: { id: string; complemento: string } | null
  pausas?: string[]
}

/** Corpo de POST /api/v1/production/time-entries. */
export function buildTimeEntryBody(l: Lancamento) {
  const concluir = l.pct >= 100 && l.tarefa.canCompleteStep
  const nota = l.pausas?.length ? `Pausas: ${l.pausas.join(', ')}` : null
  return {
    conveyorId: l.tarefa.conveyorId,
    stepNodeId: l.tarefa.activityNodeId,
    minutes: Math.max(1, Math.round(l.minutos)),
    sessionCompletionPct: Math.min(100, Math.max(0, Math.round(l.pct))),
    markAsDone: concluir,
    ...(nota ? { note: nota } : {}),
    ...(l.ontem ? { entryAt: l.ontem } : {}),
    ...(l.justificativa ? { justificationId: l.justificativa.id, justificationComplement: l.justificativa.complemento.trim() || null } : {}),
  }
}

const CHAVE = 'sgp-v2-cronometros'

/** Cronômetros por colaborador neste tablet (o tablet é compartilhado). */
export function lerCronometros(): Record<string, Cronometro> {
  try {
    return JSON.parse(localStorage.getItem(CHAVE) ?? '{}') as Record<string, Cronometro>
  } catch {
    return {}
  }
}

export function gravarCronometro(collaboratorId: string, c: Cronometro | null): void {
  try {
    const all = lerCronometros()
    if (c) all[collaboratorId] = c
    else delete all[collaboratorId]
    localStorage.setItem(CHAVE, JSON.stringify(all))
  } catch {
    // sem armazenamento: o cronômetro vale só enquanto a tela está aberta
  }
}
