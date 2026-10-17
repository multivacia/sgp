/**
 * DEMONSTRAÇÃO (só no build `--mode demo`): imita, no navegador, as rotas da V1 que a V2 usa,
 * com as atividades e tempos da planilha mestra e nomes fictícios. Nada sai do navegador.
 * Os dados vivem em memória: recarregar a página recomeça a demonstração.
 */
import type { ConveyorDetail, ConveyorStatus, ConveyorStep, StepStatus } from '../domain/conveyors'
import { agruparEsperando, isoLocal, segundaDe, simular, somarDias, type BacklogItem, type WeekResponse } from '../domain/planejarSemana'
import matriz from './matriz.json'

type Linha = [string, number, string | null]
const M = matriz as unknown as [string, Linha[]][][]

const ETAPAS = ['1 - RETIRADA DE PEÇAS DO VEÍCULO/BALCÃO', '2 - LIMPEZA INICIAL', '3 - ISOLANTE OU FELTRO', '4 - TETO', '5 - CINTOS', '6 - CARPETE / ASSOALHO', '7 - CONSOLE CENTRAL + PEÇAS', '8 - PORTA MALAS', '9 - TAMPA TRASEIRA', '10 - LATERAIS TRASEIRAS', '11 - OMBREIRA', '12 - FORROS DE PORTAS', '13 - ACABAMENTOS', '14 - BANCOS TRASEIROS', '15 - BANCOS DIANTEIROS', '16 - VOLANTE', '17 - TAMPÃO', '18 - MONTAGEM VEÍCULO', '19 - LIMPEZA FINAL', '20 - INSPEÇÃO DE QUALIDADE']
const PESSOAS = ['Carlos', 'Diego', 'Helena', 'João', 'Luana', 'Marta', 'Paula', 'Pedro', 'Renata', 'Sérgio', 'Vítor']
const SOBRENOME = ['Souza', 'Lima', 'Alves', 'Reis', 'Melo', 'Dias', 'Paz', 'Rocha', 'Costa', 'Nunes', 'Pires']

let seq = 0
const novoId = () => `d0000000-0000-4000-8000-${String(++seq).padStart(12, '0')}`

type Colab = { id: string; full_name: string; nickname: string; sector_name: string | null }
const colabs: Colab[] = PESSOAS.map((n, i) => ({ id: novoId(), full_name: `${n} ${SOBRENOME[i]}`, nickname: n, sector_name: null }))
const ANA: Colab = { id: novoId(), full_name: 'Ana Gestora', nickname: 'Ana', sector_name: 'Gestão' }
const todosColabs = [...colabs, ANA]
const colabPorNome = (n: string | null) => (n ? colabs.find((c) => c.nickname === n) : undefined)
const nomeDe = (id: string | null | undefined) => todosColabs.find((c) => c.id === id)?.full_name ?? null

// ---- matriz ----
type No = { id: string; node_type: string; name: string; description: null; order_index: number; is_active: boolean; planned_minutes: number | null; default_responsible_id: string | null; team_ids: string[]; required: boolean; source_key: null; children: No[] }
const no = (node_type: string, name: string, order_index: number, children: No[], planned_minutes: number | null = null, resp: string | null = null): No => ({ id: novoId(), node_type, name, description: null, order_index, is_active: true, planned_minutes, default_responsible_id: resp, team_ids: [], required: true, source_key: null, children })
const MATRIZ = no(
  'ITEM',
  'Gol GTI completo',
  0,
  M.map((t, i) => no('TASK', ETAPAS[i], i, t.map((s, j) => no('SECTOR', s[0].toUpperCase(), j, s[1].map((a, x) => no('ACTIVITY', a[0], x, [], a[1], colabPorNome(a[2])?.id ?? null)))))),
)

// ---- esteiras ----
type Esteira = ConveyorDetail
const esteiras = new Map<string, Esteira>()
const hoje = () => isoLocal(new Date())

function passo(nome: string, ordem: number, min: number, quem: string | null, st: StepStatus): ConveyorStep {
  const c = colabPorNome(quem)
  return {
    id: novoId(),
    name: nome,
    orderIndex: ordem,
    plannedMinutes: min,
    plannedQuantity: 1,
    operationalStatus: st,
    completedByName: st === 'COMPLETED' ? (c?.full_name ?? null) : null,
    assignees: c ? [{ type: 'COLLABORATOR', collaboratorId: c.id, collaboratorName: c.full_name, teamId: null, teamName: null, isPrimary: true, orderIndex: 0 }] : [],
  }
}

