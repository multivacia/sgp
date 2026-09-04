import { createHash } from 'node:crypto'
import type {
  PostConveyorAreaBody,
  PostConveyorOptionBody,
  PostConveyorStepBody,
  PostConveyorStructureItemBody,
} from './conveyors.schemas.js'

/** Motivo curto na coluna `reason` do evento (VARCHAR 120). */
export const LATE_STRUCTURE_APPEND_REASON_CODE = 'LATE_STRUCTURE_APPEND'

export type StructureAppendFingerprintKind = 'OPTION' | 'AREA' | 'STEP'

export type StructureAppendFingerprintInput = {
  conveyorId: string
  /** Já normalizado (trim). */
  reason: string
  originType: 'MANUAL' | 'BASE' | 'HYBRID'
  matrixRootItemId: string | null
  appendKind: StructureAppendFingerprintKind
  /** null para OPTION (raiz). */
  targetParentNodeId: string | null
  option?: PostConveyorOptionBody
  area?: PostConveyorAreaBody
  step?: PostConveyorStepBody
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
  assignees: PostConveyorStepBody['assignees'],
): unknown[] {
  const list = [...(assignees ?? [])].map((a, i) => ({
    type: a.type ?? 'COLLABORATOR',
    collaboratorId: a.collaboratorId ?? null,
    teamId: a.teamId ?? null,
    isPrimary: a.isPrimary,
    assignmentOrigin: a.assignmentOrigin ?? null,
    orderIndex: a.orderIndex ?? i,
  }))
  list.sort(
    (a, b) =>
      a.orderIndex - b.orderIndex ||
      String(a.collaboratorId).localeCompare(String(b.collaboratorId)) ||
      String(a.teamId).localeCompare(String(b.teamId)),
  )
  return list.map((a, i) => ({
    type: a.type,
    collaboratorId: a.collaboratorId,
    teamId: a.teamId,
    isPrimary: a.isPrimary,
    assignmentOrigin: a.assignmentOrigin,
    orderIndex: i + 1,
  }))
}

function canonicalizeStep(st: PostConveyorStepBody, orderIndex: number): unknown {
  return {
    titulo: st.titulo.trim(),
    sourceOrigin: st.sourceOrigin,
    orderIndex,
    plannedMinutes: st.plannedMinutes,
    plannedQuantity: st.plannedQuantity ?? 1,
    required: st.required ?? true,
    sourceKey: st.sourceKey?.trim() || null,
    assignees: canonicalizeAssignees(st.assignees),
  }
}

function canonicalizeArea(ar: PostConveyorAreaBody, orderIndex: number): unknown {
  const stepsSorted = [...ar.steps].sort((a, b) => a.orderIndex - b.orderIndex)
  return {
    titulo: ar.titulo.trim(),
    sourceOrigin: ar.sourceOrigin,
    orderIndex,
    steps: stepsSorted.map((st, si) => canonicalizeStep(st, si + 1)),
  }
}

function canonicalizeOption(option: PostConveyorOptionBody): unknown {
  const areasSorted = [...option.areas].sort((a, b) => a.orderIndex - b.orderIndex)
  return {
    areas: areasSorted.map((ar, ai) => canonicalizeArea(ar, ai + 1)),
    orderIndex: 1,
    sourceOrigin: option.sourceOrigin,
    titulo: option.titulo.trim(),
  }
}

/**
 * Payload canônico para fingerprint (A8 + multinível):
 * - appendKind + targetParentNodeId
 * - chaves ordenadas
 * - arrays ordenados por orderIndex de negócio
 * - orderIndex relativos (1..n) após ordenação
 */
export function buildStructureAppendCanonicalPayload(
  input: StructureAppendFingerprintInput,
): unknown {
  const base = {
    appendKind: input.appendKind,
    conveyorId: input.conveyorId,
    matrixRootItemId: input.matrixRootItemId,
    originType: input.originType,
    reason: input.reason,
    targetParentNodeId: input.targetParentNodeId,
  }

  if (input.appendKind === 'OPTION') {
    if (!input.option) {
      throw new Error('Fingerprint OPTION exige option.')
    }
    return { ...base, option: canonicalizeOption(input.option) }
  }
  if (input.appendKind === 'AREA') {
    if (!input.area) {
      throw new Error('Fingerprint AREA exige area.')
    }
    return { ...base, area: canonicalizeArea(input.area, 1) }
  }
  if (!input.step) {
    throw new Error('Fingerprint STEP exige step.')
  }
  return { ...base, step: canonicalizeStep(input.step, 1) }
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

/** Extrai input de fingerprint a partir do body já validado pelo Zod. */
export function fingerprintInputFromAppendBody(
  conveyorId: string,
  body: PostConveyorStructureItemBody,
): StructureAppendFingerprintInput {
  const matrixRootItemId =
    body.matrixRootItemId === undefined ? null : body.matrixRootItemId
  if (body.appendKind === 'OPTION') {
    return {
      conveyorId,
      reason: body.reason,
      originType: body.originType,
      matrixRootItemId,
      appendKind: 'OPTION',
      targetParentNodeId: body.targetParentNodeId ?? null,
      option: body.option,
    }
  }
  if (body.appendKind === 'AREA') {
    return {
      conveyorId,
      reason: body.reason,
      originType: body.originType,
      matrixRootItemId,
      appendKind: 'AREA',
      targetParentNodeId: body.targetParentNodeId,
      area: body.area,
    }
  }
  return {
    conveyorId,
    reason: body.reason,
    originType: body.originType,
    matrixRootItemId,
    appendKind: 'STEP',
    targetParentNodeId: body.targetParentNodeId,
    step: body.step,
  }
}
