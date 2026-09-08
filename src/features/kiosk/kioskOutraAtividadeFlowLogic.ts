import type { TimeEntryCandidateItem } from '../../domain/my-activities/my-activities.types'
import type { ProductionUnassignedTimeEntryPayload } from '../../domain/production/production.types'
import { validateJustificationSelectValue } from '../../components/operational/JustificationSelect'
import {
  candidateNeedsJustification as candidateNeedsExceptionJustification,
  candidateNeedsOutOfSequenceJustification,
  type JustificationFieldValue,
} from '../shell/quickTimeEntryDrawerLogic'

export { candidateNeedsExceptionJustification, candidateNeedsOutOfSequenceJustification }

export const KIOSK_OUTRA_ATIVIDADE_SEARCH_MIN_CHARS = 2

export function parseKioskMinutes(raw: string): number {
  const n = Number.parseInt(raw, 10)
  return Number.isInteger(n) ? n : 0
}

export function isValidKioskOutraAtividadeMinutes(minutes: number): boolean {
  return Number.isInteger(minutes) && minutes >= 1
}

/** Rótulo compacto: esteira + tarefa + setor, sem duplicar o título da atividade. */
export function formatCandidateContextLine(candidate: TimeEntryCandidateItem): string {
  const parts: string[] = []
  const conveyorLabel = candidate.conveyorCode || candidate.conveyorName
  if (conveyorLabel) parts.push(conveyorLabel)
  if (candidate.taskTitle) parts.push(candidate.taskTitle)
  if (candidate.sectorTitle) parts.push(candidate.sectorTitle)
  return parts.join(' · ')
}

type JustificationState = {
  value: JustificationFieldValue
  useFallback: boolean
  requiresComplement: boolean
}

function justificationValidationError(state: JustificationState): string | null {
  return validateJustificationSelectValue({
    useFallback: state.useFallback,
    justificationId: state.value.justificationId,
    legacyText: state.value.legacyText,
    requiresComplement: state.requiresComplement,
    complement: state.value.justificationComplement,
  })
}

export function candidateNeedsOperationalJustification(c: TimeEntryCandidateItem): boolean {
  return candidateNeedsExceptionJustification(c) || candidateNeedsOutOfSequenceJustification(c)
}

export function canSubmitKioskOutraAtividadeForm(input: {
  candidate: TimeEntryCandidateItem | null
  minutes: number
  operationalJustification: JustificationState
}): boolean {
  if (!input.candidate) return false
  if (!isValidKioskOutraAtividadeMinutes(input.minutes)) return false
  if (
    candidateNeedsOperationalJustification(input.candidate) &&
    justificationValidationError(input.operationalJustification)
  ) {
    return false
  }
  return true
}

function appendJustification(
  payload: ProductionUnassignedTimeEntryPayload,
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

/**
 * Uma única seleção de justificativa operacional é feita pelo colaborador, e é distribuída
 * pros dois destinos do payload (`exceptionJustification*` e/ou `outOfSequenceJustification*`),
 * conforme a atividade exigir — mesma semântica de `buildTimeEntryPayload`
 * (`quickTimeEntryDrawerLogic.ts`).
 */
export function buildKioskUnassignedTimeEntryPayload(input: {
  candidate: TimeEntryCandidateItem
  minutes: number
  note: string
  operationalJustification: JustificationFieldValue
}): ProductionUnassignedTimeEntryPayload {
  const needsException = candidateNeedsExceptionJustification(input.candidate)
  const needsOos = candidateNeedsOutOfSequenceJustification(input.candidate)
  const note = input.note.trim()

  const payload: ProductionUnassignedTimeEntryPayload = {
    conveyorId: input.candidate.conveyorId,
    stepNodeId: input.candidate.stepNodeId,
    minutes: input.minutes,
    ...(note ? { note } : {}),
  }

  if (needsException) appendJustification(payload, 'exception', input.operationalJustification)
  if (needsOos) appendJustification(payload, 'outOfSequence', input.operationalJustification)

  return payload
}
