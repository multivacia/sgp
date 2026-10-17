/**
 * Planejar semana na V2, sobre a API de planejamento da V1 (sem endpoint novo):
 * GET /operational-planning/week, /backlog e /factory-intake para ler;
 * POST /operational-planning/week (corpo = semana inteira) e /week/:planId/publish para gravar.
 *
 * A gestora planeja por esteira: escolhe o dia de início e as atividades ocupam
 * os dias seguintes, na ordem da matriz, conforme a folga de cada responsável.
 * "Sugerir semana" faz isso para todas, pela ordem do prazo. Tudo aqui é cálculo local.
 */

export type WeekPlanItem = {
  id: string
  conveyorId: string
  conveyorTitle: string
  activityNodeId: string
  taskTitle: string
  sectorTitle: string
  activityTitle: string
  assignedCollaboratorId: string | null
  assignedCollaboratorName: string | null
  plannedDate: string
  plannedOrder: number
  plannedMinutes: number | null
  status: string
  notes: string | null
  activityOperationalStatus: string | null
  conveyorOperationalPlanItemId?: string | null
}

export type WeekResponse = {
  hasPlan: boolean
  week: { weekStartDate: string; weekEndDate: string; weekdayDates: readonly string[] }
  revision: { hasActivePublished: boolean; hasUnpublishedRevision: boolean }
  plan: null | { id: string; status: 'DRAFT' | 'PUBLISHED'; items: WeekPlanItem[] }
  capacityByCollaboratorDay: { collaboratorId: string; date: string; capacityMinutes: number; plannedMinutes: number }[]
}

export type BacklogItem = {
  conveyorId: string
  conveyorTitle: string
  taskTitle: string
  sectorTitle: string
  activityNodeId: string
  activityTitle: string
  pendingMinutes: number
  assignedCollaborators: { id: string; fullName: string }[]
}

export type IntakeItem = {
  conveyorOperationalPlanItemId: string
  conveyorId: string
  conveyorName: string
  activityNodeId: string
  plannedOrder: number
  plannedMinutes: number | null
  plannedCollaboratorId: string | null
  plannedCollaboratorName: string | null
  plannedTeamId: string | null
  taskTitle: string
  sectorTitle: string
  activityTitle: string
}

/** Atividade esperando um dia na semana. */
export type Pendente = {
  conveyorId: string
  conveyorTitle: string
  activityNodeId: string
  taskTitle: string
  sectorTitle: string
  activityTitle: string
  minutes: number
  collaboratorId: string | null
  collaboratorName: string | null
  teamId: string | null
  copItemId: string | null
}

export type Esperando = { conveyorId: string; titulo: string; prazo: string | null; atividades: Pendente[] }

/** Dia da semana que ainda dá para planejar: 0..4 (seg..sex), ou -1 se a semana já passou. */
export type Dia = number

/** Capacidade usada quando a V1 não informa a do colaborador (8 h). */
export const CAPACIDADE_PADRAO = 480

/** Atividades que já começaram/terminaram ficam no plano mesmo se a esteira sair da semana. */
export function fixo(it: Pick<WeekPlanItem, 'activityOperationalStatus'>): boolean {
  return it.activityOperationalStatus === 'COMPLETED' || it.activityOperationalStatus === 'IN_PROGRESS'
}

