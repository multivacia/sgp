import type {
  ConveyorSourceOrigin,
  CreateConveyorDados,
  CreateConveyorInput,
  CreateConveyorOptionInput,
  CreateConveyorStepAssigneeInput,
} from '../../../domain/conveyors/conveyor.types'
import type { MatrixNodeTreeApi } from '../../../domain/operation-matrix/operation-matrix.types'

function sortByOrder(children: MatrixNodeTreeApi[]): MatrixNodeTreeApi[] {
  return [...children].sort((a, b) => a.order_index - b.order_index)
}

/** Pelo menos uma ACTIVITY em algum ramo TASK → SECTOR. */
export function matrixHasRunnableStructure(tree: MatrixNodeTreeApi): boolean {
  if (tree.node_type !== 'ITEM') return false
  const tasks = tree.children.filter((c) => c.node_type === 'TASK')
  for (const task of tasks) {
    const sectors = task.children.filter((c) => c.node_type === 'SECTOR')
    for (const sector of sectors) {
      if (sector.children.some((c) => c.node_type === 'ACTIVITY')) {
        return true
      }
    }
  }
  return false
}

/**
 * Converte a árvore da matriz (ITEM → TASK → SECTOR → ACTIVITY) em opções/áreas/etapas do POST conveyors.
 * TASK = opção, SECTOR = área, ACTIVITY = etapa (STEP).
 */
export function mapMatrixTreeToConveyorOptionsWithOrigin(
  tree: MatrixNodeTreeApi,
  assignmentsByMatrixActivityId: Record<
    string,
    CreateConveyorStepAssigneeInput[]
  >,
  nodeOrigin: ConveyorSourceOrigin,
): CreateConveyorOptionInput[] {
  if (tree.node_type !== 'ITEM') {
    throw new Error('Matriz inválida: raiz deve ser ITEM.')
  }
  const tasks = sortByOrder(tree.children.filter((c) => c.node_type === 'TASK'))
  return tasks
    .map((task) => ({
      titulo: task.name.trim(),
      /** Matriz usa `order_index` 0-based; POST /conveyors exige `orderIndex` ≥ 1 (Zod). */
      orderIndex: task.order_index + 1,
      sourceOrigin: nodeOrigin,
      areas: sortByOrder(task.children.filter((c) => c.node_type === 'SECTOR'))
        .map((sector) => ({
          titulo: sector.name.trim(),
          orderIndex: sector.order_index + 1,
          sourceOrigin: nodeOrigin,
          steps: sortByOrder(
            sector.children.filter((c) => c.node_type === 'ACTIVITY'),
          ).map((act) => ({
            titulo: act.name.trim(),
            orderIndex: act.order_index + 1,
            plannedMinutes: Math.max(
              0,
              Math.floor(Number(act.planned_minutes ?? 0)),
            ),
            sourceOrigin: nodeOrigin,
            required: act.required,
            assignees: assignmentsByMatrixActivityId[act.id] ?? [],
          })),
        }))
        .filter((area) => area.steps.length > 0),
    }))
    .filter((opt) => opt.areas.length > 0)
}

export function mapMatrixTreeToConveyorOptions(
  tree: MatrixNodeTreeApi,
  assignmentsByMatrixActivityId: Record<
    string,
    CreateConveyorStepAssigneeInput[]
  >,
): CreateConveyorInput['options'] {
  return mapMatrixTreeToConveyorOptionsWithOrigin(
    tree,
    assignmentsByMatrixActivityId,
    'base',
  )
}

export type MatrixCompositionOrigin = 'base' | 'complement' | 'manual'

export type MatrixActivitySlot = {
  matrixActivityId: string
  name: string
  pathLabel: string
  plannedMinutes: number
  compositionOrigin: MatrixCompositionOrigin
}

export function listMatrixActivitySlots(
  tree: MatrixNodeTreeApi,
  compositionOrigin: MatrixCompositionOrigin = 'base',
): MatrixActivitySlot[] {
  if (tree.node_type !== 'ITEM') return []
  const out: MatrixActivitySlot[] = []
  const tasks = sortByOrder(tree.children.filter((c) => c.node_type === 'TASK'))
  for (const task of tasks) {
    const optLabel = task.name.trim()
    const sectors = sortByOrder(
      task.children.filter((c) => c.node_type === 'SECTOR'),
    )
    for (const sector of sectors) {
      const areaLabel = sector.name.trim()
      const activities = sortByOrder(
        sector.children.filter((c) => c.node_type === 'ACTIVITY'),
      )
      for (const act of activities) {
        out.push({
          matrixActivityId: act.id,
          name: act.name.trim(),
          pathLabel: `${optLabel} · ${areaLabel}`,
          plannedMinutes: act.planned_minutes ?? 0,
          compositionOrigin,
        })
      }
    }
  }
  return out
}

