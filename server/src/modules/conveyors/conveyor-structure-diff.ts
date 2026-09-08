/**
 * Diff puro: payload de estrutura (PATCH) vs nós ativos da esteira.
 * IDs no payload → update; sem ID → insert; ativos ausentes no payload → remove.
 */

export type StructureSourceOrigin = 'manual' | 'reaproveitada' | 'base'

export type StructureDiffAssignee = {
  type?: 'COLLABORATOR' | 'TEAM'
  collaboratorId?: string
  teamId?: string
  isPrimary: boolean
  assignmentOrigin?: StructureSourceOrigin
  orderIndex?: number
}

export type StructureDiffStepPayload = {
  id?: string
  titulo: string
  orderIndex: number
  plannedMinutes: number
  sourceOrigin: StructureSourceOrigin
  required?: boolean
  sourceKey?: string | null
  assignees?: StructureDiffAssignee[]
}

export type StructureDiffAreaPayload = {
  id?: string
  titulo: string
  orderIndex: number
  sourceOrigin: StructureSourceOrigin
  steps: StructureDiffStepPayload[]
}

export type StructureDiffOptionPayload = {
  id?: string
  titulo: string
  orderIndex: number
  sourceOrigin: StructureSourceOrigin
  areas: StructureDiffAreaPayload[]
}

export type ActiveStructureNode = {
  id: string
  parent_id: string | null
  node_type: 'OPTION' | 'AREA' | 'STEP'
  order_index: number
  name: string
  is_active: boolean
}

export type StructureDiffUpdate = {
  id: string
  nodeType: 'OPTION' | 'AREA' | 'STEP'
  /** UUID do parent se matched; null se OPTION ou parent ainda é insert */
  parentId: string | null
  /** parent UUID existente ou tempKey de insert (null = OPTION) */
  parentRef: string | null
  /** root OPTION id (existente ou chave temporária de insert) */
  rootRef: string
  name: string
  orderIndex: number
  sourceOrigin: StructureSourceOrigin
  plannedMinutes: number | null
  required: boolean
  sourceKey: string | null
  /** Só STEP matched: assignees a sincronizar */
  assignees: StructureDiffAssignee[] | null
}

export type StructureDiffInsert = {
  /** Chave estável no diff (não é UUID de BD) */
  tempKey: string
  nodeType: 'OPTION' | 'AREA' | 'STEP'
  /** parent UUID existente ou tempKey de insert */
  parentRef: string | null
  rootRef: string
  name: string
  orderIndex: number
  sourceOrigin: StructureSourceOrigin
  plannedMinutes: number | null
  required: boolean
  sourceKey: string | null
  assignees: StructureDiffAssignee[]
}

export type StructureDiffRemoval = {
  id: string
  nodeType: 'OPTION' | 'AREA' | 'STEP'
  parentId: string | null
}

export type ConveyorStructureDiff = {
  updates: StructureDiffUpdate[]
  inserts: StructureDiffInsert[]
  removals: StructureDiffRemoval[]
  /** STEP matched (com id) — sync de assignees */
  matchedStepIds: string[]
}

export type StructureDiffValidationError = {
  code: 'UNKNOWN_NODE_ID' | 'WRONG_NODE_TYPE' | 'DUPLICATE_PAYLOAD_ID' | 'INACTIVE_OR_MISSING'
  message: string
  nodeId?: string
}

function newTempKey(prefix: string, n: number): string {
  return `${prefix}:${n}`
}

/**
 * Calcula diff entre opções do payload e nós ativos.
 * Lança StructureDiffValidationError via retorno `error` (sem throw) para o service mapear AppError.
 */
