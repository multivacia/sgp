import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import type {
  PatchConveyorStructureAreaBody,
  PatchConveyorStructureOptionBody,
} from './conveyors.schemas.js'

/**
 * Diff incremental de estrutura (PATCH /conveyors/:id/structure).
 * Só tipos + funções puras (sem I/O) — snapshot do banco é lido pelo service
 * (`conveyor-structure-diff.service.ts`) e passado aqui já carregado.
 */

export type StructureNodeKind = 'OPTION' | 'AREA' | 'STEP'

export type StructureDiffAssigneeInput = {
  type?: 'COLLABORATOR' | 'TEAM'
  collaboratorId?: string
  teamId?: string
  isPrimary: boolean
  assignmentOrigin?: 'manual' | 'base' | 'reaproveitada'
  orderIndex?: number
}

export type StructureDiffInsert = {
  kind: StructureNodeKind
  /** Chave sintética estável dentro do payload (ex.: "opt:0.area:1.step:2"). */
  clientKey: string
  /** `null` para OPTION (raiz). Pode ser um id real (pai já existente) ou a `clientKey` de um pai também novo. */
  parentClientKey: string | null
  orderIndex: number
  titulo: string
  sourceOrigin: 'manual' | 'reaproveitada' | 'base'
  plannedMinutes?: number
  required?: boolean
  sourceKey?: string | null
  assignees?: StructureDiffAssigneeInput[]
}

export type StructureDiffUpdate = {
  kind: StructureNodeKind
  id: string
  orderIndex: number
  titulo: string
  plannedMinutes?: number
  required?: boolean
}

export type StructureDiffRemoval = {
  kind: StructureNodeKind
  id: string
  /** Descendentes ativos cascateados por esta remoção (além do próprio `id`). */
  cascadeNodeIds: string[]
}

export type StructureDiffSummary = {
  insertCount: number
  updateCount: number
  removeCount: number
  reorderCount: number
}

export type StructureDiff = {
  conveyorId: string
  inserts: StructureDiffInsert[]
  updates: StructureDiffUpdate[]
  removals: StructureDiffRemoval[]
  summary: StructureDiffSummary
}

/** Snapshot mínimo de um nó ativo, já lido do banco pelo service. */
export type StructureDiffCurrentNode = {
  id: string
  parent_id: string | null
  root_id: string
  node_type: StructureNodeKind
  order_index: number
  name: string
  planned_minutes: number | null
  required: boolean
}

export type BuildStructureDiffInput = {
  conveyorId: string
  currentActiveNodes: StructureDiffCurrentNode[]
  requestedOptions: PatchConveyorStructureOptionBody[]
}

/** Sentinela interno: um nó existente não pode ser aninhado sob um pai novo. */
const NEW_PARENT_SENTINEL = '__NEW_PARENT__'

/**
 * Valida, para cada `id` presente no payload:
 * - pertence a esta esteira e está ativo (`deleted_at IS NULL`);
 * - o `node_type` real corresponde à posição informada (OPTION/AREA/STEP);
 * - o pai real (`parent_id`) corresponde ao pai informado pela posição no payload;
 * - não há `id` repetido no payload.
 * Lança `AppError` (404/422) em qualquer inconsistência — nada é alterado.
 */
export function assertStructureDiffOwnershipAndHierarchy(input: {
  conveyorId: string
  currentActiveNodes: StructureDiffCurrentNode[]
  requestedOptions: PatchConveyorStructureOptionBody[]
}): void {
  const byId = new Map(input.currentActiveNodes.map((n) => [n.id, n]))
  const seen = new Set<string>()

  function checkNode(
    kind: StructureNodeKind,
    id: string,
    expectedParentId: string | null | typeof NEW_PARENT_SENTINEL,
  ): void {
    if (seen.has(id)) {
      throw new AppError(
        'Identificador de nó repetido no payload de estrutura.',
        422,
        ErrorCodes.VALIDATION_ERROR,
      )
    }
    seen.add(id)
    const row = byId.get(id)
    if (!row) {
      throw new AppError(
        'Nó informado não encontrado nesta esteira.',
        404,
        ErrorCodes.NOT_FOUND,
      )
    }
    if (row.node_type !== kind) {
      throw new AppError(
        'Hierarquia inválida: o tipo do nó não corresponde à posição informada no payload.',
        422,
        ErrorCodes.VALIDATION_ERROR,
      )
    }
    if (expectedParentId === NEW_PARENT_SENTINEL) {
      throw new AppError(
        'Hierarquia inválida: um nó existente não pode ser aninhado sob um item novo.',
        422,
        ErrorCodes.VALIDATION_ERROR,
      )
    }
    if (row.parent_id !== expectedParentId) {
      throw new AppError(
        'Hierarquia inválida: o nó não pertence ao pai informado no payload.',
        422,
        ErrorCodes.VALIDATION_ERROR,
      )
    }
  }

  for (const opt of input.requestedOptions) {
    if (opt.id) checkNode('OPTION', opt.id, null)
    const optParentRef = opt.id ?? NEW_PARENT_SENTINEL
    for (const area of opt.areas as PatchConveyorStructureAreaBody[]) {
      if (area.id) checkNode('AREA', area.id, optParentRef)
      const areaParentRef = area.id ?? NEW_PARENT_SENTINEL
      for (const step of area.steps) {
        if (step.id) checkNode('STEP', step.id, areaParentRef)
      }
    }
  }
}

