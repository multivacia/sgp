/**
 * R6 S9.4.2 — Diagnóstico seguro do payload de criação (sem LGPD/financeiro).
 * Apenas estrutura operacional: opções, áreas, etapas.
 */

import type { ConveyorDraft } from '../../../domain/argos/draft-v1.types'
import type { CreateConveyorInput } from '../../../domain/conveyors/conveyor.types'

/** Áreas “genéricas” que não devem servir de casca para uma etapa = título da opção (TASK). */
const PLACEHOLDER_AREA_TITLES = new Set(['Área', 'Serviço'])

/** Normalização PT sem acentos — alinhada ao backend `conveyorCreateDiagnostics`. */
export function normalizeConveyorSynthTitle(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

const PLACEHOLDER_AREA_NORMALIZED = new Set(['area', 'servico'])

export function isPlaceholderAreaTitulo(titulo: string): boolean {
  return PLACEHOLDER_AREA_NORMALIZED.has(normalizeConveyorSynthTitle(titulo))
}

export type CreateConveyorOptionLike = {
  titulo: string
  areas: ReadonlyArray<{
    titulo: string
    steps: ReadonlyArray<{ titulo: string; plannedMinutes: number }>
  }>
}

export function optionHasRealAreasBeyondPlaceholder(opt: CreateConveyorOptionLike): boolean {
  for (const ar of opt.areas) {
    if (!isPlaceholderAreaTitulo(ar.titulo) && (ar.steps?.length ?? 0) > 0) return true
  }
  return false
}

/** R6 S9.4.5 — mesmo contrato que o backend `detectSyntheticSubtreeRollupInCreatePayload`. */
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

export type SyntheticSubtreeStepFinding = {
  optionIndex: number
  optionTitle: string
  areaIndex: number
  areaTitle: string
  stepIndex: number
  stepTitle: string
  plannedMinutes: number
  reason: string
}

export function detectSyntheticSubtreeRollupInCreatePayload(
  input: Pick<CreateConveyorInput, 'options'>,
): SyntheticSubtreeRollupOfficialFinding[] {
  const out: SyntheticSubtreeRollupOfficialFinding[] = []
  const opts = input.options ?? []
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

/** Entrada segura para consola DEV — sem PII; inclui `detectorName` por achado. */
export type SyntheticFindingDevLogEntry = {
  detectorName: string
  optionIndex: number
  optionTitle: string
  areaIndex: number
  areaTitle: string
  stepIndex: number
  stepTitle: string
  plannedMinutes: number
  reason: string
}

function optionTitleOf(
  f: SyntheticSubtreeRollupOfficialFinding | SyntheticSubtreeStepFinding,
): string {
  return 'optionName' in f ? f.optionName : f.optionTitle
}

function areaTitleOf(
  f: SyntheticSubtreeRollupOfficialFinding | SyntheticSubtreeStepFinding,
): string {
  return 'areaName' in f ? f.areaName : f.areaTitle
}

function stepTitleOf(
  f: SyntheticSubtreeRollupOfficialFinding | SyntheticSubtreeStepFinding,
): string {
  return 'stepName' in f ? f.stepName : f.stepTitle
}

export function toSyntheticFindingDevLog(
  findings: ReadonlyArray<
    SyntheticSubtreeRollupOfficialFinding | SyntheticSubtreeStepFinding
  >,
  detectorName: string,
): SyntheticFindingDevLogEntry[] {
  return findings.map((f) => ({
    detectorName,
    optionIndex: f.optionIndex,
    optionTitle: optionTitleOf(f),
    areaIndex: f.areaIndex,
    areaTitle: areaTitleOf(f),
    stepIndex: f.stepIndex,
    stepTitle: stepTitleOf(f),
    plannedMinutes: f.plannedMinutes,
    reason: f.reason,
  }))
}

export function stripOfficialSyntheticRollupFromCreateInputOptions(
  options: CreateConveyorInput['options'],
): CreateConveyorInput['options'] {
  return options.map((opt) => {
    if (!optionHasRealAreasBeyondPlaceholder(opt)) return opt
    const no = normalizeConveyorSynthTitle(opt.titulo)
    const areas = opt.areas
      .map((ar) => {
        if (!isPlaceholderAreaTitulo(ar.titulo)) return ar
        const steps = ar.steps.filter((st) => {
          const pm = Math.max(0, st.plannedMinutes ?? 0)
          const ns = normalizeConveyorSynthTitle(st.titulo)
          if (pm > 0 && ns === no && no.length > 0) return false
          return true
        })
        return { ...ar, steps }
      })
      .filter((ar) => ar.steps.length > 0)
    return { ...opt, areas }
  })
}

export type CreateConveyorPayloadSummary = {
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
      }>
    }>
  }>
}

