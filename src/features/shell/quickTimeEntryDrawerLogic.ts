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
  return c.requiresOutOfSequenceJustification === true || c.isOutOfSequence === true
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

export type BuildTimeEntryPayloadInput = {
  candidate: TimeEntryCandidateItem
  minutes: number
  executedQuantity: number
  description: string
  exceptionJustification: string
  outOfSequenceJustification: string
  markAsDone: boolean
}

export function buildTimeEntryPayload(
  input: BuildTimeEntryPayloadInput,
): PostConveyorStepTimeEntryBody {
  const needsJ = candidateNeedsJustification(input.candidate)
  const needsOos = candidateNeedsOutOfSequenceJustification(input.candidate)
  const ej = input.exceptionJustification.trim()
  const oos = input.outOfSequenceJustification.trim()

  return {
    minutes: input.minutes,
    executedQuantity: input.executedQuantity,
    description: input.description.trim() || null,
    entryMode: 'manual',
    ...(needsJ ? { exceptionJustification: ej } : {}),
    ...(needsOos ? { outOfSequenceJustification: oos } : {}),
    ...(input.markAsDone ? { markAsDone: true } : {}),
  }
}

export function resolveTimeEntrySuccessToast(markAsDone: boolean): string {
  return markAsDone
    ? QUICK_TIME_ENTRY_TOAST.entrySavedAndCompleted
    : QUICK_TIME_ENTRY_TOAST.entrySaved
}

export function validateTimeEntryForm(input: {
  candidate: TimeEntryCandidateItem
  exceptionJustification: string
  outOfSequenceJustification: string
}): string | null {
  if (candidateNeedsJustification(input.candidate)) {
    if (!input.exceptionJustification.trim().length) {
      return 'Para apontar horas nesta atividade, informe a justificativa da exceção.'
    }
  }
  if (candidateNeedsOutOfSequenceJustification(input.candidate)) {
    if (!input.outOfSequenceJustification.trim().length) {
      return 'Informe uma justificativa para executar esta atividade fora da sequência recomendada.'
    }
  }
  return null
}

export function validateCompleteOutOfSequenceJustification(
  candidate: TimeEntryCandidateItem,
  justification: string,
): string | null {
  if (!candidateNeedsOutOfSequenceJustification(candidate)) return null
  if (!justification.trim().length) {
    return QUICK_TIME_ENTRY_ERRORS.outOfSequenceJustificationRequired
  }
  return null
}
