import type { PostConveyorStepTimeEntryBody } from '../../domain/conveyors/conveyor-step-assignments.types'
import type { TimeEntryCandidateItem } from '../../domain/my-activities/my-activities.types'
import {
  OPERATIONAL_JUSTIFICATION_MESSAGES,
  validateJustificationFieldValue,
} from '../../domain/operational/timeEntryJustificationField'
import type { JustificationFieldValue } from '../../domain/operational/timeEntryJustificationField'
import { emptyJustificationFieldValue } from '../../domain/operational/timeEntryJustificationField'
import {
  buildEntryAtForWorkDate,
  validateWorkDate,
} from '../../domain/operational/workDate'

export const QUICK_TIME_ENTRY_TOAST = {
  entrySaved: 'Apontamento registrado com sucesso.',
  entrySavedAndCompleted: 'Apontamento salvo e atividade concluída.',
  activityCompleted: 'Atividade concluída.',
} as const

export const QUICK_TIME_ENTRY_ERRORS = {
  completeFailed: 'Não foi possível concluir esta atividade.',
  outOfSequenceJustificationRequired:
    OPERATIONAL_JUSTIFICATION_MESSAGES.missingSelection,
  alreadyCompleted: 'Esta atividade já está concluída.',
} as const

export function candidateNeedsJustification(c: TimeEntryCandidateItem): boolean {
  return c.requiresJustification === true || c.isAssignedToMe === false
}

export function candidateNeedsOutOfSequenceJustification(c: TimeEntryCandidateItem): boolean {
  return (
    c.requiresOutOfSequenceJustification === true ||
    c.hasPreviousPendingStep === true ||
    c.isOutOfSequence === true
  )
}

export function candidateRequiresOperationalJustification(c: TimeEntryCandidateItem): boolean {
  return candidateNeedsJustification(c) || candidateNeedsOutOfSequenceJustification(c)
}

/** Botão «Concluir atividade» na lista — atividades apontáveis alocadas ao colaborador. */
/**
 * Excesso de tempo previsto (TASK apontamento-somente-planejado): vale para atividade
 * planejada para o próprio colaborador, com previsto e apontado dele (todos os dias).
 * Exceção ou fora de sequência já exigem justificativa e dispensam esta.
 */
export function candidateRequiresExcessJustification(
  c: TimeEntryCandidateItem,
  minutes: number,
): boolean {
  if (candidateRequiresOperationalJustification(c)) return false
  if (!Number.isInteger(minutes) || minutes <= 0) return false
  const planned = c.plannedTotalMinutes ?? c.plannedMinutes
  if (planned == null || !Number.isFinite(planned) || planned <= 0) return false
  return (c.realizedMinutes ?? 0) + minutes > planned
}

export function canShowCompleteActivityButton(candidate: TimeEntryCandidateItem): boolean {
  if (!candidate.conveyorId || !candidate.stepNodeId) return false
  if (candidate.canCompleteStep === false) return false
  if (candidateNeedsJustification(candidate)) return false
  return true
}

export function canShowSaveAndCompleteButton(candidate: TimeEntryCandidateItem): boolean {
  return candidate.canCompleteStep !== false
}

export type { JustificationFieldValue } from '../../domain/operational/timeEntryJustificationField'

export const emptyJustificationValue = emptyJustificationFieldValue

export type BuildTimeEntryPayloadInput = {
  candidate: TimeEntryCandidateItem
  minutes: number
  executedQuantity: number
  description: string
  operationalJustification: JustificationFieldValue
  markAsDone: boolean
  /** Data de realização (YYYY-MM-DD, São Paulo). */
  workDate: string
  now?: Date
}

function appendJustificationFields(
  payload: PostConveyorStepTimeEntryBody,
  prefix: 'exception' | 'outOfSequence',
  value: JustificationFieldValue,
): void {
  if (!value.justificationId && !value.legacyText.trim()) return
  if (value.justificationId) {
    if (prefix === 'exception') {
      payload.exceptionJustificationId = value.justificationId
      if (value.justificationComplement.trim()) {
        payload.exceptionJustificationComplement = value.justificationComplement.trim()
      }
      payload.exceptionJustification = value.legacyText.trim()
    } else {
      payload.outOfSequenceJustificationId = value.justificationId
      if (value.justificationComplement.trim()) {
        payload.outOfSequenceJustificationComplement = value.justificationComplement.trim()
      }
      payload.outOfSequenceJustification = value.legacyText.trim()
    }
    return
  }
  const legacy = value.legacyText.trim()
  if (!legacy) return
  if (prefix === 'exception') {
    payload.exceptionJustification = legacy
  } else {
    payload.outOfSequenceJustification = legacy
  }
}