function semear(nome: string, placa: string, etapas: number[], status: ConveyorStatus, prazo: string, feitas: number, extras: Record<number, StepStatus> = {}): Esteira {
  let k = 0
  const options = etapas.map((n, i) => ({
    id: novoId(),
    name: ETAPAS[n - 1],
    orderIndex: i + 1,
    areas: M[n - 1].map((s, j) => ({
      id: novoId(),
      name: s[0].toUpperCase(),
      orderIndex: j + 1,
      steps: s[1].map((a, x) => {
        const idx = k++
        return passo(a[0], x + 1, a[1], a[2], extras[idx] ?? (idx < feitas ? 'COMPLETED' : 'PENDING'))
      }),
    })),
  }))
  const e: Esteira = { id: novoId(), code: null, name: `${nome} · ${placa}`, clientName: 'Cliente de exemplo', responsible: 'Ana Gestora', priority: 'media', initialNotes: null, createdAt: new Date(Date.now() - 86_400_000 * 5).toISOString(), operationalStatus: status, estimatedDeadline: prazo, totalSteps: k, vehicle: nome, modelVersion: null, plate: placa.replace('-', ''), baseNameSnapshot: 'Gol GTI completo', originRegister: 'BASE', matrixRootItemId: MATRIZ.id, structure: { options } }
  esteiras.set(e.id, e)
  return e
}

const passos = (e: Esteira) => e.structure.options.flatMap((o) => o.areas.flatMap((a) => a.steps.map((s) => ({ o, a, s }))))
function acharPasso(stepId: string) {
  for (const e of esteiras.values()) for (const x of passos(e)) if (x.s.id === stepId) return { e, ...x }
  return null
}

// ---- apontamentos ----
type Apontamento = { id: string; conveyorId: string; stepId: string; collaboratorId: string; minutes: number; at: string; criadoEm?: string; updatedAt?: string; notes?: string | null }
const apontamentos: Apontamento[] = []
const realizado = (stepId: string) => apontamentos.filter((a) => a.stepId === stepId).reduce((s, a) => s + a.minutes, 0)

// ---- planejamento ----
type ItemPlano = { id: string; conveyorId: string; activityNodeId: string; assignedCollaboratorId: string; plannedDate: string; plannedOrder: number; plannedMinutes: number | null; notes: string | null }
type Plano = { id: string; weekStart: string; status: 'DRAFT' | 'PUBLISHED'; items: ItemPlano[]; publicados: ItemPlano[] | null }
const planos = new Map<string, Plano>()
const DIAS = (seg: string) => [0, 1, 2, 3, 4].map((i) => somarDias(seg, i))
function segundaDaData(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  const x = new Date(y, m - 1, d, 12)
  const dow = x.getDay()
  x.setDate(x.getDate() + (dow === 0 ? -6 : 1 - dow))
  return isoLocal(x)
}

function capacidade(seg: string) {
  return colabs.flatMap((c) => DIAS(seg).map((date) => ({ collaboratorId: c.id, date, capacityMinutes: 480, plannedMinutes: 0 })))
}

function itemApi(it: ItemPlano) {
  const x = acharPasso(it.activityNodeId)
  return {
    id: it.id,
    conveyorId: it.conveyorId,
    conveyorTitle: x?.e.name ?? '',
    activityNodeId: it.activityNodeId,
    taskTitle: x?.o.name ?? '',
    sectorTitle: x?.a.name ?? '',
    activityTitle: x?.s.name ?? '',
    assignedCollaboratorId: it.assignedCollaboratorId,
    assignedCollaboratorName: nomeDe(it.assignedCollaboratorId),
    plannedDate: it.plannedDate,
    plannedOrder: it.plannedOrder,
    plannedMinutes: it.plannedMinutes,
    status: 'PLANNED',
    notes: it.notes,
    realizedMinutes: realizado(it.activityNodeId),
    activityOperationalStatus: x?.s.operationalStatus ?? null,
    conveyorOperationalPlanItemId: null,
  }
}

function semana(seg: string): WeekResponse & { summary: unknown } {
  const p = planos.get(seg)
  return {
    hasPlan: !!p,
    week: { weekStartDate: seg, weekEndDate: somarDias(seg, 4), weekdayDates: DIAS(seg) },
    revision: { hasActivePublished: !!p?.publicados, hasUnpublishedRevision: !!p?.publicados && p.status === 'DRAFT' },
    plan: p ? { id: p.id, status: p.status, items: p.items.map(itemApi) } : null,
    capacityByCollaboratorDay: capacidade(seg),
    summary: {},
  }
}

const noPlano = (stepId: string) => [...planos.values()].some((p) => p.items.some((i) => i.activityNodeId === stepId) || p.publicados?.some((i) => i.activityNodeId === stepId))