/** Junta o que espera planejamento (backlog + plano da esteira aguardando encaixe), por esteira, na ordem da matriz. */
export function agruparEsperando(backlog: BacklogItem[], intake: IntakeItem[], prazoDe: (conveyorId: string) => string | null): Esperando[] {
  const porEsteira = new Map<string, Esperando>()
  const vistos = new Set<string>()
  const add = (p: Pendente) => {
    if (vistos.has(p.activityNodeId)) return
    vistos.add(p.activityNodeId)
    let e = porEsteira.get(p.conveyorId)
    if (!e) {
      e = { conveyorId: p.conveyorId, titulo: p.conveyorTitle, prazo: prazoDe(p.conveyorId), atividades: [] }
      porEsteira.set(p.conveyorId, e)
    }
    e.atividades.push(p)
  }
  for (const i of [...intake].sort((a, b) => a.plannedOrder - b.plannedOrder))
    add({
      conveyorId: i.conveyorId,
      conveyorTitle: i.conveyorName,
      activityNodeId: i.activityNodeId,
      taskTitle: i.taskTitle,
      sectorTitle: i.sectorTitle,
      activityTitle: i.activityTitle,
      minutes: Math.max(0, Math.floor(i.plannedMinutes ?? 0)),
      collaboratorId: i.plannedCollaboratorId,
      collaboratorName: i.plannedCollaboratorName,
      teamId: i.plannedTeamId,
      copItemId: i.conveyorOperationalPlanItemId,
    })
  for (const b of backlog)
    add({
      conveyorId: b.conveyorId,
      conveyorTitle: b.conveyorTitle,
      activityNodeId: b.activityNodeId,
      taskTitle: b.taskTitle,
      sectorTitle: b.sectorTitle,
      activityTitle: b.activityTitle,
      minutes: Math.max(0, Math.floor(b.pendingMinutes)),
      collaboratorId: b.assignedCollaborators[0]?.id ?? null,
      collaboratorName: b.assignedCollaborators[0]?.fullName ?? null,
      teamId: null,
      copItemId: null,
    })
  return [...porEsteira.values()]
}

/** Índice do prazo na semana: 0..4 dentro, <0 antes da segunda, ≥5 depois da sexta; null sem prazo. */
export function prazoNaSemana(prazo: string | null, weekdayDates: readonly string[]): number | null {
  const d = prazo?.trim().slice(0, 10)
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return null
  const seg = Date.parse(`${weekdayDates[0]}T12:00:00Z`)
  return Math.round((Date.parse(`${d}T12:00:00Z`) - seg) / 86_400_000)
}

/** Primeiro dia que ainda dá para planejar (hoje, se a semana é a atual). */
export function primeiroDia(weekdayDates: readonly string[], hojeIso: string): Dia {
  if (hojeIso <= weekdayDates[0]) return 0
  const i = weekdayDates.findIndex((d) => d >= hojeIso)
  return i
}

export type Colocado = Pendente & { plannedDate: string }

export type Resultado = {
  /** Atividades novas colocadas nos dias. */
  novos: Colocado[]
  porEsteira: Record<string, { fim: Dia; sobraMin: number; semResponsavel: number }>
  /** Por dia: capacidade somada e minutos planejados (existentes + novos). */
  porDia: { capacidade: number; planejado: number }[]
}

/**
 * Encaixa as esteiras escolhidas a partir do dia de início, na ordem da matriz.
 * Cada atividade vai para o primeiro dia (≥ o da anterior) em que o responsável tem folga;
 * atividade maior que o dia inteiro ocupa um dia vazio. O que não cabe até sexta vira "sobra".
 */
