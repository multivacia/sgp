import type { ArgosDocumentIngestResult } from '../../../domain/argos/ingest-response.types'
import type {
  ArgosMatchingPlanItemV11,
  ArgosMatrixSubtreeV11,
  ConveyorDraft,
} from '../../../domain/argos/draft-v1.types'
import type {
  CreateConveyorDados,
  CreateConveyorInput,
  CreateConveyorStepAssigneeInput,
  DocumentReviewAuditPayload,
} from '../../../domain/conveyors/conveyor.types'
import {
  containsForbiddenOperationalContent,
  conveyorDraftContainsForbiddenContent,
  stripForbiddenOperationalSubstrings,
} from '../../../domain/argos/operationalContentGuard'
import { buildReviewItemKey } from './documentDraftReview'
import {
  detectSyntheticSubtreeRollupInCreatePayload,
  stripOfficialSyntheticRollupFromCreateInputOptions,
  type SyntheticSubtreeRollupOfficialFinding,
} from './documentImportCreatePayloadDiagnostics'
import {
  getPayloadApplyDecision,
  type ReviewAcceptanceState,
  type ReviewItemAcceptance,
} from './documentReviewAcceptance'

type SuggestedPassthrough = ConveyorDraft['suggestedDados'] & {
  osNumber?: string
  [key: string]: unknown
}

/** TD10.5: import OS Bravo — nome/placa são só referência na UI do draft. */
export type DraftToCreateConveyorOptions = {
  bravoOsDocumentImport?: boolean
  matrixRootItemId?: string | null
  documentReviewAudit?: DocumentReviewAuditPayload
}

function pickString(v: unknown): string | undefined {
  if (typeof v === 'string' && v.trim()) return v.trim()
  return undefined
}

function optionalUuid(v: string | undefined): string | null {
  if (!v?.trim()) return null
  const s = v.trim()
  if (
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      s,
    )
  ) {
    return s
  }
  return null
}

export type MatrixReviewTeamAssignmentInput = {
  teamId?: string | null
  teamName?: string | null
}

type ReviewStepMeta = {
  __reviewSourceOrigin?: 'manual' | 'reaproveitada'
  __reviewPlanIndex?: number
  __reviewMatchedMatrixNodeId?: string
  __reviewSelectedAlternativeMatrixNodeId?: string
  __reviewFinalAction?:
    | 'ACCEPT_SUGGESTED'
    | 'SELECT_ALTERNATIVE'
    | 'CONFIRM_CREATE_NEW'
    | 'IGNORE_ITEM'
  __reviewPrimaryCollaboratorId?: string | null
  __reviewPrimaryTeamId?: string | null
  /** S9.4 — lista da subárvore (vários times por atividade). */
  __reviewTeamAssignments?: ReadonlyArray<MatrixReviewTeamAssignmentInput>
}

/**
 * S9.4 — Colaborador (se houver) + N times da Matriz; times com `isPrimary: false` (regra do POST).
 * Sem `null` em ids; sem objeto vazio.
 */
export function buildValidStepAssigneesFromMatrixActivity(input: {
  teamId?: string | null
  collaboratorId?: string | null
  teamAssignments?: ReadonlyArray<MatrixReviewTeamAssignmentInput> | null
  assignmentOrigin?: CreateConveyorStepAssigneeInput['assignmentOrigin']
}): CreateConveyorStepAssigneeInput[] {
  const ao = input.assignmentOrigin
  const origin = ao ? { assignmentOrigin: ao } : {}
  const out: CreateConveyorStepAssigneeInput[] = []
  const cid = optionalUuid(pickString(input.collaboratorId) ?? undefined)
  if (cid) {
    out.push({
      type: 'COLLABORATOR',
      collaboratorId: cid,
      isPrimary: true,
      ...origin,
    })
  }
  const seen = new Set<string>()
  if (input.teamAssignments?.length) {
    for (const t of input.teamAssignments) {
      const tid = optionalUuid(pickString(t.teamId) ?? undefined)
      if (tid && !seen.has(tid)) {
        seen.add(tid)
        out.push({
          type: 'TEAM',
          teamId: tid,
          isPrimary: false,
          ...origin,
        })
      }
    }
  }
  const legacyTid = optionalUuid(pickString(input.teamId) ?? undefined)
  if (legacyTid && !seen.has(legacyTid)) {
    out.push({
      type: 'TEAM',
      teamId: legacyTid,
      isPrimary: false,
      ...origin,
    })
  }
  return out
}

/** Alias de `buildValidStepAssigneesFromMatrixActivity` (retrocompat em testes). */
export function buildValidStepAssigneesFromMatrixRow(
  input: Parameters<typeof buildValidStepAssigneesFromMatrixActivity>[0],
): CreateConveyorStepAssigneeInput[] {
  return buildValidStepAssigneesFromMatrixActivity(input)
}