export function computeConveyorStructureDiff(input: {
  options: StructureDiffOptionPayload[]
  activeNodes: ActiveStructureNode[]
}): { diff: ConveyorStructureDiff; error: null } | { diff: null; error: StructureDiffValidationError } {
  const active = input.activeNodes.filter((n) => n.is_active)
  const byId = new Map(active.map((n) => [n.id, n]))

  const seenPayloadIds = new Set<string>()
  const matchedIds = new Set<string>()
  const updates: StructureDiffUpdate[] = []
  const inserts: StructureDiffInsert[] = []
  const matchedStepIds: string[] = []
  let tempSeq = 0

  const claimId = (
    id: string | undefined,
    expectedType: 'OPTION' | 'AREA' | 'STEP',
  ): StructureDiffValidationError | null => {
    if (!id) return null
    if (seenPayloadIds.has(id)) {
      return {
        code: 'DUPLICATE_PAYLOAD_ID',
        message: `ID duplicado no payload da estrutura: ${id}`,
        nodeId: id,
      }
    }
    seenPayloadIds.add(id)
    const node = byId.get(id)
    if (!node) {
      return {
        code: 'UNKNOWN_NODE_ID',
        message: `Nó ${id} não pertence a esta esteira (ou está inativo).`,
        nodeId: id,
      }
    }
    if (node.node_type !== expectedType) {
      return {
        code: 'WRONG_NODE_TYPE',
        message: `Nó ${id} é ${node.node_type}, esperado ${expectedType}.`,
        nodeId: id,
      }
    }
    matchedIds.add(id)
    return null
  }

  const sortedOptions = [...input.options].sort((a, b) => a.orderIndex - b.orderIndex)
  for (const op of sortedOptions) {
    const opErr = claimId(op.id, 'OPTION')
    if (opErr) return { diff: null, error: opErr }

    const optionRef = op.id ?? newTempKey('opt', ++tempSeq)
    if (!op.id) {
      inserts.push({
        tempKey: optionRef,
        nodeType: 'OPTION',
        parentRef: null,
        rootRef: optionRef,
        name: op.titulo.trim(),
        orderIndex: op.orderIndex,
        sourceOrigin: op.sourceOrigin,
        plannedMinutes: null,
        required: true,
        sourceKey: null,
        assignees: [],
      })
    } else {
      updates.push({
        id: op.id,
        nodeType: 'OPTION',
        parentId: null,
        parentRef: null,
        rootRef: op.id,
        name: op.titulo.trim(),
        orderIndex: op.orderIndex,
        sourceOrigin: op.sourceOrigin,
        plannedMinutes: null,
        required: true,
        sourceKey: null,
        assignees: null,
      })
    }

    const areas = [...op.areas].sort((a, b) => a.orderIndex - b.orderIndex)
    for (const ar of areas) {
      const arErr = claimId(ar.id, 'AREA')
      if (arErr) return { diff: null, error: arErr }

      const areaRef = ar.id ?? newTempKey('area', ++tempSeq)
      if (!ar.id) {
        inserts.push({
          tempKey: areaRef,
          nodeType: 'AREA',
          parentRef: optionRef,
          rootRef: optionRef,
          name: ar.titulo.trim(),
          orderIndex: ar.orderIndex,
          sourceOrigin: ar.sourceOrigin,
          plannedMinutes: null,
          required: true,
          sourceKey: null,
          assignees: [],
        })
      } else {
        updates.push({
          id: ar.id,
          nodeType: 'AREA',
          parentId: op.id ?? null,
          parentRef: optionRef,
          rootRef: optionRef,
          name: ar.titulo.trim(),
          orderIndex: ar.orderIndex,
          sourceOrigin: ar.sourceOrigin,
          plannedMinutes: null,
          required: true,
          sourceKey: null,
          assignees: null,
        })
      }

      const steps = [...ar.steps].sort((a, b) => a.orderIndex - b.orderIndex)
      for (const st of steps) {
        const stErr = claimId(st.id, 'STEP')
        if (stErr) return { diff: null, error: stErr }

        const assignees = st.assignees ?? []
        if (!st.id) {
          const stepRef = newTempKey('step', ++tempSeq)
          inserts.push({
            tempKey: stepRef,
            nodeType: 'STEP',
            parentRef: areaRef,
            rootRef: optionRef,
            name: st.titulo.trim(),
            orderIndex: st.orderIndex,
            sourceOrigin: st.sourceOrigin,
            plannedMinutes: st.plannedMinutes,
            required: st.required ?? true,
            sourceKey: st.sourceKey?.trim() || null,
            assignees,
          })
        } else {
          matchedStepIds.push(st.id)
          updates.push({
            id: st.id,
            nodeType: 'STEP',
            parentId: ar.id ?? null,
            parentRef: areaRef,
            rootRef: optionRef,
            name: st.titulo.trim(),
            orderIndex: st.orderIndex,
            sourceOrigin: st.sourceOrigin,
            plannedMinutes: st.plannedMinutes,
            required: st.required ?? true,
            sourceKey: st.sourceKey?.trim() || null,
            assignees,
          })
        }
      }
    }
  }

  const removals: StructureDiffRemoval[] = []
  for (const node of active) {
    if (matchedIds.has(node.id)) continue
    removals.push({
      id: node.id,
      nodeType: node.node_type,
      parentId: node.parent_id,
    })
  }

  // Bottom-up: STEP → AREA → OPTION
  const typeOrder = { STEP: 0, AREA: 1, OPTION: 2 } as const
  removals.sort((a, b) => typeOrder[a.nodeType] - typeOrder[b.nodeType])

  // Inserts: OPTION → AREA → STEP (já empilhados nessa ordem pela varredura)

  return {
    diff: {
      updates,
      inserts,
      removals,
      matchedStepIds,
    },
    error: null,
  }
}

/**
 * Particiona remoções em subárvores (raízes cuja parent não está no conjunto).
 */
export function partitionRemovalSubtrees(
  removals: StructureDiffRemoval[],
): StructureDiffRemoval[][] {
  const byId = new Map(removals.map((r) => [r.id, r]))
  const children = new Map<string, StructureDiffRemoval[]>()
  const roots: StructureDiffRemoval[] = []

  for (const r of removals) {
    if (r.parentId && byId.has(r.parentId)) {
      const list = children.get(r.parentId) ?? []
      list.push(r)
      children.set(r.parentId, list)
    } else {
      roots.push(r)
    }
  }

  const collect = (root: StructureDiffRemoval): StructureDiffRemoval[] => {
    const out: StructureDiffRemoval[] = [root]
    const stack = [root.id]
    while (stack.length > 0) {
      const id = stack.pop()!
      for (const ch of children.get(id) ?? []) {
        out.push(ch)
        stack.push(ch.id)
      }
    }
    const typeOrder = { STEP: 0, AREA: 1, OPTION: 2 } as const
    out.sort((a, b) => typeOrder[a.nodeType] - typeOrder[b.nodeType])
    return out
  }

  return roots.map(collect)
}

export function stepIdsInRemovals(removals: StructureDiffRemoval[]): string[] {
  return removals.filter((r) => r.nodeType === 'STEP').map((r) => r.id)
}

/** Status em que STEPs novos NÃO recebem lateAdd (elaboração / aguardando). */
export function shouldMarkLateAddForNewSteps(operationalStatus: string): boolean {
  return (
    operationalStatus !== 'EM_ELABORACAO' &&
    operationalStatus !== 'AGUARDANDO_PLANEJAMENTO'
  )
}

export const INCREMENTAL_STRUCTURE_EDIT_REASON = 'INCREMENTAL_STRUCTURE_EDIT'
