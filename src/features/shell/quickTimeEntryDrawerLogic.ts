import type { PostConveyorStepTimeEntryBody } from '../../domain/conveyors/conveyor-step-assignments.types'
import type { TimeEntryCandidateItem } from '../../domain/my-activities/my-activities.types'

export const QUICK_TIME_ENTRY_TOAST = {
  entrySaved: 'Apontamento registado com sucesso.',
  entrySavedAndCompleted: 'Apontamento salvo e atividade concluída.',
  activityCompleted: 'Atividade concluída.',
} as const

export const QUICK_TIME_ENTRY_ERRORS = {
  completeFailed: 'Não foi possível concluir esta atividade.',
  outOfSequenceJustificationRequired:
    'Informe uma justificativa para concluir fora da sequência.',
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

/** Botão «Concluir atividade» na lista — atividades apontáveis alocadas ao colaborador. */
export function canShowCompleteActivityButton(candidate: TimeEntryCandidateItem): boolean {
  if (!candidate.conveyorId || !candidate.stepNodeId) return false
  if (candidate.canCompleteStep === false) return false
  // Conclusão direta (PATCH) na lista: alocado. Exceção/fora de alocação usa formulário + markAsDone.
  if (candidateNeedsJustification(candidate)) return false
  return true
}

export function canShowSaveAndCompleteButton(candidate: TimeEntryCandidateItem): boolean {
  return candidate.canCompleteStep !== false
}

export type JustificationFieldValue = {
  justificationId: string | null
  justificationComplement: string
  legacyText: string
}

export const emptyJustificationValue = (): JustificationFieldValue => ({
  justificationId: null,
  justificationComplement: '',
  legacyText: '',
})

export type BuildTimeEntryPayloadInput = {
  candidate: TimeEntryCandidateItem
  minutes: number
  executedQuantity: number
  description: string
  exceptionJustification: JustificationFieldValue
  outOfSequenceJustification: JustificationFieldValue
  markAsDone: boolean
}

function appendJustificationFields(
  payload: PostConveyorStepTimeEntryBody,
  prefix: 'exception' | 'outOfSequence',
  value: JustificationFieldValue,
): void {
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

  const payload: PostConveyorStepTimeEntryBody = {
    minutes: input.minutes,
    executedQuantity: input.executedQuantity,
    description: input.description.trim() || null,
    entryMode: 'manual',
    ...(input.markAsDone ? { markAsDone: true } : {}),
  }

  if (needsJ) appendJustificationFields(payload, 'exception', input.exceptionJustification)
  if (needsOos) appendJustificationFields(payload, 'outOfSequence', input.outOfSequenceJustification)

  return payload
}

export function resolveTimeEntrySuccessToast(markAsDone: boolean): string {
  return markAsDone
    ? QUICK_TIME_ENTRY_TOAST.entrySavedAndCompleted
    : QUICK_TIME_ENTRY_TOAST.entrySaved
}

export function validateTimeEntryForm(input: {
  candidate: TimeEntryCandidateItem
  exceptionJustification: JustificationFieldValue
  outOfSequenceJustification: JustificationFieldValue
}): string | null {
  if (candidateNeedsJustification(input.candidate)) {
    if (!input.exceptionJustification.legacyText.trim().length) {
      return 'Selecione uma justificativa para continuar.'
    }
  }
  if (candidateNeedsOutOfSequenceJustification(input.candidate)) {
    if (!input.outOfSequenceJustification.legacyText.trim().length) {
      return 'Selecione uma justificativa para continuar.'
    }
  }
  return null
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