/** Remove assignees inválidos e chaves com `null` incompatíveis com o POST /conveyors. */
export function sanitizeCreateConveyorStepAssigneesList(
  raw: readonly (CreateConveyorStepAssigneeInput | Record<string, unknown>)[] | null | undefined,
): CreateConveyorStepAssigneeInput[] {
  if (!raw?.length) return []
  const out: CreateConveyorStepAssigneeInput[] = []
  for (const a of raw) {
    const one = sanitizeOneConveyorStepAssignee(a)
    if (one) out.push(one)
  }
  const collabs = out.filter((x) => (x.type ?? 'COLLABORATOR') === 'COLLABORATOR')
  if (collabs.length === 1 && collabs[0] && !collabs[0].isPrimary) {
    collabs[0].isPrimary = true
  }
  return out
}

function sanitizeOneConveyorStepAssignee(
  a: CreateConveyorStepAssigneeInput | Record<string, unknown>,
): CreateConveyorStepAssigneeInput | null {
  const typeRaw = (a as { type?: unknown }).type
  const type = typeRaw === 'TEAM' || typeRaw === 'COLLABORATOR' ? typeRaw : undefined
  const cid = optionalUuid(pickString((a as { collaboratorId?: unknown }).collaboratorId) ?? undefined)
  const tid = optionalUuid(pickString((a as { teamId?: unknown }).teamId) ?? undefined)
  const assignmentOrigin = (a as { assignmentOrigin?: unknown }).assignmentOrigin
  const ao =
    assignmentOrigin === 'manual' ||
    assignmentOrigin === 'base' ||
    assignmentOrigin === 'reaproveitada'
      ? assignmentOrigin
      : undefined
  const orderIndex =
    typeof (a as { orderIndex?: unknown }).orderIndex === 'number'
      ? Math.floor((a as { orderIndex: number }).orderIndex)
      : undefined

  if (type === 'TEAM') {
    if (!tid) return null
    const row: CreateConveyorStepAssigneeInput = {
      type: 'TEAM',
      teamId: tid,
      isPrimary: false,
    }
    if (ao) row.assignmentOrigin = ao
    if (orderIndex !== undefined) row.orderIndex = orderIndex
    return row
  }

  if (type === 'COLLABORATOR') {
    if (!cid) return null
    const row: CreateConveyorStepAssigneeInput = {
      type: 'COLLABORATOR',
      collaboratorId: cid,
      isPrimary: Boolean((a as { isPrimary?: boolean }).isPrimary),
    }
    if (ao) row.assignmentOrigin = ao
    if (orderIndex !== undefined) row.orderIndex = orderIndex
    return row
  }

  if (cid) {
    const row: CreateConveyorStepAssigneeInput = {
      type: 'COLLABORATOR',
      collaboratorId: cid,
      isPrimary: Boolean((a as { isPrimary?: boolean }).isPrimary),
    }
    if (ao) row.assignmentOrigin = ao
    if (orderIndex !== undefined) row.orderIndex = orderIndex
    return row
  }

  if (tid) {
    const row: CreateConveyorStepAssigneeInput = {
      type: 'TEAM',
      teamId: tid,
      isPrimary: false,
    }
    if (ao) row.assignmentOrigin = ao
    if (orderIndex !== undefined) row.orderIndex = orderIndex
    return row
  }

  return null
}

function withReviewStepMeta(
  step: ConveyorDraft['options'][number]['areas'][number]['steps'][number],
  meta: ReviewStepMeta,
): ConveyorDraft['options'][number]['areas'][number]['steps'][number] {
  return { ...step, ...(meta as Record<string, unknown>) }
}

function readReviewStepMeta(
  step: ConveyorDraft['options'][number]['areas'][number]['steps'][number],
): ReviewStepMeta {
  const raw = step as unknown as Record<string, unknown>
  return {
    __reviewSourceOrigin:
      raw.__reviewSourceOrigin === 'reaproveitada' ? 'reaproveitada' : 'manual',
    __reviewMatchedMatrixNodeId:
      typeof raw.__reviewMatchedMatrixNodeId === 'string'
        ? raw.__reviewMatchedMatrixNodeId
        : undefined,
    __reviewSelectedAlternativeMatrixNodeId:
      typeof raw.__reviewSelectedAlternativeMatrixNodeId === 'string'
        ? raw.__reviewSelectedAlternativeMatrixNodeId
        : undefined,
    __reviewPlanIndex:
      typeof raw.__reviewPlanIndex === 'number' ? raw.__reviewPlanIndex : undefined,
    __reviewFinalAction:
      raw.__reviewFinalAction === 'ACCEPT_SUGGESTED' ||
      raw.__reviewFinalAction === 'SELECT_ALTERNATIVE' ||
      raw.__reviewFinalAction === 'CONFIRM_CREATE_NEW' ||
      raw.__reviewFinalAction === 'IGNORE_ITEM'
        ? raw.__reviewFinalAction
        : undefined,
    __reviewPrimaryCollaboratorId:
      typeof raw.__reviewPrimaryCollaboratorId === 'string'
        ? raw.__reviewPrimaryCollaboratorId
        : null,
    __reviewPrimaryTeamId:
      typeof raw.__reviewPrimaryTeamId === 'string' ? raw.__reviewPrimaryTeamId : null,
    __reviewTeamAssignments: Array.isArray(raw.__reviewTeamAssignments)
      ? (raw.__reviewTeamAssignments as MatrixReviewTeamAssignmentInput[])
      : undefined,
  }
}