export function listMergedMatrixActivitySlots(
  baseTree: MatrixNodeTreeApi,
  complementTrees: MatrixNodeTreeApi[],
): MatrixActivitySlot[] {
  return [
    ...listMatrixActivitySlots(baseTree, 'base'),
    ...complementTrees.flatMap((t) => listMatrixActivitySlots(t, 'complement')),
  ]
}

function renumberConveyorOptions(
  opts: CreateConveyorOptionInput[],
): CreateConveyorOptionInput[] {
  return opts.map((o, i) => ({ ...o, orderIndex: i + 1 }))
}

export function buildCreateConveyorFromBaseAndComplementMatrices(
  baseTree: MatrixNodeTreeApi,
  complementTrees: MatrixNodeTreeApi[],
  dados: CreateConveyorDados,
  assignmentsByMatrixActivityId: Record<
    string,
    CreateConveyorStepAssigneeInput[]
  >,
): CreateConveyorInput {
  const baseOpts = mapMatrixTreeToConveyorOptionsWithOrigin(
    baseTree,
    assignmentsByMatrixActivityId,
    'base',
  )
  const extraOpts = complementTrees.flatMap((t) =>
    mapMatrixTreeToConveyorOptionsWithOrigin(
      t,
      assignmentsByMatrixActivityId,
      'reaproveitada',
    ),
  )
  const merged = renumberConveyorOptions([...baseOpts, ...extraOpts])
  const originType =
    complementTrees.length > 0 ? ('HYBRID' as const) : ('BASE' as const)
  return {
    dados,
    originType,
    baseId: null,
    baseCode: null,
    baseName: null,
    baseVersion: null,
    matrixRootItemId: baseTree.id,
    options: merged,
  }
}

export type ManualOptionDraft = {
  key: string
  titulo: string
  areas: ManualAreaDraft[]
  /** Dedup de catálogo (ex.: `m:<matrixItemId>` ou `t:<taskNodeId>`). */
  catalogSourceKey?: string
}

export type ManualAreaDraft = {
  key: string
  titulo: string
  steps: ManualStepDraft[]
}

export type ManualStepDraft = {
  key: string
  titulo: string
  plannedMinutes: number
}

export function buildManualConveyorInput(
  dados: CreateConveyorDados,
  roots: ManualOptionDraft[],
  assigneesByStepKey: Record<string, CreateConveyorStepAssigneeInput[]>,
): CreateConveyorInput {
  const options: CreateConveyorOptionInput[] = roots.map((op, oi) => ({
    titulo: op.titulo.trim(),
    orderIndex: oi + 1,
    sourceOrigin: 'manual',
    areas: op.areas.map((ar, ai) => ({
      titulo: ar.titulo.trim(),
      orderIndex: ai + 1,
      sourceOrigin: 'manual',
      steps: ar.steps.map((st, si) => ({
        titulo: st.titulo.trim(),
        orderIndex: si + 1,
        plannedMinutes: Math.max(0, Math.floor(st.plannedMinutes)),
        sourceOrigin: 'manual',
        required: true,
        assignees: assigneesByStepKey[st.key] ?? [],
      })),
    })),
  }))
  return {
    dados,
    originType: 'MANUAL',
    baseId: null,
    baseCode: null,
    baseName: null,
    baseVersion: null,
    matrixRootItemId: null,
    options,
  }
}

export function buildCreateConveyorFromMatrixInput(
  tree: MatrixNodeTreeApi,
  dados: CreateConveyorDados,
  assignmentsByMatrixActivityId: Record<
    string,
    CreateConveyorStepAssigneeInput[]
  >,
): CreateConveyorInput {
  return {
    dados,
    originType: 'BASE',
    baseId: null,
    baseCode: null,
    baseName: null,
    baseVersion: null,
    matrixRootItemId: tree.id,
    options: mapMatrixTreeToConveyorOptions(tree, assignmentsByMatrixActivityId),
  }
}