export type EditableDraftSummary = {
  options: Array<{
    title: string
    orderIndex: number
    areas: Array<{
      title: string
      orderIndex: number
      steps: Array<{
        title: string
        orderIndex: number
        plannedMinutes?: number
        sourceOrigin?: string
        /** Presente só no draft editável (meta de revisão). */
        reviewMatchedMatrixNodeId?: string
        assigneesCount: number
      }>
    }>
  }>
}

/** Resumo do POST /conveyors — sem dados, observações, cliente. */
export function summarizeCreateConveyorInput(input: CreateConveyorInput): CreateConveyorPayloadSummary {
  return {
    options: (input.options ?? []).map((o) => ({
      titulo: o.titulo.slice(0, 200),
      orderIndex: o.orderIndex,
      sourceOrigin: o.sourceOrigin,
      areas: o.areas.map((a) => ({
        titulo: a.titulo.slice(0, 200),
        orderIndex: a.orderIndex,
        sourceOrigin: a.sourceOrigin,
        steps: a.steps.map((s) => ({
          titulo: s.titulo.slice(0, 200),
          orderIndex: s.orderIndex,
          plannedMinutes: s.plannedMinutes,
          sourceOrigin: s.sourceOrigin,
          assigneesCount: s.assignees?.length ?? 0,
        })),
      })),
    })),
  }
}

/** Resumo do draft editável (mesma forma conceitual que o payload). */
export function summarizeConveyorDraftForImportDebug(draft: ConveyorDraft): EditableDraftSummary {
  return {
    options: (draft.options ?? []).map((o) => ({
      title: (o.title ?? '').slice(0, 200),
      orderIndex: o.orderIndex,
      areas: (o.areas ?? []).map((a) => ({
        title: (a.title ?? '').slice(0, 200),
        orderIndex: a.orderIndex,
        steps: (a.steps ?? []).map((s) => {
          const raw = s as unknown as Record<string, unknown>
          const mid =
            typeof raw.__reviewMatchedMatrixNodeId === 'string'
              ? raw.__reviewMatchedMatrixNodeId.slice(0, 40)
              : undefined
          return {
            title: (s.title ?? '').slice(0, 200),
            orderIndex: s.orderIndex,
            plannedMinutes: typeof s.plannedMinutes === 'number' ? s.plannedMinutes : undefined,
            sourceOrigin:
              raw.__reviewSourceOrigin === 'reaproveitada' ? 'reaproveitada' : 'manual',
            reviewMatchedMatrixNodeId: mid,
            assigneesCount: Array.isArray(raw.assignees) ? raw.assignees.length : 0,
          }
        }),
      })),
    })),
  }
}

type OptionTreeSynth = {
  optionTitle: string
  areas: Array<{
    areaTitle: string
    steps: Array<{
      stepTitle: string
      plannedMinutes: number
      sourceOrigin?: string
      reviewMatchedMatrixNodeId?: string
    }>
  }>
}