function buildAssigneesFromStepMeta(meta: ReviewStepMeta): CreateConveyorStepAssigneeInput[] {
  return buildValidStepAssigneesFromMatrixActivity({
    collaboratorId: meta.__reviewPrimaryCollaboratorId,
    teamId: meta.__reviewPrimaryTeamId,
    teamAssignments: meta.__reviewTeamAssignments,
    assignmentOrigin: 'reaproveitada',
  })
}

function resolveSubtreeForReviewDecision(
  item: ArgosMatchingPlanItemV11,
  dec: ReturnType<typeof getPayloadApplyDecision>,
  accEntry: ReviewItemAcceptance | undefined,
): ArgosMatrixSubtreeV11 | undefined {
  if (dec !== 'ACCEPT_SUGGESTED' && dec !== 'SELECT_ALTERNATIVE') return undefined
  if (dec === 'SELECT_ALTERNATIVE') {
    const altId = accEntry?.selectedAlternativeMatrixNodeId
    const alt = item.alternativeCandidates?.find((c) => c.matrixNodeId === altId)
    return alt?.matrixSubtree
  }
  return item.matrixSubtree
}

function collectStepsByPlanIndex(
  draft: ConveyorDraft,
): Map<number, ConveyorDraft['options'][number]['areas'][number]['steps'][number]> {
  const map = new Map<number, ConveyorDraft['options'][number]['areas'][number]['steps'][number]>()
  for (const opt of draft.options ?? []) {
    for (const area of opt.areas ?? []) {
      for (const st of area.steps ?? []) {
        const meta = readReviewStepMeta(st)
        if (typeof meta.__reviewPlanIndex === 'number' && !map.has(meta.__reviewPlanIndex)) {
          map.set(meta.__reviewPlanIndex, st)
        }
      }
    }
  }
  return map
}

function resolveSubtreeForAudit(
  item: ArgosMatchingPlanItemV11,
  finalDecision:
    | 'ACCEPT_SUGGESTED'
    | 'SELECT_ALTERNATIVE'
    | 'CONFIRM_CREATE_NEW'
    | 'IGNORE_ITEM',
  accEntry: ReviewItemAcceptance | undefined,
): ArgosMatrixSubtreeV11 | undefined {
  if (finalDecision !== 'ACCEPT_SUGGESTED' && finalDecision !== 'SELECT_ALTERNATIVE')
    return undefined
  if (finalDecision === 'SELECT_ALTERNATIVE') {
    const altId = accEntry?.selectedAlternativeMatrixNodeId
    return item.alternativeCandidates?.find((c) => c.matrixNodeId === altId)?.matrixSubtree
  }
  return item.matrixSubtree
}

function inferMatrixRootItemIdFromDraft(draft: ConveyorDraft): string | null {
  for (const opt of draft.options ?? []) {
    for (const area of opt.areas ?? []) {
      for (const s of area.steps ?? []) {
        const m = readReviewStepMeta(s)
        const picked = m.__reviewSelectedAlternativeMatrixNodeId ?? m.__reviewMatchedMatrixNodeId
        const asUuid = optionalUuid(picked)
        if (asUuid) return asUuid
      }
    }
  }
  return null
}

function sanitizeAuditServiceDescription(text: string): string {
  return stripForbiddenOperationalSubstrings(text).slice(0, 500).trim()
}

export function validateDocumentReviewAuditIsSafe(
  audit: DocumentReviewAuditPayload,
): string | null {
  const dump = JSON.stringify(audit).toLowerCase()
  if (
    dump.includes('clientname') ||
    dump.includes('licenseplate') ||
    dump.includes('partitems') ||
    dump.includes('candidatelines') ||
    dump.includes('debug') ||
    dump.includes('rawtext')
  ) {
    return 'A auditoria contém campos proibidos (LGPD/financeiro/debug).'
  }
  for (const d of audit.decisions) {
    if (containsForbiddenOperationalContent(d.extractedServiceDescription)) {
      return 'A auditoria contém descrição operacional não permitida.'
    }
  }
  return null
}

