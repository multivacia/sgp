/**
 * R6 S9.4.3 — Diagnóstico seguro do POST /conveyors (sem LGPD/financeiro).
 * Comparar payload recebido vs nós persistidos vs estrutura do GET.
 */

import type { ConveyorStructureApi } from './conveyors.dto.js'
import type { ConveyorNodeFlatRow } from './conveyors.repository.js'
import type { PostConveyorBody } from './conveyors.schemas.js'

const PLACEHOLDER_AREA_NAMES = new Set(['Área', 'Serviço'])

/** Normalização para comparar título de opção vs etapa (PT, sem acentos). */
export function normalizeConveyorSynthTitle(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

/** Área genérica — mesmo critério que {@link PLACEHOLDER_AREA_NAMES}, por chave normalizada. */
const PLACEHOLDER_AREA_NORMALIZED = new Set(['area', 'servico'])

export function isPlaceholderAreaTitulo(titulo: string): boolean {
  return PLACEHOLDER_AREA_NORMALIZED.has(normalizeConveyorSynthTitle(titulo))
}

export type PostConveyorOptionLike = {
  titulo: string
  areas: ReadonlyArray<{
    titulo: string
    steps: ReadonlyArray<{ titulo: string; plannedMinutes: number }>
  }>
}

/** Verdadeiro se existir algum setor (área) não placeholder com pelo menos uma etapa. */
export function optionHasRealAreasBeyondPlaceholder(opt: PostConveyorOptionLike): boolean {
  for (const ar of opt.areas) {
    if (!isPlaceholderAreaTitulo(ar.titulo) && (ar.steps?.length ?? 0) > 0) return true
  }
  return false
}

/** R6 S9.4.5 — padrão oficial bloqueado na criação / substituição de estrutura. */
export type SyntheticSubtreeRollupOfficialFinding = {
  optionIndex: number
  optionName: string
  areaIndex: number
  areaName: string
  stepIndex: number
  stepName: string
  plannedMinutes: number
  reason: 'official_placeholder_task_rollstep_duplicate'
}

/**
 * Pseudo-etapa agregada: opção = TASK, área "Área"/"Serviço", step com mesmo nome da opção e minutos > 0,
 * enquanto já existem setores reais com etapas — duplica totais operacionais.
 */
export function detectSyntheticSubtreeRollupInCreatePayload(
  body: Pick<PostConveyorBody, 'options'>,
): SyntheticSubtreeRollupOfficialFinding[] {
  const out: SyntheticSubtreeRollupOfficialFinding[] = []
  const opts = body.options ?? []
  for (let oi = 0; oi < opts.length; oi++) {
    const opt = opts[oi]!
    if (!optionHasRealAreasBeyondPlaceholder(opt)) continue
    const no = normalizeConveyorSynthTitle(opt.titulo)
    if (!no) continue
    for (let ai = 0; ai < opt.areas.length; ai++) {
      const ar = opt.areas[ai]!
      if (!isPlaceholderAreaTitulo(ar.titulo)) continue
      for (let si = 0; si < ar.steps.length; si++) {
        const st = ar.steps[si]!
        const pm = Math.max(0, st.plannedMinutes ?? 0)
        if (pm <= 0) continue
        const ns = normalizeConveyorSynthTitle(st.titulo)
        if (ns === no) {
          out.push({
            optionIndex: oi,
            optionName: opt.titulo.trim(),
            areaIndex: ai,
            areaName: ar.titulo.trim(),
            stepIndex: si,
            stepName: st.titulo.trim(),
            plannedMinutes: pm,
            reason: 'official_placeholder_task_rollstep_duplicate',
          })
        }
      }
    }
  }
  return out
}

export type PostConveyorPayloadDiagnosticSummary = {
  matrixRootItemId: string | null
  options: Array<{
    titulo: string
    orderIndex: number
    sourceOrigin: string
    areas: Array<{
      titulo: string
      orderIndex: number
      sourceOrigin: string
      steps: Array<{
        titulo: string
        orderIndex: number
        plannedMinutes: number
        sourceOrigin: string
        assigneesCount: number
        /** POST atual não inclui matrixNodeId por schema Zod. */
        matrixNodeId?: undefined
      }>
    }>
  }>
}

export type PersistedNodesDiagnosticSummary = Array<{
  id: string
  node_type: string
  name: string
  planned_minutes: number | null
  parent_id: string | null
  source_origin: string
  order_index: number
}>

export type SyntheticSubtreeRollupNodeFinding = {
  kind: 'post_body' | 'persisted_flat' | 'detail_structure'
  optionIndex: number
  optionTitle: string
  areaIndex: number
  areaTitle: string
  stepIndex: number
  stepTitle: string
  plannedMinutes: number
  reason: string
}

export function isConveyorCreateDiagnosticsEnabled(): boolean {
  return (
    process.env.CONVEYOR_CREATE_DIAGNOSTICS === '1' ||
    process.env.NODE_ENV !== 'production'
  )
}

export function summarizePostConveyorBodyForDiagnostics(
  body: PostConveyorBody,
): PostConveyorPayloadDiagnosticSummary {
  return {
    matrixRootItemId: body.matrixRootItemId ?? null,
    options: body.options.map((o) => ({
      titulo: o.titulo.slice(0, 300),
      orderIndex: o.orderIndex,
      sourceOrigin: o.sourceOrigin,
      areas: o.areas.map((a) => ({
        titulo: a.titulo.slice(0, 300),
        orderIndex: a.orderIndex,
        sourceOrigin: a.sourceOrigin,
        steps: a.steps.map((s) => ({
          titulo: s.titulo.slice(0, 300),
          orderIndex: s.orderIndex,
          plannedMinutes: s.plannedMinutes,
          sourceOrigin: s.sourceOrigin,
          assigneesCount: s.assignees?.length ?? 0,
        })),
      })),
    })),
  }
}

export function summarizePersistedConveyorNodes(
  rows: ConveyorNodeFlatRow[],
): PersistedNodesDiagnosticSummary {
  return [...rows]
    .sort((a, b) => {
      if (a.order_index !== b.order_index) return a.order_index - b.order_index
      return a.name.localeCompare(b.name, 'pt')
    })
    .map((r) => ({
      id: r.id,
      node_type: r.node_type,
      name: r.name.slice(0, 300),
      planned_minutes: r.planned_minutes,
      parent_id: r.parent_id,
      source_origin: r.source_origin,
      order_index: r.order_index,
    }))
}

function collectSyntheticFindings(
  options: Array<{
    optionTitle: string
    areas: Array<{
      areaTitle: string
      steps: Array<{
        stepTitle: string
        plannedMinutes: number
        sourceOrigin?: string
      }>
    }>
  }>,
  kind: SyntheticSubtreeRollupNodeFinding['kind'],
): SyntheticSubtreeRollupNodeFinding[] {
  const out: SyntheticSubtreeRollupNodeFinding[] = []
  const seen = new Set<string>()
  const push = (f: Omit<SyntheticSubtreeRollupNodeFinding, 'kind'>) => {
    const key = `${f.optionIndex}-${f.areaIndex}-${f.stepIndex}-${f.reason}`
    if (seen.has(key)) return
    seen.add(key)
    out.push({ ...f, kind })
  }

  for (let oi = 0; oi < options.length; oi++) {
    const opt = options[oi]!
    const optTitle = opt.optionTitle.trim()
    let totalMin = 0
    for (const ar of opt.areas) {
      for (const st of ar.steps) {
        totalMin += Math.max(0, st.plannedMinutes ?? 0)
      }
    }

    for (let ai = 0; ai < opt.areas.length; ai++) {
      const ar = opt.areas[ai]!
      const areaTitle = ar.areaTitle.trim()

      for (let si = 0; si < ar.steps.length; si++) {
        const st = ar.steps[si]!
        const stTitle = st.stepTitle.trim()
        const pm = Math.max(0, st.plannedMinutes ?? 0)

        if (optTitle.length > 0 && stTitle === optTitle) {
          push({
            optionIndex: oi,
            optionTitle: optTitle,
            areaIndex: ai,
            areaTitle,
            stepIndex: si,
            stepTitle: stTitle,
            plannedMinutes: pm,
            reason: 'step_title_matches_option_title',
          })
        }

        if (
          PLACEHOLDER_AREA_NAMES.has(areaTitle) &&
          optTitle.length > 0 &&
          stTitle === optTitle
        ) {
          push({
            optionIndex: oi,
            optionTitle: optTitle,
            areaIndex: ai,
            areaTitle,
            stepIndex: si,
            stepTitle: stTitle,
            plannedMinutes: pm,
            reason: 'placeholder_area_contains_step_matching_option_title',
          })
        }

        if (
          opt.areas.length === 1 &&
          ar.steps.length === 1 &&
          totalMin > 0 &&
          pm === totalMin &&
          optTitle.length > 0 &&
          stTitle === optTitle
        ) {
          push({
            optionIndex: oi,
            optionTitle: optTitle,
            areaIndex: ai,
            areaTitle,
            stepIndex: si,
            stepTitle: stTitle,
            plannedMinutes: pm,
            reason: 'single_step_absorbs_entire_option_planned_minutes',
          })
        }
      }
    }
  }
  return out
}

/** Detector sobre o body já validado do POST (espelho do cliente). */
export function detectSyntheticSubtreeRollupNodesFromPostBody(
  body: PostConveyorBody,
): SyntheticSubtreeRollupNodeFinding[] {
  const tree = body.options.map((o) => ({
    optionTitle: o.titulo.trim(),
    areas: o.areas.map((a) => ({
      areaTitle: a.titulo.trim(),
      steps: a.steps.map((s) => ({
        stepTitle: s.titulo.trim(),
        plannedMinutes: s.plannedMinutes,
        sourceOrigin: s.sourceOrigin,
      })),
    })),
  }))
  return collectSyntheticFindings(tree, 'post_body')
}

/** Detector sobre a estrutura devolvida pelo GET /conveyors/:id. */
export function detectSyntheticSubtreeRollupNodesFromDetailStructure(
  structure: ConveyorStructureApi,
): SyntheticSubtreeRollupNodeFinding[] {
  const tree = structure.options.map((o) => ({
    optionTitle: o.name.trim(),
    areas: o.areas.map((a) => ({
      areaTitle: a.name.trim(),
      steps: a.steps.map((s) => ({
        stepTitle: s.name.trim(),
        plannedMinutes: s.plannedMinutes ?? 0,
        sourceOrigin: undefined,
      })),
    })),
  }))
  return collectSyntheticFindings(tree, 'detail_structure')
}

/**
 * Heurística sobre linhas planas (BD): OPTION parent → AREA → STEP.
 * Menos precisa que árvore; útil para comparar contagens com payload.
 */
export function detectSyntheticSubtreeRollupNodesFromFlatRows(
  rows: ConveyorNodeFlatRow[],
): SyntheticSubtreeRollupNodeFinding[] {
  const opts = rows.filter((r) => r.node_type === 'OPTION')
  const findings: SyntheticSubtreeRollupNodeFinding[] = []
  for (let oi = 0; oi < opts.length; oi++) {
    const opt = opts[oi]!
    const optTitle = opt.name.trim()
    const areas = rows.filter((r) => r.parent_id === opt.id && r.node_type === 'AREA')
    let totalStepMin = 0
    for (const ar of areas) {
      const sts = rows.filter((r) => r.parent_id === ar.id && r.node_type === 'STEP')
      for (const st of sts) {
        totalStepMin += Math.max(0, st.planned_minutes ?? 0)
      }
    }
    for (let ai = 0; ai < areas.length; ai++) {
      const ar = areas[ai]!
      const areaTitle = ar.name.trim()
      const steps = rows.filter((r) => r.parent_id === ar.id && r.node_type === 'STEP')
      for (let si = 0; si < steps.length; si++) {
        const st = steps[si]!
        const stTitle = st.name.trim()
        const pm = Math.max(0, st.planned_minutes ?? 0)
        if (optTitle.length > 0 && stTitle === optTitle) {
          findings.push({
            kind: 'persisted_flat',
            optionIndex: oi,
            optionTitle: optTitle,
            areaIndex: ai,
            areaTitle,
            stepIndex: si,
            stepTitle: stTitle,
            plannedMinutes: pm,
            reason: 'step_title_matches_option_title',
          })
        }
        if (
          PLACEHOLDER_AREA_NAMES.has(areaTitle) &&
          optTitle.length > 0 &&
          stTitle === optTitle
        ) {
          findings.push({
            kind: 'persisted_flat',
            optionIndex: oi,
            optionTitle: optTitle,
            areaIndex: ai,
            areaTitle,
            stepIndex: si,
            stepTitle: stTitle,
            plannedMinutes: pm,
            reason: 'placeholder_area_contains_step_matching_option_title',
          })
        }
        if (
          areas.length === 1 &&
          steps.length === 1 &&
          totalStepMin > 0 &&
          pm === totalStepMin &&
          optTitle.length > 0 &&
          stTitle === optTitle
        ) {
          findings.push({
            kind: 'persisted_flat',
            optionIndex: oi,
            optionTitle: optTitle,
            areaIndex: ai,
            areaTitle,
            stepIndex: si,
            stepTitle: stTitle,
            plannedMinutes: pm,
            reason: 'single_step_absorbs_entire_option_planned_minutes',
          })
        }
      }
    }
  }
  return dedupeFindings(findings)
}

function dedupeFindings(
  findings: SyntheticSubtreeRollupNodeFinding[],
): SyntheticSubtreeRollupNodeFinding[] {
  const seen = new Set<string>()
  const out: SyntheticSubtreeRollupNodeFinding[] = []
  for (const f of findings) {
    const key = `${f.kind}-${f.optionIndex}-${f.areaIndex}-${f.stepIndex}-${f.reason}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push(f)
  }
  return out
}

/** Alias pedido em R6 S9.4.3 — mesmo critério que {@link detectSyntheticSubtreeRollupNodesFromPostBody}. */
export const detectSyntheticSubtreeRollupNodes = detectSyntheticSubtreeRollupNodesFromPostBody

export function logConveyorCreateDiagnostics(params: {
  stage:
    | 'conveyor.create.incoming_payload'
    | 'conveyor.create.persisted_nodes'
  conveyorId: string
  summary: unknown
  syntheticFindings: SyntheticSubtreeRollupNodeFinding[]
}): void {
  if (!isConveyorCreateDiagnosticsEnabled()) return
  console.info({
    stage: params.stage,
    conveyorId: params.conveyorId,
    summary: params.summary,
    syntheticRollupDetected: params.syntheticFindings.length > 0,
    syntheticFindings: params.syntheticFindings,
  })
}
