export type ConveyorDelayStateReason =
  | 'NO_DEADLINE'
  | 'INVALID_DEADLINE'
  | 'COMPLETED'
  | 'NO_PENDING_WORK'
  | 'DEADLINE_EXCEEDED_WITH_PENDING_WORK'
  | 'ON_TIME'

export type ConveyorDelayStateInput = {
  operationalStatus: string | null
  estimatedDeadline: string | Date | null
  pendingMinutes: number
  now: Date
}

export type ConveyorDelayStateResult = {
  isDelayed: boolean
  reason: ConveyorDelayStateReason
  parsedDeadline?: Date | null
}

function parseDeadline(deadline: string | Date | null): Date | null | 'invalid' {
  if (deadline == null) return null
  const d = deadline instanceof Date ? deadline : new Date(deadline)
  if (Number.isNaN(d.getTime())) return 'invalid'
  return d
}

function isCompletedStatus(status: string | null): boolean {
  if (!status) return false
  const s = status.trim().toLowerCase()
  return s === 'concluida' || s === 'concluidas' || s === 'completed'
}

export function calculateConveyorDelayState(
  input: ConveyorDelayStateInput,
): ConveyorDelayStateResult {
  if (isCompletedStatus(input.operationalStatus)) {
    return { isDelayed: false, reason: 'COMPLETED', parsedDeadline: null }
  }

  const parsedDeadline = parseDeadline(input.estimatedDeadline)
  if (parsedDeadline === null) {
    return { isDelayed: false, reason: 'NO_DEADLINE', parsedDeadline: null }
  }
  if (parsedDeadline === 'invalid') {
    return { isDelayed: false, reason: 'INVALID_DEADLINE', parsedDeadline: null }
  }

  if (input.pendingMinutes <= 0) {
    return { isDelayed: false, reason: 'NO_PENDING_WORK', parsedDeadline }
  }

  if (input.now.getTime() > parsedDeadline.getTime()) {
    return {
      isDelayed: true,
      reason: 'DEADLINE_EXCEEDED_WITH_PENDING_WORK',
      parsedDeadline,
    }
  }

  return { isDelayed: false, reason: 'ON_TIME', parsedDeadline }
}