const PLANEJAVEIS: ConveyorStatus[] = ['EM_PLANEJAMENTO', 'A_INICIAR', 'EM_ANDAMENTO']
function backlog(conveyorId: string | null, collaboratorId: string | null, limit: number): BacklogItem[] {
  const out: BacklogItem[] = []
  for (const e of esteiras.values()) {
    if (!PLANEJAVEIS.includes(e.operationalStatus) || (conveyorId && e.id !== conveyorId)) continue
    for (const { o, a, s } of passos(e)) {
      if (s.operationalStatus === 'COMPLETED' || s.operationalStatus === 'ABORTED' || noPlano(s.id)) continue
      const pend = Math.max(0, (s.plannedMinutes ?? 0) - realizado(s.id))
      const c = s.assignees.find((x) => x.type === 'COLLABORATOR')
      if (pend <= 0 || (collaboratorId && c?.collaboratorId !== collaboratorId)) continue
      out.push({ conveyorId: e.id, conveyorTitle: e.name, taskTitle: o.name, sectorTitle: a.name, activityNodeId: s.id, activityTitle: s.name, pendingMinutes: pend, assignedCollaborators: c?.collaboratorId ? [{ id: c.collaboratorId, fullName: c.collaboratorName ?? '' }] : [] })
    }
  }
  return out.slice(0, limit)
}

// ---- semente ----
const hj = hoje()
const A = semear('Gol GT', 'DEF-4G56', [1, 2, 14, 15, 18, 19, 20], 'EM_ANDAMENTO', somarDias(hj, 3), 22, { 22: 'IN_PROGRESS', 26: 'BLOCKED' })
semear('Gol GTI', 'TUV-1A23', ETAPAS.map((_, i) => i + 1), 'EM_PLANEJAMENTO', somarDias(hj, 14), 0)
const C = semear('Gol GTI', 'ZAB-7C89', [4, 5, 6, 7], 'EM_ANDAMENTO', somarDias(hj, -1), 3)
semear('Polo', 'GHI-2J34', [16], 'EM_ELABORACAO', somarDias(hj, 7), 0)
for (const e of [A, C])
  for (const { s } of passos(e))
    if (s.operationalStatus === 'COMPLETED' || s.operationalStatus === 'IN_PROGRESS') {
      const cid = s.assignees[0]?.collaboratorId
      if (cid) apontamentos.push({ id: novoId(), conveyorId: e.id, stepId: s.id, collaboratorId: cid, minutes: s.operationalStatus === 'COMPLETED' ? (s.plannedMinutes ?? 30) : 20, at: new Date(Date.now() - 86_400_000 * 2).toISOString() })
    }
{
  const seg = segundaDe(new Date())
  const w = semana(seg)
  const esperando = agruparEsperando([...backlog(A.id, null, 999), ...backlog(C.id, null, 999)], [], (id) => esteiras.get(id)?.estimatedDeadline ?? null)
  const r = simular(w, [], esperando, { [A.id]: 0, [C.id]: 0 })
  const ordem = new Map<string, number>()
  const items: ItemPlano[] = r.novos.map((n) => {
    const k = `${n.collaboratorId}|${n.plannedDate}`
    const o = ordem.get(k) ?? 0
    ordem.set(k, o + 1)
    return { id: novoId(), conveyorId: n.conveyorId, activityNodeId: n.activityNodeId, assignedCollaboratorId: n.collaboratorId as string, plannedDate: n.plannedDate, plannedOrder: o, plannedMinutes: n.minutes, notes: null }
  })
  // o passo em andamento entra no plano de hoje (ou segunda), com quem já está nele
  const andando = passos(A).find((x) => x.s.operationalStatus === 'IN_PROGRESS')
  if (andando) items.unshift({ id: novoId(), conveyorId: A.id, activityNodeId: andando.s.id, assignedCollaboratorId: andando.s.assignees[0].collaboratorId as string, plannedDate: DIAS(seg).includes(hj) ? hj : seg, plannedOrder: 0, plannedMinutes: andando.s.plannedMinutes, notes: null })
  planos.set(seg, { id: novoId(), weekStart: seg, status: 'PUBLISHED', items, publicados: items })
}

// ---- fotos das etapas (em memória; no servidor real ficam na tabela v2_etapa_imagens) ----
const fotos: { matrixNodeId: string; nome: string; atualizadaEm: string; url: string }[] = []

// ---- sessões ----
let gestora = true
let tablet: string | null = null
const USER = { userId: 'demo', email: 'gestora@demonstracao', role: 'GESTOR', collaboratorId: ANA.id, permissions: ['conveyors.create', 'operation_matrix.view', 'operation_matrix.manage', 'conveyors.edit_status', 'time_entries.edit_any', 'time_entries.delete_any'], mustChangePassword: false }