export function simular(week: WeekResponse, mantidos: WeekPlanItem[], esperando: Esperando[], inicio: Record<string, Dia>): Resultado {
  const dias = week.week.weekdayDates
  const cap = new Map<string, number>()
  for (const c of week.capacityByCollaboratorDay) cap.set(`${c.collaboratorId}|${c.date}`, c.capacityMinutes)
  const capDe = (cid: string, date: string) => cap.get(`${cid}|${date}`) ?? CAPACIDADE_PADRAO
  const usado = new Map<string, number>()
  const usar = (cid: string | null, date: string, min: number) => {
    if (!cid) return
    const k = `${cid}|${date}`
    usado.set(k, (usado.get(k) ?? 0) + min)
  }
  for (const it of mantidos) usar(it.assignedCollaboratorId, it.plannedDate, Math.max(0, it.plannedMinutes ?? 0))

  const novos: Colocado[] = []
  const porEsteira: Resultado['porEsteira'] = {}
  const prazo = (e: Esperando) => prazoNaSemana(e.prazo, dias) ?? 99
  const escolhidas = esperando.filter((e) => inicio[e.conveyorId] !== undefined).sort((a, b) => inicio[a.conveyorId] - inicio[b.conveyorId] || prazo(a) - prazo(b))

  for (const e of escolhidas) {
    let cursor = Math.max(0, inicio[e.conveyorId])
    let fim = cursor
    let sobraMin = 0
    let semResponsavel = 0
    for (const a of e.atividades) {
      if (!a.collaboratorId) {
        semResponsavel++
        continue
      }
      let dia = -1
      for (let d = cursor; d < dias.length; d++) {
        const u = usado.get(`${a.collaboratorId}|${dias[d]}`) ?? 0
        if (u + a.minutes <= capDe(a.collaboratorId, dias[d]) || u === 0) {
          dia = d
          break
        }
      }
      if (dia < 0) {
        sobraMin += a.minutes
        continue
      }
      usar(a.collaboratorId, dias[dia], a.minutes)
      novos.push({ ...a, plannedDate: dias[dia] })
      cursor = dia
      fim = Math.max(fim, dia)
    }
    porEsteira[e.conveyorId] = { fim, sobraMin, semResponsavel }
  }

  const porDia = dias.map((date) => {
    let capacidade = 0
    for (const c of week.capacityByCollaboratorDay) if (c.date === date) capacidade += c.capacityMinutes
    let planejado = 0
    for (const it of mantidos) if (it.plannedDate === date) planejado += Math.max(0, it.plannedMinutes ?? 0)
    for (const n of novos) if (n.plannedDate === date) planejado += n.minutes
    return { capacidade, planejado }
  })
  return { novos, porEsteira, porDia }
}

/** Termina depois do prazo, ou não cabe na semana. */
export function atrasa(r: { fim: Dia; sobraMin: number } | undefined, prazoIdx: number | null): boolean {
  if (!r) return false
  return r.sobraMin > 0 || (prazoIdx !== null && r.fim > prazoIdx)
}

/**
 * "Sugerir semana": pela ordem do prazo, cada esteira começa no primeiro dia
 * em que termina dentro do prazo; se nenhum serve, começa no primeiro dia livre.
 */
export function sugerirSemana(week: WeekResponse, mantidos: WeekPlanItem[], esperando: Esperando[], inicio: Record<string, Dia>, desde: Dia): Record<string, Dia> {
  const dias = week.week.weekdayDates
  const out = { ...inicio }
  const fila = esperando
    .filter((e) => out[e.conveyorId] === undefined)
    .sort((a, b) => (prazoNaSemana(a.prazo, dias) ?? 99) - (prazoNaSemana(b.prazo, dias) ?? 99))
  for (const e of fila) {
    const p = prazoNaSemana(e.prazo, dias)
    let escolhido = desde
    for (let d = desde; d < dias.length; d++) {
      const r = simular(week, mantidos, esperando, { ...out, [e.conveyorId]: d }).porEsteira[e.conveyorId]
      if (!atrasa(r, p)) {
        escolhido = d
        break
      }
    }
    out[e.conveyorId] = escolhido
  }
  return out
}

/** Itens do plano que continuam: tudo, menos o que a gestora tirou (o que já começou fica). */
export function mantidosDe(week: WeekResponse, tiradas: Set<string>): WeekPlanItem[] {
  return (week.plan?.items ?? []).filter((it) => it.status !== 'CANCELLED' && (!tiradas.has(it.conveyorId) || fixo(it)))
}

