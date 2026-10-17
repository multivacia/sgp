/**
 * Alterar esteira em andamento (mesmas telas da criação, com cadeados).
 * Monta o PATCH /api/v1/conveyors/:id/structure da V1, que trata o corpo como a árvore desejada:
 * nó enviado com id = mantido/atualizado; sem id = novo; nó ausente = removido
 * (a V1 desativa em vez de apagar quando há histórico). Responsáveis enviados SUBSTITUEM os atuais,
 * por isso toda atividade mantida é reenviada com os responsáveis que já tem.
 */
import { stepState, type ConveyorDetail, type ConveyorStep } from './conveyors'
import { activitiesOf, minutesOf, responsavelDe, sectorsOf, type Draft, type MatrixNode } from './novaEsteira'

export type Edit = {
  /** atividades existentes tiradas */
  off: Set<string>
  /** responsável principal trocado: stepId → collaboratorId */
  resp: Record<string, string>
  /** etapas da matriz incluídas agora (TASK da matriz) */
  add: MatrixNode[]
  /** escolhas dentro das etapas incluídas (mesmo formato da criação) */
  addDraft: Draft
}

export const emptyEdit = (): Edit => ({ off: new Set(), resp: {}, add: [], addDraft: { off: new Set(), resp: {} } })

/** Só atividade que ainda não começou pode ser tirada ou ter o responsável trocado. */
export const isLocked = (s: ConveyorStep) => stepState(s.operationalStatus) !== 'falta'

export function primaryId(s: ConveyorStep): string | null {
  return s.assignees.find((a) => a.type === 'COLLABORATOR' && a.isPrimary)?.collaboratorId ?? null
}

export function currentResp(e: Edit, s: ConveyorStep): string | null {
  return e.resp[s.id] ?? primaryId(s)
}

export function toggleStep(e: Edit, s: ConveyorStep): Edit {
  if (isLocked(s)) return e
  const off = new Set(e.off)
  if (off.has(s.id)) off.delete(s.id)
  else off.add(s.id)
  return { ...e, off }
}

/** Liga/desliga as atividades livres de um grupo; atividades com cadeado nunca mudam. */
export function toggleSteps(e: Edit, steps: ConveyorStep[]): Edit {
  const livres = steps.filter((s) => !isLocked(s))
  const anyOn = livres.some((s) => !e.off.has(s.id))
  const off = new Set(e.off)
  for (const s of livres) {
    if (anyOn) off.add(s.id)
    else off.delete(s.id)
  }
  return { ...e, off }
}

export function setStepResp(e: Edit, steps: ConveyorStep[], collaboratorId: string): Edit {
  const resp = { ...e.resp }
  for (const s of steps) {
    if (isLocked(s)) continue
    if (primaryId(s) === collaboratorId) delete resp[s.id]
    else resp[s.id] = collaboratorId
  }
  return { ...e, resp }
}

/** Lista do que muda (para o resumo e o motivo) e contagem por etapa (id da option ou da TASK incluída). */
export function changesOf(d: ConveyorDetail, e: Edit, nomeColab: (id: string | null) => string) {
  const lista: string[] = []
  const porEtapa: Record<string, number> = {}
  const conta = (k: string, n = 1) => (porEtapa[k] = (porEtapa[k] ?? 0) + n)
  for (const o of d.structure.options) {
    const steps = o.areas.flatMap((a) => a.steps)
    const tiradas = steps.filter((s) => e.off.has(s.id) && !isLocked(s))
    if (tiradas.length === steps.length && steps.length > 0) lista.push(`Tirada a etapa ${o.name}`)
    else if (tiradas.length) lista.push(`${tiradas.length === 1 ? 'Tirada 1 atividade' : `Tiradas ${tiradas.length} atividades`} de ${o.name}`)
    if (tiradas.length) conta(o.id, tiradas.length)
    for (const s of steps) {
      if (e.off.has(s.id) || isLocked(s) || !e.resp[s.id]) continue
      lista.push(`Responsável de "${s.name}": ${nomeColab(primaryId(s))} → ${nomeColab(e.resp[s.id])}`)
      conta(o.id)
    }
  }
  for (const t of e.add) {
    lista.push(`Incluída a etapa ${t.name}`)
    conta(t.id)
  }
  return { lista, porEtapa }
}

type Assignee = { type: 'COLLABORATOR' | 'TEAM'; collaboratorId?: string; teamId?: string; isPrimary: boolean; orderIndex?: number }

