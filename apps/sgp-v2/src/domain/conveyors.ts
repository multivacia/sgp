/**
 * Esteiras na V2: tipos do que a V2 lê de GET /api/v1/conveyors e /conveyors/:id
 * e as regras de leitura (situação, progresso, atraso). Nada aqui grava dados.
 * Hierarquia: esteira › etapa (option) › setor (area) › atividade (step).
 */

export type ConveyorStatus =
  | 'EM_ELABORACAO'
  | 'AGUARDANDO_PLANEJAMENTO'
  | 'EM_PLANEJAMENTO'
  | 'A_INICIAR'
  | 'EM_ANDAMENTO'
  | 'FINALIZADA'
  | 'CANCELADA'

export type ConveyorListItem = {
  id: string
  code: string | null
  name: string
  clientName: string | null
  responsible: string | null
  operationalStatus: ConveyorStatus
  estimatedDeadline: string | null
  totalSteps: number
}

export type StepStatus = 'PENDING' | 'IN_PROGRESS' | 'BLOCKED' | 'COMPLETED' | 'REOPENED' | 'ABORTED'

export type ConveyorStep = {
  id: string
  name: string
  orderIndex: number
  plannedMinutes: number | null
  plannedQuantity?: number
  operationalStatus: StepStatus
  completedByName: string | null
  assignees: {
    type: 'COLLABORATOR' | 'TEAM'
    collaboratorId: string | null
    collaboratorName: string | null
    teamId: string | null
    teamName: string | null
    isPrimary: boolean
    orderIndex: number | null
  }[]
}

export type ConveyorDetail = ConveyorListItem & {
  vehicle: string | null
  modelVersion: string | null
  plate: string | null
  baseNameSnapshot: string | null
  originRegister: 'MANUAL' | 'BASE' | 'HYBRID'
  matrixRootItemId: string | null
  structure: {
    options: { id: string; name: string; orderIndex: number; areas: { id: string; name: string; orderIndex: number; steps: ConveyorStep[] }[] }[]
  }
}

/** Esteiras que estão na fábrica (as que a gestora acompanha no dia a dia). */
export const IN_PRODUCTION: ConveyorStatus[] = ['A_INICIAR', 'EM_ANDAMENTO']
export const CLOSED: ConveyorStatus[] = ['FINALIZADA', 'CANCELADA']

export const STATUS_LABEL: Record<ConveyorStatus, string> = {
  EM_ELABORACAO: 'Em elaboração',
  AGUARDANDO_PLANEJAMENTO: 'Esperando planejamento',
  EM_PLANEJAMENTO: 'Em planejamento',
  A_INICIAR: 'A iniciar',
  EM_ANDAMENTO: 'Em andamento',
  FINALIZADA: 'Finalizada',
  CANCELADA: 'Cancelada',
}

/** Situação de uma atividade em palavras da fábrica. */
export type StepState = 'feito' | 'andando' | 'parado' | 'interrompido' | 'falta'

export function stepState(status: StepStatus): StepState {
  switch (status) {
    case 'COMPLETED':
      return 'feito'
    case 'IN_PROGRESS':
      return 'andando'
    case 'BLOCKED':
      return 'parado'
    case 'ABORTED':
      return 'interrompido'
    default:
      return 'falta'
  }
}

export const STEP_LABEL: Record<StepState, string> = {
  feito: 'Feito',
  andando: 'Em andamento',
  parado: 'Parado',
  interrompido: 'Interrompido',
  falta: 'Não começou',
}

/** Prazo como a V1 entende (ISO ou dd/mm/aaaa). Mesma regra de `server/src/shared/operationalBucket.ts`. */
export function parseDeadline(value: string | null | undefined): Date | null {
  if (value == null || value.trim() === '') return null
  const t = value.trim()
  const iso = Date.parse(t)
  if (!Number.isNaN(iso)) return new Date(iso)
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t)
  if (br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]))
  return null
}

function startOfDay(d: Date): number {
  const x = new Date(d.getTime())
  x.setHours(0, 0, 0, 0)
  return x.getTime()
}

/** Atrasada = não fechada e o dia do prazo já passou (regra do painel da V1). */
export function isOverdue(c: Pick<ConveyorListItem, 'operationalStatus' | 'estimatedDeadline'>, now = new Date()): boolean {
  if (CLOSED.includes(c.operationalStatus)) return false
  const dl = parseDeadline(c.estimatedDeadline)
  return dl !== null && startOfDay(now) > startOfDay(dl)
}

