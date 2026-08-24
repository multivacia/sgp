export type StepAbortReasonStatusFilter = 'active' | 'inactive' | 'all'

export type StepAbortReason = {
  code: string
  label: string
  description: string | null
  requiresComplement: boolean
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type StepAbortReasonOption = {
  code: string
  label: string
  description: string | null
  requiresComplement: boolean
  sortOrder: number
}

export type CreateStepAbortReasonInput = {
  code: string
  label: string
  description?: string | null
  requiresComplement?: boolean
  sortOrder?: number
  isActive?: boolean
}

export type UpdateStepAbortReasonInput = {
  label?: string
  description?: string | null
  requiresComplement?: boolean
  sortOrder?: number
  isActive?: boolean
}

export type AbortConveyorStepBody = {
  reasonCode: string
  reasonText?: string | null
}

/**
 * Exibe rótulo histórico de dispensa.
 * Prioriza snapshot; fallback seguro para código legado sem inventar labels hard-coded.
 */
export function stepAbortReasonDisplayLabel(input: {
  code?: string | null
  labelSnapshot?: string | null
  eventReasonLabel?: string | null
}): string {
  const snap = input.labelSnapshot?.trim()
  if (snap) return snap
  const fromEvent = input.eventReasonLabel?.trim()
  if (fromEvent) return fromEvent
  return input.code?.trim() ?? ''
}

/** @deprecated Preferir stepAbortReasonDisplayLabel com snapshot. */
export function stepAbortReasonLabel(code: string | null | undefined): string {
  return stepAbortReasonDisplayLabel({ code })
}