export function buildDocumentReviewAuditPayload(params: {
  ingest: ArgosDocumentIngestResult
  acceptance: ReviewAcceptanceState
  finalDraft: ConveyorDraft
}): DocumentReviewAuditPayload | null {
  const { ingest, acceptance, finalDraft } = params
  if (ingest.draft?.schemaVersion !== '1.1.0') return null
  const provider = ingest.sourceDocument?.provider
  const documentType = ingest.sourceDocument?.documentType
  if (!provider || !documentType) return null
  const plan = ingest.matchingPlan ?? []
  const stepByPlanIndex = collectStepsByPlanIndex(finalDraft)
  const decisions: DocumentReviewAuditPayload['decisions'] = []
  let reusedCount = 0
  let acceptedSimilarCount = 0
  let selectedAlternativeCount = 0
  let createNewConfirmedCount = 0
  let ignoredCount = 0
  let expandedSubtreeDecisionsCount = 0
  const subtreeRootsSeen = new Set<string>()

  for (let index = 0; index < plan.length; index++) {
    const item = plan[index]!
    const itemKey = buildReviewItemKey(item, index)
    const payloadDecision = getPayloadApplyDecision(item, acceptance[itemKey])
    const finalDecision =
      item.suggestedAction === 'IGNORE'
        ? ('IGNORE_ITEM' as const)
        : payloadDecision === 'PENDING'
          ? ('IGNORE_ITEM' as const)
          : payloadDecision
    const finalSourceOrigin =
      finalDecision === 'ACCEPT_SUGGESTED' || finalDecision === 'SELECT_ALTERNATIVE'
        ? ('reaproveitada' as const)
        : ('manual' as const)
    const step = stepByPlanIndex.get(index)
    const matchedMatrixNodeId = item.matchedMatrixNodeId ?? null
    const selectedAlternativeMatrixNodeId =
      finalDecision === 'SELECT_ALTERNATIVE'
        ? acceptance[itemKey]?.selectedAlternativeMatrixNodeId ?? null
        : null

    let auditMatchedType: ArgosMatchingPlanItemV11['matchedMatrixNodeType'] | null =
      item.matchedMatrixNodeType ?? null
    if (finalDecision === 'SELECT_ALTERNATIVE' && selectedAlternativeMatrixNodeId) {
      const altMeta = item.alternativeCandidates?.find(
        (c) => c.matrixNodeId === selectedAlternativeMatrixNodeId,
      )
      if (altMeta?.nodeType) auditMatchedType = altMeta.nodeType
    }

    const auditSubtree = resolveSubtreeForAudit(item, finalDecision, acceptance[itemKey])
    let subtreeMaterializationSkippedDuplicate = false
    let expandedSubtree = false
    let expandedAreasCount: number | null = null
    let expandedActivitiesCount: number | null = null
    let expandedPlannedMinutesTotal: number | null = null

    if (
      auditSubtree &&
      (finalDecision === 'ACCEPT_SUGGESTED' || finalDecision === 'SELECT_ALTERNATIVE')
    ) {
      const rk = `${auditSubtree.rootNodeType}:${auditSubtree.rootNodeId}`
      if (subtreeRootsSeen.has(rk)) {
        subtreeMaterializationSkippedDuplicate = true
      } else {
        subtreeRootsSeen.add(rk)
        expandedSubtree = true
        expandedSubtreeDecisionsCount += 1
        expandedAreasCount = auditSubtree.totalAreas
        expandedActivitiesCount = auditSubtree.totalActivities
        expandedPlannedMinutesTotal = auditSubtree.totalPlannedMinutes
      }
    }

    let plannedMinutesAudit: number | null =
      typeof step?.plannedMinutes === 'number' ? step.plannedMinutes : null
    if (
      expandedSubtree &&
      auditSubtree &&
      !subtreeMaterializationSkippedDuplicate &&
      typeof auditSubtree.totalPlannedMinutes === 'number'
    ) {
      plannedMinutesAudit = auditSubtree.totalPlannedMinutes
    }

    if (finalDecision === 'ACCEPT_SUGGESTED') {
      reusedCount += 1
      if (item.suggestedAction === 'REVIEW_SIMILAR') acceptedSimilarCount += 1
    } else if (finalDecision === 'SELECT_ALTERNATIVE') {
      reusedCount += 1
      selectedAlternativeCount += 1
    } else if (finalDecision === 'CONFIRM_CREATE_NEW') {
      createNewConfirmedCount += 1
    } else {
      ignoredCount += 1
    }
    const safeDescription = sanitizeAuditServiceDescription(item.extractedServiceDescription)
    if (!safeDescription) continue
    decisions.push({
      index,
      extractedServiceDescription: safeDescription,
      finalDecision,
      finalSourceOrigin,
      matchedMatrixNodeId,
      selectedAlternativeMatrixNodeId,
      plannedMinutes: plannedMinutesAudit,
      confidence: typeof item.confidence === 'number' ? item.confidence : null,
      matchedMatrixNodeType: auditMatchedType,
      reusedStructureKind: item.reusedStructure?.kind ?? null,
      expandedSubtree,
      expandedAreasCount,
      expandedActivitiesCount,
      expandedPlannedMinutesTotal,
      subtreeMaterializationSkippedDuplicate: subtreeMaterializationSkippedDuplicate || undefined,
    })
  }
  const payload: DocumentReviewAuditPayload = {
    schemaVersion: 'r6_document_review_audit_v1',
    source: {
      provider,
      documentType,
      documentNumber: ingest.sourceDocument?.documentNumber,
      requestId: ingest.requestId,
      correlationId: ingest.correlationId,
    },
    summary: {
      totalServiceItems: decisions.length,
      reusedCount,
      acceptedSimilarCount,
      selectedAlternativeCount,
      createNewConfirmedCount,
      ignoredCount,
      expandedSubtreeDecisionsCount,
      uniqueSubtreeRootsMaterialized: subtreeRootsSeen.size,
    },
    decisions,
  }
  if (validateDocumentReviewAuditIsSafe(payload)) return null
  return payload
}