function collectSyntheticFindings(
  tree: OptionTreeSynth[],
  isDraft: boolean,
): SyntheticSubtreeStepFinding[] {
  const out: SyntheticSubtreeStepFinding[] = []
  const seen = new Set<string>()
  const pushUnique = (f: SyntheticSubtreeStepFinding) => {
    const key = `${f.optionIndex}-${f.areaIndex}-${f.stepIndex}-${f.reason}`
    if (seen.has(key)) return
    seen.add(key)
    out.push(f)
  }

  for (let oi = 0; oi < tree.length; oi++) {
    const opt = tree[oi]!
    const optTitle = opt.optionTitle.trim()
    let totalMinutes = 0
    for (const ar of opt.areas) {
      for (const st of ar.steps) {
        totalMinutes += Math.max(0, st.plannedMinutes ?? 0)
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
          pushUnique({
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
          PLACEHOLDER_AREA_TITLES.has(areaTitle) &&
          optTitle.length > 0 &&
          stTitle === optTitle
        ) {
          pushUnique({
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

        const hasLeafMatrixId =
          typeof st.reviewMatchedMatrixNodeId === 'string' &&
          st.reviewMatchedMatrixNodeId.trim().length > 0

        if (
          isDraft &&
          st.sourceOrigin === 'reaproveitada' &&
          pm >= 180 &&
          !hasLeafMatrixId &&
          optTitle.length > 0 &&
          stTitle === optTitle
        ) {
          pushUnique({
            optionIndex: oi,
            optionTitle: optTitle,
            areaIndex: ai,
            areaTitle,
            stepIndex: si,
            stepTitle: stTitle,
            plannedMinutes: pm,
            reason: 'reaproveitada_high_minutes_step_equals_option_without_leaf_matrix_id',
          })
        }

        if (
          opt.areas.length === 1 &&
          ar.steps.length === 1 &&
          totalMinutes > 0 &&
          pm === totalMinutes &&
          optTitle.length > 0 &&
          stTitle === optTitle
        ) {
          pushUnique({
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

function mapPayloadToSynthTree(input: CreateConveyorInput): OptionTreeSynth[] {
  return (input.options ?? []).map((o) => ({
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
}

function mapDraftToSynthTree(draft: ConveyorDraft): OptionTreeSynth[] {
  return (draft.options ?? []).map((o) => ({
    optionTitle: (o.title ?? '').trim(),
    areas: (o.areas ?? []).map((a) => ({
      areaTitle: (a.title ?? '').trim(),
      steps: (a.steps ?? []).map((s) => {
        const raw = s as unknown as Record<string, unknown>
        const mid =
          typeof raw.__reviewMatchedMatrixNodeId === 'string'
            ? raw.__reviewMatchedMatrixNodeId
            : undefined
        return {
          stepTitle: (s.title ?? '').trim(),
          plannedMinutes: typeof s.plannedMinutes === 'number' ? s.plannedMinutes : 0,
          sourceOrigin:
            raw.__reviewSourceOrigin === 'reaproveitada' ? 'reaproveitada' : 'manual',
          reviewMatchedMatrixNodeId: mid,
        }
      }),
    })),
  }))
}

/** Deteta etapas suspeitas de “rollup” da TASK na árvore já mapeada para o POST. */
export function detectSyntheticSubtreeRollupSteps(
  input: CreateConveyorInput,
): SyntheticSubtreeStepFinding[] {
  return collectSyntheticFindings(mapPayloadToSynthTree(input), false)
}

/** Mesmas heurísticas sobre o draft editável (após applyReviewDecisions). */
export function detectSyntheticSubtreeRollupInEditableDraft(
  draft: ConveyorDraft,
): SyntheticSubtreeStepFinding[] {
  return collectSyntheticFindings(mapDraftToSynthTree(draft), true)
}

/** Mensagem ao bloquear criação quando o detector acusa rollup sintético. */
export const SYNTHETIC_SUBTREE_STEP_USER_MESSAGE =
  'A estrutura contém uma etapa sintética de Matriz. Remova o item agregado e mantenha apenas as atividades reais.'