function keepAssignees(s: ConveyorStep, e: Edit): Assignee[] {
  const novo = isLocked(s) ? null : e.resp[s.id]
  const out: Assignee[] = []
  for (const a of s.assignees) {
    if (a.type === 'TEAM' && a.teamId) out.push({ type: 'TEAM', teamId: a.teamId, isPrimary: false, ...(a.orderIndex != null ? { orderIndex: a.orderIndex } : {}) })
    else if (a.type === 'COLLABORATOR' && a.collaboratorId) {
      if (novo && a.isPrimary) continue // o principal vai ser trocado
      if (novo && a.collaboratorId === novo) continue // evita duplicar quem vira principal
      out.push({ type: 'COLLABORATOR', collaboratorId: a.collaboratorId, isPrimary: novo ? false : a.isPrimary, ...(a.orderIndex != null ? { orderIndex: a.orderIndex } : {}) })
    }
  }
  if (novo) out.unshift({ type: 'COLLABORATOR', collaboratorId: novo, isPrimary: true })
  return out
}

/** Texto do motivo no formato aceito pela V1 (3 a 500 caracteres). */
export function reasonText(motivo: string | null, detalhe: string): string | null {
  const det = detalhe.trim()
  if (!motivo) return null
  if (motivo === 'Outro motivo') return det.length >= 3 ? det.slice(0, 500) : null
  return (det ? `${motivo}: ${det}` : motivo).slice(0, 500)
}

/** Corpo do PATCH /api/v1/conveyors/:id/structure. */
/** `reason` null = esteira ainda em elaboração (a V1 não exige motivo). */
export function buildPatchBody(d: ConveyorDetail, e: Edit, reason: string | null) {
  const origemExistente = d.originRegister === 'MANUAL' ? 'manual' : 'base'
  const existentes = d.structure.options
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((o) => ({
      id: o.id,
      titulo: o.name.trim(),
      sourceOrigin: origemExistente as 'base' | 'manual',
      areas: o.areas
        .slice()
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((a) => ({
          id: a.id,
          titulo: a.name.trim(),
          sourceOrigin: origemExistente as 'base' | 'manual',
          steps: a.steps
            .slice()
            .sort((x, y) => x.orderIndex - y.orderIndex)
            .filter((s) => isLocked(s) || !e.off.has(s.id))
            .map((s, i) => ({
              id: s.id,
              titulo: s.name.trim(),
              orderIndex: i + 1,
              plannedMinutes: Math.max(0, Math.floor(s.plannedMinutes ?? 0)),
              plannedQuantity: Math.max(1, Math.floor(s.plannedQuantity ?? 1)),
              sourceOrigin: origemExistente as 'base' | 'manual',
              assignees: keepAssignees(s, e),
            })),
        }))
        .filter((a) => a.steps.length > 0)
        .map((a, i) => ({ ...a, orderIndex: i + 1 })),
    }))

  const novas = e.add.map((t) => ({
    titulo: t.name.trim(),
    sourceOrigin: 'base' as const,
    areas: sectorsOf(t)
      .map((sec) => ({
        titulo: sec.name.trim(),
        sourceOrigin: 'base' as const,
        steps: activitiesOf(sec)
          .filter((a) => !e.addDraft.off.has(a.id))
          .map((a, i) => {
            const assignees: Assignee[] = []
            const r = responsavelDe(e.addDraft, a)
            if (r) assignees.push({ type: 'COLLABORATOR', collaboratorId: r, isPrimary: true })
            if (a.team_ids?.[0]) assignees.push({ type: 'TEAM', teamId: a.team_ids[0], isPrimary: false })
            return {
              titulo: a.name.trim(),
              orderIndex: i + 1,
              plannedMinutes: minutesOf(a),
              plannedQuantity: 1,
              sourceOrigin: 'base' as const,
              sourceKey: a.source_key?.trim() || a.id,
              required: a.required,
              assignees,
            }
          }),
      }))
      .filter((a) => a.steps.length > 0)
      .map((a, i) => ({ ...a, orderIndex: i + 1 })),
  }))

  const options = [...existentes, ...novas].filter((o) => o.areas.length > 0).map((o, i) => ({ ...o, orderIndex: i + 1 }))
  if (options.length === 0) throw new Error('A esteira precisa de pelo menos uma atividade.')

  return {
    originType: d.originRegister,
    matrixRootItemId: d.matrixRootItemId,
    options,
    ...(reason ? { reason } : {}),
  }
}