/**
 * Converte o draft v1 (após revisão no ecrã) no corpo oficial `POST /api/v1/conveyors`.
 * Origem sempre tratada como composição manual revista por humano.
 */
function cloneConveyorDraft(d: ConveyorDraft): ConveyorDraft {
  return JSON.parse(JSON.stringify(d)) as ConveyorDraft
}

/**
 * Ajusta a árvore editável (1.1.0) com as decisões de matching antes do POST.
 * - `IGNORE` do plano: etapa não entra na criação.
 * - `IGNORE_ITEM` (revisor): etapa removida.
 * - `MATRIX_SUBTREE`: expande áreas/etapas (TASK → nova opção; SECTOR → novas áreas na opção base).
 * - S9.4.1: se TASK subárvore substitui todos os itens do Serviço, remove a opção placeholder;
 *   se SECTOR subárvore e não restam linhas no Serviço, remove a área Serviço vazia.
 * - `SELECT_ALTERNATIVE` / `ACCEPT_SUGGESTED` sem subárvore: minutos e título da Matriz (S6).
 */
export function applyReviewDecisionsToDraftV11(
  draft: ConveyorDraft,
  matchingPlan: ArgosDocumentIngestResult['matchingPlan'],
  acceptance: ReviewAcceptanceState,
): ConveyorDraft {
  const next = cloneConveyorDraft(draft)
  const plan = matchingPlan ?? []
  const defaultOpt = next.options?.[0]
  const servicoArea = defaultOpt?.areas?.[0]
  if (!defaultOpt || !servicoArea?.steps?.length) return next

  const originalSteps = servicoArea.steps
  const materializedRoots = new Set<string>()
  const simpleSteps: typeof originalSteps = []
  const extraAreas: typeof defaultOpt.areas = []
  const appendedOptions: typeof next.options = []

  for (let i = 0; i < originalSteps.length; i++) {
    const st = originalSteps[i]!
    const m = plan[i]
    if (!m) {
      simpleSteps.push(withReviewStepMeta({ ...st }, { __reviewSourceOrigin: 'manual' }))
      continue
    }
    if (m.suggestedAction === 'IGNORE') {
      continue
    }
    const key = buildReviewItemKey(m, i)
    const dec = getPayloadApplyDecision(m, acceptance[key])
    if (dec === 'IGNORE_ITEM') {
      continue
    }

    const accEntry = acceptance[key]
    const subtree = resolveSubtreeForReviewDecision(m, dec, accEntry)
    const shouldExpandSubtree =
      Boolean(subtree?.areas?.length) &&
      (dec === 'ACCEPT_SUGGESTED' || dec === 'SELECT_ALTERNATIVE')

    if (shouldExpandSubtree && subtree) {
      const dedupeKey = `${subtree.rootNodeType}:${subtree.rootNodeId}`
      if (materializedRoots.has(dedupeKey)) {
        continue
      }
      materializedRoots.add(dedupeKey)

      const finalAction =
        dec === 'SELECT_ALTERNATIVE'
          ? ('SELECT_ALTERNATIVE' as const)
          : ('ACCEPT_SUGGESTED' as const)
      const altSel =
        dec === 'SELECT_ALTERNATIVE' ? accEntry?.selectedAlternativeMatrixNodeId : undefined

      if (subtree.rootNodeType === 'TASK') {
        const newAreas = subtree.areas.map((area, ai) => ({
          orderIndex: area.orderIndex ?? ai + 1,
          title: area.title.slice(0, 500),
          steps: area.activities.map((act, si) =>
            withReviewStepMeta(
              {
                orderIndex: si + 1,
                title: act.title.slice(0, 500),
                plannedMinutes: act.plannedMinutes,
              },
              {
                __reviewSourceOrigin: 'reaproveitada',
                __reviewPlanIndex: i,
                __reviewMatchedMatrixNodeId: act.matrixNodeId,
                __reviewFinalAction: finalAction,
                __reviewSelectedAlternativeMatrixNodeId: altSel,
                __reviewPrimaryCollaboratorId: act.defaultResponsibleId ?? null,
                __reviewPrimaryTeamId: act.teamId ?? null,
                __reviewTeamAssignments: act.teamAssignments,
              },
            ),
          ),
        }))
        appendedOptions.push({
          orderIndex: 1,
          title: subtree.rootTitle.slice(0, 500),
          areas: newAreas,
        })
      } else {
        for (const [ai, area] of subtree.areas.entries()) {
          extraAreas.push({
            orderIndex: area.orderIndex ?? ai + 1,
            title: area.title.slice(0, 500),
            steps: area.activities.map((act, si) =>
              withReviewStepMeta(
                {
                  orderIndex: si + 1,
                  title: act.title.slice(0, 500),
                  plannedMinutes: act.plannedMinutes,
                },
                {
                  __reviewSourceOrigin: 'reaproveitada',
                  __reviewPlanIndex: i,
                  __reviewMatchedMatrixNodeId: act.matrixNodeId,
                  __reviewFinalAction: finalAction,
                  __reviewSelectedAlternativeMatrixNodeId: altSel,
                  __reviewPrimaryCollaboratorId: act.defaultResponsibleId ?? null,
                  __reviewPrimaryTeamId: act.teamId ?? null,
                  __reviewTeamAssignments: act.teamAssignments,
                },
              ),
            ),
          })
        }
      }
      continue
    }

    const nextStep = { ...st }
    if (dec === 'SELECT_ALTERNATIVE') {
      const altId = accEntry?.selectedAlternativeMatrixNodeId
      const alt = m.alternativeCandidates?.find((c) => c.matrixNodeId === altId)
      if (alt) {
        if (alt.kind !== 'MATRIX_SUBTREE') {
          if (typeof alt.plannedMinutes === 'number') {
            nextStep.plannedMinutes = alt.plannedMinutes
          }
          if (alt.activity?.trim()) {
            nextStep.title = alt.activity.trim().slice(0, 500)
          }
        }
        simpleSteps.push(
          withReviewStepMeta(nextStep, {
            __reviewSourceOrigin: 'reaproveitada',
            __reviewPlanIndex: i,
            __reviewMatchedMatrixNodeId: m.matchedMatrixNodeId,
            __reviewSelectedAlternativeMatrixNodeId: alt.matrixNodeId,
            __reviewFinalAction: 'SELECT_ALTERNATIVE',
          }),
        )
        continue
      }
    } else if (dec === 'ACCEPT_SUGGESTED') {
      if (m.reusedStructure?.kind !== 'MATRIX_SUBTREE') {
        if (m.reusedStructure?.plannedMinutes != null) {
          nextStep.plannedMinutes = m.reusedStructure.plannedMinutes
        }
        if (m.reusedStructure?.activity?.trim()) {
          nextStep.title = m.reusedStructure.activity.trim().slice(0, 500)
        }
      }
      simpleSteps.push(
        withReviewStepMeta(nextStep, {
          __reviewSourceOrigin: 'reaproveitada',
          __reviewPlanIndex: i,
          __reviewMatchedMatrixNodeId: m.matchedMatrixNodeId,
          __reviewFinalAction: 'ACCEPT_SUGGESTED',
        }),
      )
      continue
    }
    simpleSteps.push(
      withReviewStepMeta(nextStep, {
        __reviewSourceOrigin: 'manual',
        __reviewPlanIndex: i,
        __reviewFinalAction:
          dec === 'CONFIRM_CREATE_NEW' ? 'CONFIRM_CREATE_NEW' : undefined,
      }),
    )
  }

  servicoArea.steps = simpleSteps

  const noRemainingServiceSteps = simpleSteps.length === 0
  const hasSectorExtras = extraAreas.length > 0
  const hasAppendedTaskSubtreeOptions = appendedOptions.length > 0

  if (noRemainingServiceSteps && !hasSectorExtras && hasAppendedTaskSubtreeOptions) {
    next.options = [...appendedOptions]
  } else if (noRemainingServiceSteps && hasSectorExtras) {
    defaultOpt.areas = [...extraAreas]
    next.options = [defaultOpt, ...appendedOptions]
  } else {
    defaultOpt.areas = [servicoArea, ...extraAreas]
    next.options = [defaultOpt, ...appendedOptions]
  }

  next.options.forEach((opt, oi) => {
    opt.orderIndex = oi + 1
    opt.areas.forEach((ar, ai) => {
      ar.orderIndex = ai + 1
      ar.steps.forEach((s, si) => {
        s.orderIndex = si + 1
      })
    })
  })

  return next
}