const TRANSICOES = new Set(['EM_ELABORACAO|AGUARDANDO_PLANEJAMENTO', 'AGUARDANDO_PLANEJAMENTO|EM_PLANEJAMENTO', 'EM_PLANEJAMENTO|A_INICIAR', 'EM_ANDAMENTO|FINALIZADA'])
const JUSTIFICATIVAS = [
  { id: novoId(), label: 'Combinado com a gestora', description: null, category: null, requiresComplement: false, sortOrder: 1 },
  { id: novoId(), label: 'Faltou material na etapa anterior', description: null, category: null, requiresComplement: false, sortOrder: 2 },
  { id: novoId(), label: 'Retrabalho', description: null, category: null, requiresComplement: false, sortOrder: 3 },
  { id: novoId(), label: 'Outro motivo', description: null, category: null, requiresComplement: true, sortOrder: 4 },
]

class Erro extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    msg: string,
  ) {
    super(msg)
  }
}

type Assig = { type: 'COLLABORATOR' | 'TEAM'; collaboratorId?: string; teamId?: string; isPrimary: boolean; orderIndex?: number }
const assigApi = (as: Assig[] | undefined) =>
  (as ?? []).map((x, i) => ({ type: x.type, collaboratorId: x.collaboratorId ?? null, collaboratorName: nomeDe(x.collaboratorId), teamId: x.teamId ?? null, teamName: x.teamId ? 'Equipe' : null, isPrimary: x.isPrimary, orderIndex: x.orderIndex ?? i }))
type CorpoPasso = { id?: string; titulo: string; orderIndex: number; plannedMinutes?: number | null; assignees?: Assig[] }
type CorpoArea = { id?: string; titulo: string; orderIndex: number; steps: CorpoPasso[] }
type CorpoEtapa = { id?: string; titulo: string; orderIndex: number; areas: CorpoArea[] }

function montar(options: CorpoEtapa[], antes?: Esteira): Esteira['structure'] {
  const velho = new Map(antes ? passos(antes).map((x) => [x.s.id, x.s]) : [])
  return {
    options: options.map((o) => ({
      id: o.id ?? novoId(),
      name: o.titulo,
      orderIndex: o.orderIndex,
      areas: o.areas.map((a) => ({
        id: a.id ?? novoId(),
        name: a.titulo,
        orderIndex: a.orderIndex,
        steps: a.steps.map((s) => {
          const v = s.id ? velho.get(s.id) : undefined
          return { id: s.id ?? novoId(), name: s.titulo, orderIndex: s.orderIndex, plannedMinutes: s.plannedMinutes ?? null, plannedQuantity: 1, operationalStatus: v?.operationalStatus ?? 'PENDING', completedByName: v?.completedByName ?? null, assignees: assigApi(s.assignees) }
        }),
      })),
    })),
  }
}

/** Anterior no mesmo setor ainda não começou → "a etapa anterior não terminou". */
function foraDeSequencia(stepId: string): boolean {
  const x = acharPasso(stepId)
  if (!x) return false
  const i = x.a.steps.findIndex((s) => s.id === stepId)
  const ant = i > 0 ? x.a.steps[i - 1] : null
  return !!ant && (ant.operationalStatus === 'PENDING' || ant.operationalStatus === 'BLOCKED')
}

function registrar(stepId: string, collaboratorId: string, minutes: number, entryAt: string | undefined, concluir: boolean) {
  const x = acharPasso(stepId)
  if (!x) throw new Erro(404, 'NOT_FOUND', 'Atividade não encontrada.')
  if (!['A_INICIAR', 'EM_ANDAMENTO'].includes(x.e.operationalStatus)) throw new Erro(422, 'CONVEYOR_TIME_ENTRY_STATUS_NOT_ALLOWED', 'Esta esteira ainda não foi liberada para a fábrica.')
  const at = entryAt && /^\d{4}-\d{2}-\d{2}$/.test(entryAt) ? new Date(`${entryAt}T12:00:00`).toISOString() : new Date().toISOString()
  if (minutes > 0) apontamentos.push({ id: novoId(), conveyorId: x.e.id, stepId, collaboratorId, minutes, at, criadoEm: new Date().toISOString() })
  x.s.operationalStatus = concluir ? 'COMPLETED' : 'IN_PROGRESS'
  if (concluir) x.s.completedByName = nomeDe(collaboratorId)
  if (x.e.operationalStatus === 'A_INICIAR') x.e.operationalStatus = 'EM_ANDAMENTO'
  return { id: novoId() }
}

