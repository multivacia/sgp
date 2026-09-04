import { createHash } from 'node:crypto'
import type { PostConveyorOptionBody } from './conveyors.schemas.js'

/** Motivo curto na coluna `reason` do evento (VARCHAR 120). */
export const LATE_STRUCTURE_APPEND_REASON_CODE = 'LATE_STRUCTURE_APPEND'

export type StructureAppendFingerprintInput = {
  conveyorId: string
  /** Já normalizado (trim). */
  reason: string
  originType: 'MANUAL' | 'BASE' | 'HYBRID'
  matrixRootItemId: string | null
  option: PostConveyorOptionBody
}

function sortObjectKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeysDeep)
  }
  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(obj).sort()) {
      out[key] = sortObjectKeysDeep(obj[key])
    }
    return out
  }
  return value
}

function canonicalizeAssignees(
  assignees: PostConveyorOptionBody['areas'][number]['steps'][number]['assignees'],
): unknown[] {
  const list = [...(assignees ?? [])].map((a, i) => ({
    type: a.type ?? 'COLLABORATOR',
    collaboratorId: a.collaboratorId ?? null,
    teamId: a.teamId ?? null,
    isPrimary: a.isPrimary,
    assignmentOrigin: a.assignmentOrigin ?? null,
    orderIndex: a.orderIndex ?? i,
  }))
  list.sort((a, b) => a.orderIndex - b.orderIndex || String(a.collaboratorId).localeCompare(String(b.collaboratorId)) || String(a.teamId).localeCompare(String(b.teamId)))
  return list.map((a, i) => ({
    type: a.type,
    collaboratorId: a.collaboratorId,
    teamId: a.teamId,
    isPrimary: a.isPrimary,
    assignmentOrigin: a.assignmentOrigin,
    orderIndex: i + 1,
  }))
}

/**
 * Payload canônico para fingerprint (A8):
 * - chaves ordenadas
 * - arrays ordenados por orderIndex de negócio
 * - orderIndex relativos (1..n) após ordenação
 */
export function buildStructureAppendCanonicalPayload(
  input: StructureAppendFingerprintInput,
): unknown {
  const areasSorted = [...input.option.areas].sort((a, b) => a.orderIndex - b.orderIndex)
  const areas = areasSorted.map((ar, ai) => {
    const stepsSorted = [...ar.steps].sort((a, b) => a.orderIndex - b.orderIndex)
    return {
      titulo: ar.titulo.trim(),
      sourceOrigin: ar.sourceOrigin,
      orderIndex: ai + 1,
      steps: stepsSorted.map((st, si) => ({
        titulo: st.titulo.trim(),
        sourceOrigin: st.sourceOrigin,
        orderIndex: si + 1,
        plannedMinutes: st.plannedMinutes,
        plannedQuantity: st.plannedQuantity ?? 1,
        required: st.required ?? true,
        sourceKey: st.sourceKey?.trim() || null,
        assignees: canonicalizeAssignees(st.assignees),
      })),
    }
  })

  return {
    conveyorId: input.conveyorId,
    matrixRootItemId: input.matrixRootItemId,
    option: {
      areas,
      orderIndex: 1,
      sourceOrigin: input.option.sourceOrigin,
      titulo: input.option.titulo.trim(),
    },
    originType: input.originType,
    reason: input.reason,
  }
}

/** JSON canônico: sort keys em profundidade (arrays já ordenados no payload). */
export function toCanonicalJson(value: unknown): string {
  return JSON.stringify(sortObjectKeysDeep(value))
}

export function computeStructureAppendFingerprint(
  input: StructureAppendFingerprintInput,
): string {
  const canonical = toCanonicalJson(buildStructureAppendCanonicalPayload(input))
  return createHash('sha256').update(canonical, 'utf8').digest('hex')
}