function assembleCreateConveyorInputFromMappedOptions(
  draft: ConveyorDraft,
  mappedOptions: CreateConveyorInput['options'],
  createOptions?: DraftToCreateConveyorOptions,
): CreateConveyorInput {
  const s = draft.suggestedDados as SuggestedPassthrough
  const bravoUiOnly = Boolean(createOptions?.bravoOsDocumentImport)
  const nomeSan = stripForbiddenOperationalSubstrings(
    pickString(s.title) ?? 'Esteira a partir de documento',
  )
  const nome = (nomeSan || 'Esteira a partir de documento').slice(0, 500)

  let observacoes = stripForbiddenOperationalSubstrings(pickString(s.notes) ?? '')
  const osNum = pickString(s.osNumber)
  if (osNum && !observacoes.includes(osNum)) {
    observacoes = observacoes
      ? `${observacoes}\nReferência OS: ${osNum}`
      : `Referência OS: ${osNum}`
  }
  observacoes = stripForbiddenOperationalSubstrings(observacoes)

  const dados: CreateConveyorDados = {
    nome,
    cliente: bravoUiOnly
      ? ''
      : stripForbiddenOperationalSubstrings(pickString(s.clientName) ?? ''),
    veiculo: stripForbiddenOperationalSubstrings(pickString(s.vehicleDescription) ?? ''),
    modeloVersao: stripForbiddenOperationalSubstrings(pickString(s.modelVersion) ?? ''),
    placa: bravoUiOnly
      ? ''
      : stripForbiddenOperationalSubstrings(pickString(s.licensePlate) ?? ''),
    observacoes,
    responsavel: '',
    prazoEstimado: bravoUiOnly
      ? ''
      : stripForbiddenOperationalSubstrings(pickString(s.estimatedDeadline) ?? ''),
    prioridade: s.priorityHint ?? 'media',
    colaboradorId: optionalUuid(pickString(s.suggestedResponsibleCollaboratorId)),
  }

  return {
    dados,
    originType: 'MANUAL',
    baseId: null,
    baseCode: null,
    baseName: null,
    baseVersion: null,
    matrixRootItemId:
      createOptions?.matrixRootItemId ?? inferMatrixRootItemIdFromDraft(draft) ?? null,
    metadata: createOptions?.documentReviewAudit
      ? { documentReviewAudit: createOptions.documentReviewAudit }
      : undefined,
    options: mappedOptions,
  }
}

