import type { MatrixNodeTreeApi } from '../../domain/operation-matrix/operation-matrix.types'
import type { OperationMatrixMacroPreviewModel } from './operationMatrixPreviewMapper'
import { deepCloneMatrixTree, findNodeInTree } from './operationMatrixPreviewSnapshot'

export type ActivityFieldPatch = {
  planned_minutes: number | null
  default_responsible_id: string | null
}

export function activityFieldsSignature(tree: MatrixNodeTreeApi): string {
  const rows: { id: string; pm: number | null; dr: string | null }[] = []
  function walk(n: MatrixNodeTreeApi) {
    if (n.node_type === 'ACTIVITY') {
      const dr = n.default_responsible_id
      rows.push({
        id: n.id,
        pm: n.planned_minutes ?? null,
        dr: dr == null || dr.trim() === '' ? null : dr.trim(),
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
  patch: Partial<Pick<ActivityFieldPatch, 'planned_minutes' | 'default_responsible_id'>>,
): MatrixNodeTreeApi {
  const next = deepCloneMatrixTree(tree)
  const node = findNodeInTree(next, activityId)
  if (!node || node.node_type !== 'ACTIVITY') return next
  if (patch.planned_minutes !== undefined) {
    node.planned_minutes = patch.planned_minutes
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
  missingResponsible: boolean
}

export function matrixPreviewActivityInfoFlags(
  plannedMinutes: number | null,
  defaultResponsibleId: string | null | undefined,
): MatrixPreviewActivityInfoFlags {
  const missingEffectiveTime =
    plannedMinutes === null || plannedMinutes === 0
  const dr = defaultResponsibleId?.trim() ?? ''
  const missingResponsible = dr === ''
  return { missingEffectiveTime, missingResponsible }
}

/**
 * Valida apenas valores inválidos antes de salvar na pré-visualização da Matriz.
 * Tempo zero, ausência de tempo e ausência de responsável padrão são permitidos.
 */
export function validatePreviewActivityTree(
  tree: MatrixNodeTreeApi,
): PreviewActivityValidation {
  function walk(n: MatrixNodeTreeApi): PreviewActivityValidation {
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
      const dr = n.default_responsible_id
      baseMap.set(n.id, {
        planned_minutes: n.planned_minutes ?? null,
        default_responsible_id:
          dr == null || dr.trim() === '' ? null : dr.trim(),
      })
    }
    for (const c of n.children) collect(c)
  }
  collect(baseline)

  const out: { id: string; patch: ActivityFieldPatch }[] = []
  function diffWalk(n: MatrixNodeTreeApi) {
    if (n.node_type === 'ACTIVITY') {
      const b = baseMap.get(n.id)
      const dr = n.default_responsible_id
      const cur: ActivityFieldPatch = {
        planned_minutes: n.planned_minutes ?? null,
        default_responsible_id:
          dr == null || dr.trim() === '' ? null : dr.trim(),
      }
      if (
        b &&
        (b.planned_minutes !== cur.planned_minutes ||
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

/** Há pelo menos uma Atividade sem tempo previsto útil ou sem responsável padrão (avisos informativos). */
export function matrixPreviewModelHasInformativeActivityGaps(
  model: OperationMatrixMacroPreviewModel,
): boolean {
  for (const t of model.tasks) {
    for (const s of t.sectors) {
      for (const a of s.activities) {
        const f = matrixPreviewActivityInfoFlags(
          a.plannedMinutes,
          a.defaultResponsibleId,
        )
        if (f.missingEffectiveTime || f.missingResponsible) return true
      }
    }
  }
  return false
}