/** Itens tirados da semana voltam a esperar (com o mesmo responsável e tempo). */
export function devolvidos(week: WeekResponse, tiradas: Set<string>, prazoDe: (conveyorId: string) => string | null): Esperando[] {
  const itens = (week.plan?.items ?? []).filter((it) => it.status !== 'CANCELLED' && tiradas.has(it.conveyorId) && !fixo(it))
  return agruparEsperando(
    [],
    itens.map((it, i) => ({
      conveyorOperationalPlanItemId: it.conveyorOperationalPlanItemId ?? '',
      conveyorId: it.conveyorId,
      conveyorName: it.conveyorTitle,
      activityNodeId: it.activityNodeId,
      plannedOrder: i,
      plannedMinutes: it.plannedMinutes,
      plannedCollaboratorId: it.assignedCollaboratorId,
      plannedCollaboratorName: it.assignedCollaboratorName,
      plannedTeamId: null,
      taskTitle: it.taskTitle,
      sectorTitle: it.sectorTitle,
      activityTitle: it.activityTitle,
    })),
    prazoDe,
  ).map((e) => ({ ...e, atividades: e.atividades.map((a) => ({ ...a, copItemId: a.copItemId || null })) }))
}

/**
 * Corpo de POST /operational-planning/week: a semana inteira (a V1 substitui os itens).
 * Ordem por (responsável, dia): os que já estavam primeiro, os novos depois — como a V1 faz.
 */
export function buildSaveBody(week: WeekResponse, mantidos: WeekPlanItem[], novos: Colocado[]) {
  type Linha = {
    conveyorId: string
    activityNodeId: string
    assignedCollaboratorId: string
    assignedTeamId: string | null
    plannedDate: string
    plannedOrder: number
    plannedMinutes: number | null
    notes: string | null
    conveyorOperationalPlanItemId: string | null
  }
  const linhas: Linha[] = []
  for (const it of [...mantidos].sort((a, b) => a.plannedOrder - b.plannedOrder)) {
    if (!it.assignedCollaboratorId) continue
    linhas.push({
      conveyorId: it.conveyorId,
      activityNodeId: it.activityNodeId,
      assignedCollaboratorId: it.assignedCollaboratorId,
      assignedTeamId: null,
      plannedDate: it.plannedDate,
      plannedOrder: 0,
      plannedMinutes: it.plannedMinutes,
      notes: it.notes,
      conveyorOperationalPlanItemId: it.conveyorOperationalPlanItemId ?? null,
    })
  }
  for (const n of novos)
    linhas.push({
      conveyorId: n.conveyorId,
      activityNodeId: n.activityNodeId,
      assignedCollaboratorId: n.collaboratorId as string,
      assignedTeamId: n.teamId,
      plannedDate: n.plannedDate,
      plannedOrder: 0,
      plannedMinutes: n.minutes,
      notes: null,
      conveyorOperationalPlanItemId: n.copItemId,
    })
  const ordem = new Map<string, number>()
  for (const l of linhas) {
    const k = `${l.assignedCollaboratorId}|${l.plannedDate}`
    const i = ordem.get(k) ?? 0
    l.plannedOrder = i
    ordem.set(k, i + 1)
  }
  return { weekStartDate: week.week.weekStartDate, weekEndDate: week.week.weekEndDate, items: linhas }
}

/** Junta duas listas de espera (a mesma esteira vira um cartão só). */
export function juntar(a: Esperando[], b: Esperando[]): Esperando[] {
  const out = new Map<string, Esperando>()
  for (const e of [...a, ...b]) {
    const atual = out.get(e.conveyorId)
    if (!atual) out.set(e.conveyorId, { ...e, atividades: [...e.atividades] })
    else for (const x of e.atividades) if (!atual.atividades.some((y) => y.activityNodeId === x.activityNodeId)) atual.atividades.push(x)
  }
  return [...out.values()]
}

/** Segunda-feira (YYYY-MM-DD) da semana de `d`; sábado e domingo já olham a próxima. */
export function segundaDe(d: Date): string {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12)
  const dow = x.getDay()
  const delta = dow === 0 ? 1 : dow === 6 ? 2 : 1 - dow
  x.setDate(x.getDate() + delta)
  return isoLocal(x)
}

export function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function somarDias(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number)
  return isoLocal(new Date(y, m - 1, d + n, 12))
}