/**
 * S9.4.6 — Pipeline explícito para import por documento: mapear draft → strip rollup → payload final.
 * O detector oficial na saída só deve ver o input já limpo (`inputAfterStrip`).
 */
export function buildCreateConveyorInputForDocumentImport(
  reviewedDraft: ConveyorDraft,
  createOptions?: DraftToCreateConveyorOptions,
): {
  inputBeforeStrip: CreateConveyorInput
  inputAfterStrip: CreateConveyorInput
  officialFindingsBeforeStrip: SyntheticSubtreeRollupOfficialFinding[]
  officialFindingsAfterStrip: SyntheticSubtreeRollupOfficialFinding[]
} {
  const mapped = mapOptionsOrPlaceholder(reviewedDraft.options)
  const inputBeforeStrip = assembleCreateConveyorInputFromMappedOptions(
    reviewedDraft,
    mapped,
    createOptions,
  )
  const stripped = stripOfficialSyntheticRollupFromCreateInputOptions(mapped)
  const inputAfterStrip = assembleCreateConveyorInputFromMappedOptions(
    reviewedDraft,
    stripped,
    createOptions,
  )
  return {
    inputBeforeStrip,
    inputAfterStrip,
    officialFindingsBeforeStrip: detectSyntheticSubtreeRollupInCreatePayload(inputBeforeStrip),
    officialFindingsAfterStrip: detectSyntheticSubtreeRollupInCreatePayload(inputAfterStrip),
  }
}

export function draftV1ToCreateConveyorInput(
  draft: ConveyorDraft,
  createOptions?: DraftToCreateConveyorOptions,
): CreateConveyorInput {
  const mappedOptions = stripOfficialSyntheticRollupFromCreateInputOptions(
    mapOptionsOrPlaceholder(draft.options),
  )
  return assembleCreateConveyorInputFromMappedOptions(draft, mappedOptions, createOptions)
}

