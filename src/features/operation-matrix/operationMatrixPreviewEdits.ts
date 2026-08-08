import type { MatrixNodeTreeApi } from '../../domain/operation-matrix/operation-matrix.types'
import type { OperationMatrixMacroPreviewModel } from './operationMatrixPreviewMapper'
import { findParentIdOf, orderTreeMatchesBaseline } from './matrixStructureReorder'
import { deepCloneMatrixTree, findNodeInTree } from './operationMatrixPreviewSnapshot'
import { normalizeMatrixTeamIds } from './matrixTreeAggregates'

export type ActivityFieldPatch = {
  planned_minutes: number | null
  team_ids: string[]
  default_responsible_id: string | null
}

const STRUCTURE_NAME_NODE_TYPES = new Set(['TASK', 'SECTOR', 'ACTIVITY'] as const)

export function normalizePreviewStructureNodeName(raw: string): string {
  return raw.trim()
}

export function previewStructureNodeNameIsValid(name: string): boolean {
  return normalizePreviewStructureNodeName(name).length > 0
}

export function structureNamesSignature(tree: MatrixNodeTreeApi): string {
  const rows: { id: string; name: string }[] = []
  function walk(n: MatrixNodeTreeApi) {
    if (STRUCTURE_NAME_NODE_TYPES.has(n.node_type as 'TASK' | 'SECTOR' | 'ACTIVITY')) {
      rows.push({ id: n.id, name: normalizePreviewStructureNodeName(n.name) })
    }
    for (const c of n.children) walk(c)
  }
  walk(tree)
  rows.sort((a, b) => a.id.localeCompare(b.id))
  return JSON.stringify(rows)
}

export function patchNodeNameInTreeClone(
  tree: MatrixNodeTreeApi,
  nodeId: string,
  name: string,
): MatrixNodeTreeApi {
  const next = deepCloneMatrixTree(tree)
  const node = findNodeInTree(next, nodeId)
  if (!node || !STRUCTURE_NAME_NODE_TYPES.has(node.node_type as 'TASK' | 'SECTOR' | 'ACTIVITY')) {
    return next
  }
  node.name = normalizePreviewStructureNodeName(name)
  return next
}

export function collectStructureNameDiffs(
  baseline: MatrixNodeTreeApi,
  working: MatrixNodeTreeApi,
): { id: string; name: string }[] {
  const baseMap = new Map<string, string>()
  function collect(n: MatrixNodeTreeApi) {
    if (STRUCTURE_NAME_NODE_TYPES.has(n.node_type as 'TASK' | 'SECTOR' | 'ACTIVITY')) {
      baseMap.set(n.id, normalizePreviewStructureNodeName(n.name))
    }
    for (const c of n.children) collect(c)
  }
  collect(baseline)

  const out: { id: string; name: string }[] = []
  function diffWalk(n: MatrixNodeTreeApi) {
    if (STRUCTURE_NAME_NODE_TYPES.has(n.node_type as 'TASK' | 'SECTOR' | 'ACTIVITY')) {
      const current = normalizePreviewStructureNodeName(n.name)
      const base = baseMap.get(n.id)
      if (base != null && base !== current) {
        out.push({ id: n.id, name: current })
      }
    }
    for (const c of n.children) diffWalk(c)
  }
  diffWalk(working)
  return out
}

export function collectPreviewStructureDeletions(
  baseline: MatrixNodeTreeApi,
  working: MatrixNodeTreeApi,
): string[] {
  const workingIds = new Set<string>()
  function walk(n: MatrixNodeTreeApi) {
    workingIds.add(n.id)
    for (const c of n.children) walk(c)
  }
  walk(working)

  const out: string[] = []
  function walkBaseline(n: MatrixNodeTreeApi) {
    if (n.node_type !== 'ITEM' && !workingIds.has(n.id)) {
      const parentId = findParentIdOf(baseline, n.id)
      if (!parentId || workingIds.has(parentId)) {
        out.push(n.id)
      }
    }
    for (const c of n.children) walkBaseline(c)
  }
  walkBaseline(baseline)
  return out
}

export function activityFieldsSignature(tree: MatrixNodeTreeApi): string {
  const rows: { id: string; pm: number | null; teams: string[]; resp: string | null }[] = []
  function walk(n: MatrixNodeTreeApi) {
    if (n.node_type === 'ACTIVITY') {
      rows.push({
        id: n.id,
        pm: n.planned_minutes ?? null,
        teams: normalizeMatrixTeamIds(n.team_ids).slice(0, 1),
        resp: n.default_responsible_id ?? null,
      })
    }
    for (const c of n.children) walk(c)
  }
  walk(tree)
  rows.sort((a, b) => a.id.localeCompare(b.id))
  return JSON.stringify(rows)
}