export function deadlineText(value: string | null, now = new Date()): string {
  const dl = parseDeadline(value)
  if (!dl) return 'sem prazo'
  const diff = Math.round((startOfDay(dl) - startOfDay(now)) / 86_400_000)
  if (diff === 0) return 'hoje'
  if (diff === 1) return 'amanhã'
  if (diff === -1) return 'ontem'
  return dl.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function stepMinutes(s: ConveyorStep): number {
  return (s.plannedMinutes ?? 0) * (s.plannedQuantity ?? 1)
}

export type Progress = { totalSteps: number; doneSteps: number; totalMinutes: number; doneMinutes: number; pct: number; blocked: number }

/**
 * Progresso pelo previsto: minutos das atividades concluídas ÷ minutos previstos.
 * Atividade interrompida (ABORTED) sai da conta — não será feita.
 */
export function progressOf(d: Pick<ConveyorDetail, 'structure'>): Progress {
  const p: Progress = { totalSteps: 0, doneSteps: 0, totalMinutes: 0, doneMinutes: 0, pct: 0, blocked: 0 }
  for (const o of d.structure.options)
    for (const a of o.areas)
      for (const s of a.steps) {
        const st = stepState(s.operationalStatus)
        if (st === 'interrompido') continue
        p.totalSteps++
        p.totalMinutes += stepMinutes(s)
        if (st === 'feito') {
          p.doneSteps++
          p.doneMinutes += stepMinutes(s)
        }
        if (st === 'parado') p.blocked++
      }
  const base = p.totalMinutes > 0 ? p.doneMinutes / p.totalMinutes : p.totalSteps > 0 ? p.doneSteps / p.totalSteps : 0
  p.pct = Math.round(base * 100)
  return p
}

export function primaryAssignee(s: ConveyorStep): string | null {
  const a = s.assignees.find((x) => x.isPrimary) ?? s.assignees[0]
  return a ? (a.collaboratorName ?? a.teamName) : null
}

export type Exception = { kind: 'atrasada' | 'parada'; conveyor: ConveyorListItem; detail: string }

/**
 * "Precisa de você" na tela Hoje, só com o que a V1 já informa:
 * esteira atrasada (prazo) e atividade parada (BLOCKED). Parada vem primeiro.
 */
export function exceptionsOf(list: ConveyorListItem[], details: Map<string, ConveyorDetail>, now = new Date()): Exception[] {
  const out: Exception[] = []
  for (const c of list) {
    if (CLOSED.includes(c.operationalStatus)) continue
    const d = details.get(c.id)
    if (d) {
      for (const o of d.structure.options)
        for (const a of o.areas)
          for (const s of a.steps)
            if (stepState(s.operationalStatus) === 'parado')
              out.push({ kind: 'parada', conveyor: c, detail: `${o.name} · ${a.name}: ${s.name}` })
    }
    if (isOverdue(c, now)) out.push({ kind: 'atrasada', conveyor: c, detail: `Prazo era ${deadlineText(c.estimatedDeadline, now)}` })
  }
  return out.sort((x, y) => (x.kind === y.kind ? 0 : x.kind === 'parada' ? -1 : 1))
}

export type Liberacao = { label: string; explica: string; passos: ConveyorStatus[] }

/**
 * Próxima liberação pelas transições permitidas na V1 (PATCH /conveyors/:id/status):
 * elaboração → aguardando → em planejamento (entra no Planejar semana) → a iniciar (a fábrica aponta).
 */
export function liberacaoDe(status: ConveyorStatus): Liberacao | null {
  switch (status) {
    case 'EM_ELABORACAO':
      return { label: 'Liberar para planejar', explica: 'A esteira passa a aparecer em "Esperando" no Planejar semana.', passos: ['AGUARDANDO_PLANEJAMENTO', 'EM_PLANEJAMENTO'] }
    case 'AGUARDANDO_PLANEJAMENTO':
      return { label: 'Liberar para planejar', explica: 'A esteira passa a aparecer em "Esperando" no Planejar semana.', passos: ['EM_PLANEJAMENTO'] }
    case 'EM_PLANEJAMENTO':
      return { label: 'Liberar para a fábrica começar', explica: 'Os colaboradores passam a poder apontar nesta esteira no tablet.', passos: ['A_INICIAR'] }
    default:
      return null
  }
}