function filaDe(cid: string) {
  const itens = [...planos.values()].flatMap((p) => p.publicados ?? []).filter((i) => i.assignedCollaboratorId === cid)
  const out = itens
    .map((i) => ({ i, x: acharPasso(i.activityNodeId) }))
    .filter((y) => y.x && y.x.s.operationalStatus !== 'COMPLETED' && y.x.s.operationalStatus !== 'ABORTED')
    .sort((a, b) => a.i.plannedDate.localeCompare(b.i.plannedDate) || a.i.plannedOrder - b.i.plannedOrder)
  return out.map(({ i, x }, n) => {
    const real = realizado(i.activityNodeId)
    const pode = ['A_INICIAR', 'EM_ANDAMENTO'].includes(x!.e.operationalStatus) && x!.s.operationalStatus !== 'BLOCKED'
    const fora = foraDeSequencia(i.activityNodeId)
    return {
      workPlanItemId: i.id,
      conveyorId: i.conveyorId,
      conveyorTitle: x!.e.name,
      activityNodeId: i.activityNodeId,
      activityTitle: x!.s.name,
      taskTitle: x!.o.name,
      sectorTitle: x!.a.name,
      plannedDate: i.plannedDate,
      plannedMinutes: i.plannedMinutes,
      realizedMinutes: real,
      pendingMinutes: Math.max(0, (i.plannedMinutes ?? 0) - real),
      isActivityCompleted: false,
      isOverdue: i.plannedDate < hoje(),
      isNextRecommended: n === 0 && !fora,
      group: i.plannedDate < hoje() ? 'overdue' : 'today',
      canTrackTime: pode,
      ...(pode ? {} : { blockingReason: x!.s.operationalStatus === 'BLOCKED' ? 'Atividade parada' : 'Esteira não liberada' }),
      canCompleteStep: true,
      requiresOutOfSequenceJustification: fora,
      ...(fora ? { sequenceWarningLabel: 'A atividade anterior do setor não começou' } : {}),
    }
  })
}