function mapOptionsOrPlaceholder(
  options: ConveyorDraft['options'],
): CreateConveyorInput['options'] {
  const src = options ?? []
  if (src.length === 0) {
    return [
      {
        titulo: 'Opção 1',
        orderIndex: 1,
        sourceOrigin: 'manual',
        areas: [
          {
            titulo: 'Serviço',
            orderIndex: 1,
            sourceOrigin: 'manual',
            steps: [
              {
                titulo: 'Defina as etapas do serviço',
                orderIndex: 1,
                plannedMinutes: 0,
                sourceOrigin: 'manual',
                required: true,
                assignees: [],
              },
            ],
          },
        ],
      },
    ]
  }

  return src.map((o) => ({
    titulo: stripForbiddenOperationalSubstrings(o.title.trim()).slice(0, 500),
    orderIndex: o.orderIndex,
    sourceOrigin: 'manual' as const,
    areas: o.areas.map((a) => {
      const stepsClean = a.steps
        .map((st) => {
          const titulo = stripForbiddenOperationalSubstrings(st.title.trim()).slice(0, 500)
          return { st, titulo }
        })
        .filter(
          ({ titulo }) =>
            titulo.length > 0 && !containsForbiddenOperationalContent(titulo),
        )
        .map(({ st, titulo }, idx) => {
          const meta = readReviewStepMeta(st)
          const fromMeta = buildAssigneesFromStepMeta(meta)
          const rawDraftAssignees = (st as { assignees?: unknown }).assignees
          const fromDraft = Array.isArray(rawDraftAssignees)
            ? sanitizeCreateConveyorStepAssigneesList(
                rawDraftAssignees as CreateConveyorStepAssigneeInput[],
              )
            : []
          const assignees = sanitizeCreateConveyorStepAssigneesList(
            fromMeta.length > 0 ? fromMeta : fromDraft,
          )
          return {
            titulo,
            orderIndex: idx + 1,
            plannedMinutes: Math.max(0, Math.floor(st.plannedMinutes ?? 0)),
            sourceOrigin:
              meta.__reviewSourceOrigin === 'reaproveitada'
                ? ('reaproveitada' as const)
                : ('manual' as const),
            required: true,
            assignees: assignees.length > 0 ? assignees : [],
          }
        })
      const stepsFinal =
        stepsClean.length > 0
          ? stepsClean
          : [
              {
                titulo: 'Defina as etapas do serviço',
                orderIndex: 1,
                plannedMinutes: 0,
                sourceOrigin: 'manual' as const,
                required: true,
                assignees: [],
              },
            ]
      return {
        titulo: stripForbiddenOperationalSubstrings(a.title.trim()).slice(0, 500),
        orderIndex: a.orderIndex,
        sourceOrigin: 'manual' as const,
        steps: stepsFinal,
      }
    }),
  }))
}

/** Validação leve antes do POST — mensagens para o utilizador. */
export function validateDraftForCreate(
  draft: ConveyorDraft,
  operationalNotesFromIngest?: string[],
  options?: {
    hasPendingRequiredReviewDecisions?: boolean
    documentReviewAudit?: DocumentReviewAuditPayload | null
  },
): string | null {
  const s = draft.suggestedDados as SuggestedPassthrough
  if (!pickString(s.title)) {
    return 'Indique o nome da esteira antes de criar.'
  }
  if (conveyorDraftContainsForbiddenContent(draft)) {
    return 'O draft contém conteúdo financeiro ou sensível removido por segurança. Reimporte ou revise o documento antes de criar a esteira.'
  }
  if (
    operationalNotesFromIngest?.some(
      (n) => typeof n === 'string' && n.trim() && containsForbiddenOperationalContent(n.trim()),
    )
  ) {
    return 'O draft contém conteúdo financeiro ou sensível removido por segurança. Reimporte ou revise o documento antes de criar a esteira.'
  }
  if (options?.documentReviewAudit) {
    const auditError = validateDocumentReviewAuditIsSafe(options.documentReviewAudit)
    if (auditError) return auditError
  }
  const dump = JSON.stringify(draft).toLowerCase()
  if (dump.includes('partitems')) {
    return 'O draft contém conteúdo não operacional (partItems). Revise antes de criar.'
  }
  if (
    dump.includes('candidatelines') ||
    dump.includes('debuglines') ||
    dump.includes('debug')
  ) {
    return 'O draft contém campos de debug internos e não pode ser enviado para criação.'
  }
  if (options?.hasPendingRequiredReviewDecisions) {
    return 'Revise e confirme os itens similares/novos antes de criar a esteira oficial.'
  }
  const opts = draft.options ?? []
  if (opts.length === 0) return null
  for (const o of opts) {
    if (!o.title?.trim()) return 'Cada opção precisa de um título.'
    for (const a of o.areas ?? []) {
      if (!a.title?.trim()) return 'Cada área precisa de um título.'
      for (const st of a.steps ?? []) {
        if (!st.title?.trim()) return 'Cada etapa precisa de um título.'
      }
    }
  }
  return null
}