export function patchActivityFieldsInTreeClone(
  tree: MatrixNodeTreeApi,
  activityId: string,
  patch: Partial<Pick<ActivityFieldPatch, 'planned_minutes' | 'team_ids' | 'default_responsible_id'>>,
): MatrixNodeTreeApi {
  const next = deepCloneMatrixTree(tree)
  const node = findNodeInTree(next, activityId)
  if (!node || node.node_type !== 'ACTIVITY') return next
  if (patch.planned_minutes !== undefined) {
    node.planned_minutes = patch.planned_minutes
  }
  if (patch.team_ids !== undefined) {
    node.team_ids = normalizeMatrixTeamIds(patch.team_ids).slice(0, 1)
  }
  if (patch.default_responsible_id !== undefined) {
    node.default_responsible_id = patch.default_responsible_id
  }
  return next
}

export type PreviewActivityValidation =
  | { ok: true }
  | { ok: false; message: string }

/** Avisos informativos na Matriz (não bloqueiam salvamento). */
export type MatrixPreviewActivityInfoFlags = {
  /** `null` ou `0` minutos — sem tempo previsto útil. */
  missingEffectiveTime: boolean
  /** Sem equipe padrão na atividade. */
  missingDefaultTeam: boolean
}

export function matrixPreviewActivityInfoFlags(
  plannedMinutes: number | null,
  teamIds?: string[] | null,
): MatrixPreviewActivityInfoFlags {
  const missingEffectiveTime =
    plannedMinutes === null || plannedMinutes === 0
  const hasTeam = normalizeMatrixTeamIds(teamIds).length > 0
  const missingDefaultTeam = !hasTeam
  return { missingEffectiveTime, missingDefaultTeam }
}

/**
 * Valida apenas valores inválidos antes de salvar na pré-visualização da Matriz.
 * Tempo zero, ausência de tempo e ausência de equipe padrão são permitidos.
 */
export function validatePreviewActivityTree(
  tree: MatrixNodeTreeApi,
): PreviewActivityValidation {
  function walk(n: MatrixNodeTreeApi): PreviewActivityValidation {
    if (STRUCTURE_NAME_NODE_TYPES.has(n.node_type as 'TASK' | 'SECTOR' | 'ACTIVITY')) {
      if (!previewStructureNodeNameIsValid(n.name)) {
        return { ok: false, message: 'Informe um nome.' }
      }
    }
    if (n.node_type === 'ACTIVITY') {
      const pm = n.planned_minutes
      if (pm != null) {
        if (!Number.isInteger(pm)) {
          return {
            ok: false,
            message: 'Tempo previsto deve ser um número inteiro de minutos.',
          }
        }
        if (pm < 0) {
          return {
            ok: false,
            message: 'Tempo previsto não pode ser negativo.',
          }
        }
      }
    }
    for (const c of n.children) {
      const r = walk(c)
      if (!r.ok) return r
    }
    return { ok: true }
  }
  return walk(tree)
}

export function collectActivityFieldDiffs(
  baseline: MatrixNodeTreeApi,
  working: MatrixNodeTreeApi,
): { id: string; patch: ActivityFieldPatch }[] {
  const baseMap = new Map<string, ActivityFieldPatch>()
  function collect(n: MatrixNodeTreeApi) {
    if (n.node_type === 'ACTIVITY') {
      baseMap.set(n.id, {
        planned_minutes: n.planned_minutes ?? null,
        team_ids: normalizeMatrixTeamIds(n.team_ids).slice(0, 1),
        default_responsible_id: n.default_responsible_id ?? null,
      })
    }
    for (const c of n.children) collect(c)
  }
  collect(baseline)

  const out: { id: string; patch: ActivityFieldPatch }[] = []
  function diffWalk(n: MatrixNodeTreeApi) {
    if (n.node_type === 'ACTIVITY') {
      const b = baseMap.get(n.id)
      const teams = normalizeMatrixTeamIds(n.team_ids).slice(0, 1)
      const cur: ActivityFieldPatch = {
        planned_minutes: n.planned_minutes ?? null,
        team_ids: teams,
        default_responsible_id: n.default_responsible_id ?? null,
      }
      if (
        b &&
        (b.planned_minutes !== cur.planned_minutes ||
          JSON.stringify(b.team_ids) !== JSON.stringify(cur.team_ids) ||
          b.default_responsible_id !== cur.default_responsible_id)
      ) {
        out.push({ id: n.id, patch: cur })
      }
    }
    for (const c of n.children) diffWalk(c)
  }
  diffWalk(working)
  return out
}

/** Há pelo menos uma Atividade sem tempo previsto útil ou sem equipe padrão (avisos informativos). */
export function matrixPreviewModelHasInformativeActivityGaps(
  model: OperationMatrixMacroPreviewModel,
): boolean {
  for (const t of model.tasks) {
    for (const s of t.sectors) {
      for (const a of s.activities) {
        const f = matrixPreviewActivityInfoFlags(a.plannedMinutes, a.teamIds)
        if (f.missingEffectiveTime || f.missingDefaultTeam) return true
      }
    }
  }
  return false
}

export function isPreviewWorkingTreeDirty(
  working: MatrixNodeTreeApi,
  baselineActivitySig: string,
  baselineOrderMap: ReadonlyMap<string, number>,
  baselineNamesSig: string,
): boolean {
  if (activityFieldsSignature(working) !== baselineActivitySig) return true
  if (structureNamesSignature(working) !== baselineNamesSig) return true
  return !orderTreeMatchesBaseline(working, baselineOrderMap)
}