/** Linha de UI antes do POST — sem `assignmentOrigin` (preenchido a partir do slot). */
export type NovaEsteiraAlocacaoLinha = {
  type?: 'COLLABORATOR' | 'TEAM'
  collaboratorId?: string
  teamId?: string
  isPrimary: boolean
}

export function buildMatrixStepAssigneesPayload(
  slots: MatrixActivitySlot[],
  byMatrixActivityId: Record<string, NovaEsteiraAlocacaoLinha[]>,
): Record<string, CreateConveyorStepAssigneeInput[]> {
  const out: Record<string, CreateConveyorStepAssigneeInput[]> = {}
  for (const s of slots) {
    const rows = byMatrixActivityId[s.matrixActivityId] ?? []
    if (rows.length === 0) continue
    const assignmentOrigin =
      s.compositionOrigin === 'base'
        ? ('base' as const)
        : s.compositionOrigin === 'complement'
          ? ('reaproveitada' as const)
          : ('manual' as const)
    out[s.matrixActivityId] = rows.map((r, i) => ({
      type: r.type,
      ...(r.type === 'COLLABORATOR' && r.collaboratorId
        ? { collaboratorId: r.collaboratorId }
        : {}),
      ...(r.type === 'TEAM' && r.teamId ? { teamId: r.teamId } : {}),
      isPrimary: r.isPrimary,
      assignmentOrigin,
      orderIndex: i,
    }))
  }
  return out
}

export function manualAssigneeRowsToApi(
  rows: NovaEsteiraAlocacaoLinha[],
): CreateConveyorStepAssigneeInput[] {
  return rows.map((r, i) => ({
    type: r.type,
    ...(r.type === 'COLLABORATOR' && r.collaboratorId
      ? { collaboratorId: r.collaboratorId }
      : {}),
    ...(r.type === 'TEAM' && r.teamId ? { teamId: r.teamId } : {}),
    isPrimary: r.isPrimary,
    assignmentOrigin: 'manual' as const,
    orderIndex: i,
  }))
}

export function validateManualStructure(roots: ManualOptionDraft[]): string | null {
  if (roots.length === 0) {
    return 'Inclua pelo menos uma opção com área e etapa.'
  }
  for (const op of roots) {
    if (!op.titulo.trim()) return 'Cada opção precisa de um título.'
    if (op.areas.length === 0) return 'Cada opção precisa de pelo menos uma área.'
    for (const ar of op.areas) {
      if (!ar.titulo.trim()) return 'Cada área precisa de um título.'
      if (ar.steps.length === 0) return 'Cada área precisa de pelo menos uma etapa.'
      for (const st of ar.steps) {
        if (!st.titulo.trim()) return 'Cada etapa precisa de um título.'
      }
    }
  }
  return null
}

export function validateManualStepAssignees(
  roots: ManualOptionDraft[],
  byId: Record<string, NovaEsteiraAlocacaoLinha[]>,
): string | null {
  for (const op of roots) {
    for (const ar of op.areas) {
      for (const st of ar.steps) {
        const rows = byId[st.key] ?? []
        if (rows.length === 0) continue
        const collaboratorRows = rows.filter((r) => (r.type ?? 'COLLABORATOR') === 'COLLABORATOR')
        const prim = collaboratorRows.filter((r) => r.isPrimary)
        if (collaboratorRows.length > 0 && prim.length !== 1) {
          return `“${st.titulo.trim()}”: com colaboradores alocados, deve haver exatamente um principal.`
        }
        const collabIds = collaboratorRows
          .map((r) => r.collaboratorId)
          .filter((x): x is string => Boolean(x))
        const ids = new Set(collabIds)
        if (ids.size !== collabIds.length) {
          return `“${st.titulo.trim()}”: o mesmo colaborador não pode repetir na etapa.`
        }
        const teamIds = rows
          .filter((r) => (r.type ?? 'COLLABORATOR') === 'TEAM')
          .map((r) => r.teamId)
          .filter((x): x is string => Boolean(x))
        if (new Set(teamIds).size !== teamIds.length) {
          return `“${st.titulo.trim()}”: o mesmo time não pode repetir na etapa.`
        }
        if (rows.some((r) => r.type === 'TEAM' && r.isPrimary)) {
          return `“${st.titulo.trim()}”: time não pode ser responsável principal.`
        }
      }
    }
  }
  return null
}