function isOrderIndexOnlyChange(
  current: StructureDiffCurrentNode,
  payload: { orderIndex: number; titulo: string; plannedMinutes?: number; required?: boolean },
): boolean {
  const titleSame = current.name === payload.titulo.trim()
  const minutesSame = (current.planned_minutes ?? null) === (payload.plannedMinutes ?? null)
  const requiredSame = current.required === (payload.required ?? true)
  const orderSame = current.order_index === payload.orderIndex
  return titleSame && minutesSame && requiredSame && !orderSame
}

/**
 * Constrói o diff (inserts/updates/removals) comparando o estado ativo atual
 * com a árvore solicitada. Pura — não faz I/O. Assume que
 * `assertStructureDiffOwnershipAndHierarchy` já validou o payload.
 */
export function buildStructureDiff(input: BuildStructureDiffInput): StructureDiff {
  const byId = new Map(input.currentActiveNodes.map((n) => [n.id, n]))
  const inserts: StructureDiffInsert[] = []
  const updates: StructureDiffUpdate[] = []
  const keptIds = new Set<string>()
  let reorderCount = 0

  input.requestedOptions.forEach((opt, oi) => {
    const optKey = `opt:${oi}`
    if (opt.id) {
      keptIds.add(opt.id)
      const current = byId.get(opt.id)!
      updates.push({ kind: 'OPTION', id: opt.id, orderIndex: opt.orderIndex, titulo: opt.titulo.trim() })
      if (isOrderIndexOnlyChange(current, { orderIndex: opt.orderIndex, titulo: opt.titulo })) {
        reorderCount++
      }
    } else {
      inserts.push({
        kind: 'OPTION',
        clientKey: optKey,
        parentClientKey: null,
        orderIndex: opt.orderIndex,
        titulo: opt.titulo.trim(),
        sourceOrigin: opt.sourceOrigin,
      })
    }
    const optParentKey = opt.id ?? optKey

    opt.areas.forEach((area, ai) => {
      const areaKey = `${optKey}.area:${ai}`
      if (area.id) {
        keptIds.add(area.id)
        const current = byId.get(area.id)!
        updates.push({ kind: 'AREA', id: area.id, orderIndex: area.orderIndex, titulo: area.titulo.trim() })
        if (isOrderIndexOnlyChange(current, { orderIndex: area.orderIndex, titulo: area.titulo })) {
          reorderCount++
        }
      } else {
        inserts.push({
          kind: 'AREA',
          clientKey: areaKey,
          parentClientKey: optParentKey,
          orderIndex: area.orderIndex,
          titulo: area.titulo.trim(),
          sourceOrigin: area.sourceOrigin,
        })
      }
      const areaParentKey = area.id ?? areaKey

      area.steps.forEach((step, si) => {
        const stepKey = `${areaKey}.step:${si}`
        const required = step.required ?? true
        if (step.id) {
          keptIds.add(step.id)
          const current = byId.get(step.id)!
          updates.push({
            kind: 'STEP',
            id: step.id,
            orderIndex: step.orderIndex,
            titulo: step.titulo.trim(),
            plannedMinutes: step.plannedMinutes,
            required,
          })
          if (
            isOrderIndexOnlyChange(current, {
              orderIndex: step.orderIndex,
              titulo: step.titulo,
              plannedMinutes: step.plannedMinutes,
              required,
            })
          ) {
            reorderCount++
          }
        } else {
          inserts.push({
            kind: 'STEP',
            clientKey: stepKey,
            parentClientKey: areaParentKey,
            orderIndex: step.orderIndex,
            titulo: step.titulo.trim(),
            sourceOrigin: step.sourceOrigin,
            plannedMinutes: step.plannedMinutes,
            required,
            sourceKey: step.sourceKey ?? null,
            assignees: step.assignees ?? [],
          })
        }
      })
    })
  })

  // Remoções: nós ativos não referenciados no payload. Cascateia para
  // descendentes ativos (a nidificação do payload garante que, se um nó some,
  // toda sua subárvore some junto — não há como referenciar um filho de um
  // nó omitido).
  const childrenByParent = new Map<string, StructureDiffCurrentNode[]>()
  for (const n of input.currentActiveNodes) {
    if (n.parent_id == null) continue
    const list = childrenByParent.get(n.parent_id) ?? []
    list.push(n)
    childrenByParent.set(n.parent_id, list)
  }

  const removals: StructureDiffRemoval[] = []
  let removeCount = 0
  for (const n of input.currentActiveNodes) {
    if (keptIds.has(n.id)) continue
    if (n.parent_id != null && !keptIds.has(n.parent_id) && byId.has(n.parent_id)) {
      // Pai também removido: esta remoção é cascata do pai, não uma raiz própria.
      continue
    }
    const cascadeNodeIds: string[] = []
    const stack = [n.id]
    while (stack.length > 0) {
      const cur = stack.pop()!
      for (const child of childrenByParent.get(cur) ?? []) {
        cascadeNodeIds.push(child.id)
        stack.push(child.id)
      }
    }
    removals.push({ kind: n.node_type, id: n.id, cascadeNodeIds })
    removeCount += 1 + cascadeNodeIds.length
  }

  return {
    conveyorId: input.conveyorId,
    inserts,
    updates,
    removals,
    summary: {
      insertCount: inserts.length,
      updateCount: updates.length,
      removeCount,
      reorderCount,
    },
  }
}