function rota(metodo: string, url: URL, corpo: unknown): unknown {
  const p = url.pathname.replace(/^.*\/api\/v1/, '')
  const q = (k: string) => url.searchParams.get(k)
  const b = (corpo ?? {}) as Record<string, unknown>
  const r = `${metodo} ${p}`
  let m: RegExpMatchArray | null

  if (r === 'GET /auth/me') {
    if (!gestora) throw new Erro(401, 'UNAUTHORIZED', 'Sessão expirada.')
    return { user: USER }
  }
  if (r === 'POST /auth/login') {
    gestora = true
    return { user: USER }
  }
  if (r === 'POST /auth/logout') {
    gestora = false
    return undefined
  }
  if (r === 'GET /conveyors') return [...esteiras.values()].map(({ structure: _s, ...e }) => (void _s, e))
  const minutosDe = (e: Esteira) => passos(e).reduce((x, p) => x + (p.s.plannedMinutes ?? 0), 0)
  if ((m = r.match(/^GET \/conveyors\/([\w-]+)$/))) {
    const e = esteiras.get(m[1])
    if (!e) throw new Erro(404, 'NOT_FOUND', 'Esteira não encontrada.')
    return { ...structuredClone(e), totalPlannedMinutes: minutosDe(e) }
  }
  if (r === 'POST /conveyors') {
    const d = b.dados as Record<string, string>
    const e: Esteira = { id: novoId(), code: null, name: d.nome, clientName: d.cliente || null, responsible: d.responsavel || null, priority: (d.prioridade || 'media') as Esteira['priority'], initialNotes: d.observacoes || null, createdAt: new Date().toISOString(), operationalStatus: 'EM_ELABORACAO', estimatedDeadline: d.prazoEstimado || null, totalSteps: 0, vehicle: d.veiculo || null, modelVersion: d.modeloVersao || null, plate: d.placa || null, baseNameSnapshot: 'Gol GTI completo', originRegister: 'BASE', matrixRootItemId: MATRIZ.id, structure: montar(b.options as CorpoEtapa[]) }
    e.totalSteps = passos(e).length
    esteiras.set(e.id, e)
    return { id: e.id, name: e.name, operationalStatus: e.operationalStatus }
  }
  if ((m = r.match(/^PATCH \/conveyors\/([\w-]+)\/structure$/))) {
    const e = esteiras.get(m[1])
    if (!e) throw new Erro(404, 'NOT_FOUND', 'Esteira não encontrada.')
    if (e.operationalStatus !== 'EM_ELABORACAO' && !(typeof b.reason === 'string' && b.reason.trim().length >= 3)) throw new Erro(422, 'VALIDATION_ERROR', 'Motivo obrigatório.')
    e.structure = montar(b.options as CorpoEtapa[], e)
    e.totalSteps = passos(e).length
    const vivos = new Set(passos(e).map((x) => x.s.id))
    for (const pl of planos.values()) pl.items = pl.items.filter((i) => i.conveyorId !== e.id || vivos.has(i.activityNodeId))
    return structuredClone(e)
  }
  if ((m = r.match(/^PATCH \/conveyors\/([\w-]+)$/))) {
    const e = esteiras.get(m[1])
    if (!e) throw new Erro(404, 'NOT_FOUND', 'Esteira não encontrada.')
    if (e.operationalStatus !== 'EM_ELABORACAO' && !(typeof b.reason === 'string' && b.reason.trim().length >= 3)) throw new Erro(422, 'VALIDATION_ERROR', 'Motivo deve ter entre 3 e 500 caracteres.')
    const v = (k: string) => (typeof b[k] === 'string' ? (b[k] as string).trim() || null : undefined)
    const campos: [string, keyof Esteira][] = [['nome', 'name'], ['cliente', 'clientName'], ['veiculo', 'vehicle'], ['modeloVersao', 'modelVersion'], ['placa', 'plate'], ['observacoes', 'initialNotes'], ['responsavel', 'responsible'], ['prazoEstimado', 'estimatedDeadline'], ['prioridade', 'priority']]
    for (const [k, campo] of campos) if (v(k) !== undefined) (e as Record<string, unknown>)[campo] = k === 'nome' ? (v(k) ?? e.name) : v(k)
    return structuredClone(e)
  }
  if ((m = r.match(/^PATCH \/conveyors\/([\w-]+)\/status$/))) {
    const e = esteiras.get(m[1])
    if (!e) throw new Erro(404, 'NOT_FOUND', 'Esteira não encontrada.')
    const para = b.operationalStatus as ConveyorStatus
    if (!TRANSICOES.has(`${e.operationalStatus}|${para}`)) throw new Erro(422, 'INVALID_STATUS_TRANSITION', `Não é permitido mudar de ${e.operationalStatus} para ${para}.`)
    e.operationalStatus = para
    return structuredClone(e)
  }
  if ((m = r.match(/^GET \/conveyors\/[\w-]+\/steps\/([\w-]+)\/time-entries$/)))
    return apontamentos.filter((x) => x.stepId === m![1]).map((x) => ({ id: x.id, collaboratorId: x.collaboratorId, collaboratorName: nomeDe(x.collaboratorId), minutes: x.minutes, notes: x.notes ?? null, entryAt: x.at, updatedAt: x.updatedAt ?? x.at }))
  if ((m = r.match(/^(PATCH|DELETE) \/conveyors\/[\w-]+\/steps\/[\w-]+\/time-entries\/([\w-]+)$/))) {
    const i = apontamentos.findIndex((x) => x.id === m![2])
    if (i < 0) throw new Erro(404, 'NOT_FOUND', 'Apontamento não encontrado.')
    if (!(typeof b.reason === 'string' && b.reason.trim())) throw new Erro(422, 'VALIDATION_ERROR', 'Informe o motivo.')
    if (m[1] === 'DELETE') {
      apontamentos.splice(i, 1)
      return { deleted: true }
    }
    const x = apontamentos[i]
    if (b.expectedUpdatedAt !== (x.updatedAt ?? x.at)) throw new Erro(409, 'CONFLICT', 'O apontamento foi alterado por outro usuário. Atualize a tela e tente novamente.')
    x.minutes = Number(b.minutes)
    x.updatedAt = new Date().toISOString()
    return { id: x.id, collaboratorId: x.collaboratorId, collaboratorName: nomeDe(x.collaboratorId), minutes: x.minutes, notes: null, entryAt: x.at, updatedAt: x.updatedAt }
  }
  if (r === 'GET /v2/etapa-imagens') return fotos
  if ((m = r.match(/^PUT \/v2\/etapa-imagens\/([\w-]+)$/))) {
    if (!(corpo instanceof Blob)) throw new Erro(422, 'VALIDATION_ERROR', 'Envie a imagem.')
    const no = MATRIZ.children.find((t) => t.id === m![1])
    if (!no) throw new Erro(404, 'NOT_FOUND', 'Etapa não encontrada na matriz.')
    const i = fotos.findIndex((f) => f.matrixNodeId === no.id)
    const f = { matrixNodeId: no.id, nome: no.name, atualizadaEm: new Date().toISOString(), url: URL.createObjectURL(corpo) }
    if (i >= 0) fotos[i] = f
    else fotos.push(f)
    return { matrixNodeId: no.id, atualizadaEm: f.atualizadaEm }
  }
  if ((m = r.match(/^DELETE \/v2\/etapa-imagens\/([\w-]+)$/))) {
    const i = fotos.findIndex((f) => f.matrixNodeId === m![1])
    if (i >= 0) fotos.splice(i, 1)
    return undefined
  }
  if (r === 'GET /operation-matrix/items') return [{ id: MATRIZ.id, name: MATRIZ.name, description: 'Planilha mestra (OS 7945)', is_active: true }]
  if ((m = r.match(/^GET \/operation-matrix\/items\/([\w-]+)\/tree$/))) return MATRIZ
  if (r === 'GET /collaborators') return todosColabs

  if (r === 'GET /operational-planning/week') return semana(segundaDaData(q('weekStart') ?? hoje()))
  if (r === 'POST /operational-planning/week') {
    const seg = b.weekStartDate as string
    const atual = planos.get(seg)
    const items = (b.items as ItemPlano[]).map((i) => ({ ...i, id: novoId(), plannedMinutes: i.plannedMinutes ?? null, notes: i.notes ?? null }))
    const concluidos = (atual?.items ?? []).filter((i) => acharPasso(i.activityNodeId)?.s.operationalStatus === 'COMPLETED' && !items.some((n) => n.activityNodeId === i.activityNodeId))
    planos.set(seg, { id: atual?.id ?? novoId(), weekStart: seg, status: 'DRAFT', items: [...concluidos, ...items], publicados: atual?.publicados ?? null })
    return semana(seg)
  }
  if ((m = r.match(/^POST \/operational-planning\/week\/([\w-]+)\/publish$/))) {
    const pl = [...planos.values()].find((x) => x.id === m![1])
    if (!pl) throw new Erro(404, 'NOT_FOUND', 'Plano não encontrado.')
    if (pl.items.length === 0) throw new Erro(400, 'VALIDATION_ERROR', 'Adicione ao menos uma atividade antes de publicar o plano.')
    pl.status = 'PUBLISHED'
    pl.publicados = pl.items.map((i) => ({ ...i }))
    return semana(pl.weekStart)
  }
  if (r === 'GET /operational-planning/backlog') {
    const items = backlog(q('conveyorId'), q('collaboratorId'), Number(q('limit') ?? 100))
    return { items, meta: { limit: 100 } }
  }
  if (r === 'GET /operational-planning/factory-intake') return { items: [] }
  if (r === 'GET /operational-planning/week-activity') {
    const seg = segundaDaData(q('weekStart') ?? hoje())
    const fim = somarDias(seg, 4)
    const data = apontamentos
      .filter((a) => {
        const d = isoLocal(new Date(a.at))
        return d >= seg && d <= fim
      })
      .sort((x, y) => y.at.localeCompare(x.at))
      .map((a) => ({ id: a.id, kind: 'TIME_ENTRY', occurredAt: a.at, conveyorId: a.conveyorId, collaboratorId: a.collaboratorId, collaboratorName: nomeDe(a.collaboratorId), minutes: a.minutes }))
    return { data, meta: { count: data.length, hasMore: false } }
  }

  if (r === 'GET /production/collaborators')
    return { items: colabs.map((c) => ({ id: c.id, fullName: c.full_name, name: c.full_name, displayName: c.full_name, avatarUrl: null, initials: c.full_name.split(' ').map((x) => x[0]).join('').slice(0, 2), teamName: null, productionCredentialStatus: 'READY' })) }
  if (r === 'POST /production/auth/login') {
    if (b.pin === '0000') throw new Erro(401, 'PRODUCTION_PIN_INVALID', 'PIN inválido.')
    tablet = b.collaboratorId as string
    const c = colabs.find((x) => x.id === tablet)
    return { status: 'AUTHENTICATED', collaborator: { id: c?.id, fullName: c?.full_name, initials: '', avatarUrl: null, teamName: null, productionCredentialStatus: 'READY' }, scope: 'PRODUCTION_MODE' }
  }
  if (r === 'POST /production/auth/logout' || r === 'POST /production/auth/change-pin') {
    if (r.endsWith('logout')) tablet = null
    return undefined
  }
  if (!tablet && p.startsWith('/production/')) throw new Erro(401, 'PRODUCTION_AUTH_INVALID', 'Entre com seu PIN.')
  if (r === 'GET /v2/producao/meus-lancamentos') {
    return apontamentos
      .filter((a) => a.collaboratorId === tablet && a.criadoEm && isoLocal(new Date(a.criadoEm)) === hoje())
      .sort((x, y) => (y.criadoEm ?? '').localeCompare(x.criadoEm ?? ''))
      .map((a) => {
        const x = acharPasso(a.stepId)
        const st = x?.s.operationalStatus
        const bloqueio = st === 'COMPLETED' ? 'A atividade já foi concluída. Peça para a gestora.' : st === 'ABORTED' ? 'A atividade foi dispensada. Peça para a gestora.' : null
        return { id: a.id, conveyorTitle: x?.e.name ?? '', activityTitle: x?.s.name ?? '', minutes: a.minutes, entryAt: a.at, updatedAt: a.updatedAt ?? a.criadoEm, podeCorrigir: !bloqueio, bloqueio }
      })
  }
  if ((m = r.match(/^(PATCH|DELETE) \/v2\/producao\/meus-lancamentos\/([\w-]+)$/))) {
    const i = apontamentos.findIndex((a) => a.id === m![2] && a.collaboratorId === tablet)
    if (i < 0) throw new Erro(404, 'NOT_FOUND', 'Lançamento não encontrado.')
    const a = apontamentos[i]
    if (acharPasso(a.stepId)?.s.operationalStatus === 'COMPLETED') throw new Erro(422, 'VALIDATION_ERROR', 'A atividade já foi concluída. Peça para a gestora.')
    if (!(typeof b.reason === 'string' && b.reason.trim().length >= 3)) throw new Erro(422, 'VALIDATION_ERROR', 'Informe o motivo (3 a 500 caracteres).')
    if (m[1] === 'DELETE') {
      apontamentos.splice(i, 1)
      return undefined
    }
    if (b.expectedUpdatedAt !== (a.updatedAt ?? a.criadoEm)) throw new Erro(409, 'CONFLICT', 'O lançamento mudou. Atualize a tela e tente de novo.')
    a.minutes = Number(b.minutes)
    a.updatedAt = new Date().toISOString()
    return { id: a.id, minutes: a.minutes }
  }
  if (r === 'GET /production/me/work-queue') return { date: hoje(), planStatus: 'PUBLISHED', summary: {}, items: filaDe(tablet!) }
  if (r === 'GET /production/time-entry-justifications') return JUSTIFICATIVAS
  if (r === 'POST /production/time-entries') {
    const stepId = b.stepNodeId as string
    const minutes = Number(b.minutes)
    const item = filaDe(tablet!).find((t) => t.activityNodeId === stepId)
    if (!item) throw new Erro(422, 'TIME_ENTRY_UNASSIGNED_REQUIRES_JUSTIFICATION', 'Esta atividade não está no seu planejamento publicado.')
    const excede = item.plannedMinutes != null && item.plannedMinutes > 0 && item.realizedMinutes + minutes > item.plannedMinutes
    if ((item.requiresOutOfSequenceJustification || excede) && !b.justificationId) throw new Erro(422, 'VALIDATION_ERROR', 'Informe a justificativa.')
    return registrar(stepId, tablet!, minutes, b.entryAt as string | undefined, b.markAsDone === true)
  }
  if (r === 'GET /production/me/time-entry-candidates') {
    const t = (q('q') ?? '').toLowerCase()
    const out = []
    for (const e of esteiras.values()) {
      if (!['A_INICIAR', 'EM_ANDAMENTO'].includes(e.operationalStatus)) continue
      for (const { o, a, s } of passos(e)) {
        if (s.operationalStatus === 'COMPLETED' || s.operationalStatus === 'ABORTED') continue
        const alvo = `${e.name} ${e.plate ?? ''} ${o.name} ${a.name} ${s.name}`.toLowerCase()
        if (!alvo.includes(t)) continue
        const minha = s.assignees.some((x) => x.collaboratorId === tablet)
        const fora = foraDeSequencia(s.id)
        out.push({ conveyorId: e.id, conveyorName: e.name, plate: e.plate, stepNodeId: s.id, activityTitle: s.name, taskTitle: o.name, sectorTitle: a.name, isAssignedToMe: minha, requiresJustification: !minha, isOutOfSequence: fora, hasPreviousPendingStep: fora, requiresOutOfSequenceJustification: fora, canPointTime: s.operationalStatus !== 'BLOCKED', ...(s.operationalStatus === 'BLOCKED' ? { blockingReason: 'Atividade parada' } : {}) })
        if (out.length >= 20) return out
      }
    }
    return out
  }
  if (r === 'POST /production/time-entries/unassigned-exception') return registrar(b.stepNodeId as string, tablet!, Number(b.minutes), b.entryAt as string | undefined, false)

  throw new Erro(404, 'NOT_FOUND', `Demonstração: rota ${r} não simulada.`)
}

const original = window.fetch.bind(window)
window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
  const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  if (!href.includes('/api/v1/')) return original(input, init)
  const url = new URL(href, window.location.href)
  const corpo = init?.body instanceof Blob ? init.body : typeof init?.body === 'string' && init.body ? JSON.parse(init.body) : undefined
  await new Promise((ok) => setTimeout(ok, 120))
  try {
    const data = rota((init?.method ?? 'GET').toUpperCase(), url, corpo)
    if (data === undefined) return new Response(null, { status: 204 })
    return new Response(JSON.stringify({ data }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    const err = e instanceof Erro ? e : new Erro(500, 'INTERNAL', e instanceof Error ? e.message : 'Erro na demonstração.')
    return new Response(JSON.stringify({ error: { code: err.code, message: err.message } }), { status: err.status, headers: { 'Content-Type': 'application/json' } })
  }
}