export function buildTimeEntryPayload(
  input: BuildTimeEntryPayloadInput,
): PostConveyorStepTimeEntryBody {
  const needsJ = candidateNeedsJustification(input.candidate)
  const needsOos = candidateNeedsOutOfSequenceJustification(input.candidate)
  const justification = input.operationalJustification

  const payload: PostConveyorStepTimeEntryBody = {
    minutes: input.minutes,
    executedQuantity: input.executedQuantity,
    description: input.description.trim() || null,
    entryMode: 'manual',
    entryAt: buildEntryAtForWorkDate(input.workDate, input.now),
    ...(input.markAsDone ? { markAsDone: true } : {}),
  }

  if (needsJ) appendJustificationFields(payload, 'exception', justification)
  if (needsOos) appendJustificationFields(payload, 'outOfSequence', justification)

  if (!needsJ && !needsOos && justification.justificationId) {
    payload.justificationId = justification.justificationId
    if (justification.justificationComplement.trim()) {
      payload.justificationComplement = justification.justificationComplement.trim()
    }
  } else if (!needsJ && !needsOos && justification.legacyText.trim()) {
    payload.justificationId = undefined
    payload.justificationComplement = justification.justificationComplement.trim() || undefined
  }

  return payload
}

export function resolveTimeEntrySuccessToast(markAsDone: boolean): string {
  return markAsDone
    ? QUICK_TIME_ENTRY_TOAST.entrySavedAndCompleted
    : QUICK_TIME_ENTRY_TOAST.entrySaved
}

export function validateTimeEntryForm(input: {
  candidate: TimeEntryCandidateItem
  operationalJustification: JustificationFieldValue
  useFallback: boolean
  requiresComplement: boolean
  /** Minutos informados; quando passam do previsto do colaborador, a justificativa é obrigatória. */
  minutes?: number
}): string | null {
  const requiresExcess =
    input.minutes !== undefined && candidateRequiresExcessJustification(input.candidate, input.minutes)
  if (!candidateRequiresOperationalJustification(input.candidate) && !requiresExcess) {
    if (!input.operationalJustification.justificationId && !input.operationalJustification.legacyText.trim()) {
      return null
    }
    if (input.operationalJustification.justificationId || input.useFallback) {
      return validateJustificationFieldValue({
        value: input.operationalJustification,
        useFallback: input.useFallback,
        requiresComplement: input.requiresComplement,
      })
    }
    return null
  }
  return validateJustificationFieldValue({
    value: input.operationalJustification,
    useFallback: input.useFallback,
    requiresComplement: input.requiresComplement,
  })
}

export function validateCompleteOutOfSequenceJustification(
  candidate: TimeEntryCandidateItem,
  justification: JustificationFieldValue,
): string | null {
  if (!candidateNeedsOutOfSequenceJustification(candidate)) return null
  if (!justification.legacyText.trim().length) {
    return QUICK_TIME_ENTRY_ERRORS.outOfSequenceJustificationRequired
  }
  return null
}

/** Placeholder do select de descrição no apontamento extra esteira. */
export const EXTRA_TIME_ENTRY_DESCRIPTION_PLACEHOLDER = 'Selecione um motivo...' as const

/**
 * Resolve a seleção de descrição após (re)carregar o catálogo.
 * Nunca pré-seleciona o primeiro item; mantém prev só se ainda existir na lista.
 */
export function resolveExtraDescriptionSelectionAfterLoad(
  prev: string,
  rows: ReadonlyArray<{ id: string }>,
): string {
  if (prev && rows.some((item) => item.id === prev)) return prev
  return ''
}

/** Envio do apontamento extra exige motivo escolhido e minutos > 0. */
export function canSubmitExtraTimeEntry(input: {
  descriptionId: string
  minutesValid: boolean
  submitting?: boolean
  unavailable?: boolean
  /** Data de realização (YYYY-MM-DD); futura ou inválida bloqueia o envio. */
  entryDate?: string
}): boolean {
  if (input.submitting) return false
  if (input.unavailable) return false
  if (!input.descriptionId.trim()) return false
  if (!input.minutesValid) return false
  if (input.entryDate !== undefined && validateWorkDate(input.entryDate) !== null) return false
  return true
}
