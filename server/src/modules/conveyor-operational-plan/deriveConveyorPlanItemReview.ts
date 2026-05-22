/**
 * Regras de revisão do item do Plano Operacional da Esteira (R4-S2).
 * Função pura — sem I/O.
 */

export type ConveyorPlanItemReviewReasonCode =
  | 'MISSING_PLANNED_MINUTES'
  | 'ZERO_PLANNED_MINUTES'
  | 'OVER_DAILY_CAPACITY'
  | 'MULTIPLE_TEAMS'
  | 'MISSING_ASSIGNEE'
  | 'MISSING_PLANNED_DATE'

export type ConveyorPlanItemReviewReason = {
  code: ConveyorPlanItemReviewReasonCode
  message: string
}

export type DeriveConveyorPlanItemReviewInput = {
  plannedMinutes: number | null
  plannedDate: string | null
  plannedCollaboratorId: string | null
  plannedTeamId: string | null
  stepTeamIds: string[]
  /** Capacidade diária resolvida pelo service (operational_capacity_settings). */
  dailyCapacityMinutes: number
}

export type DeriveConveyorPlanItemReviewResult = {
  reviewRequired: boolean
  reviewReasons: ConveyorPlanItemReviewReason[]
  status: 'PLANNED' | 'NEEDS_REVIEW'
}

const STATIC_REASON_MESSAGES: Record<
  Exclude<ConveyorPlanItemReviewReasonCode, 'OVER_DAILY_CAPACITY'>,
  string
> = {
  MISSING_PLANNED_MINUTES: 'Tempo previsto não informado.',
  ZERO_PLANNED_MINUTES: 'Tempo previsto zerado.',
  MULTIPLE_TEAMS: 'Múltiplas equipes na atividade; selecione uma equipe planejada.',
  MISSING_ASSIGNEE: 'Sem colaborador nem equipe planejados.',
  MISSING_PLANNED_DATE: 'Data planejada não informada.',
}

function overDailyCapacityMessage(dailyCapacityMinutes: number): string {
  return `Tempo previsto excede a capacidade diária configurada (${dailyCapacityMinutes} min).`
}

export function deriveConveyorPlanItemReview(
  input: DeriveConveyorPlanItemReviewInput,
): DeriveConveyorPlanItemReviewResult {
  const dailyCapacity = input.dailyCapacityMinutes
  if (!Number.isFinite(dailyCapacity) || dailyCapacity <= 0) {
    throw new Error('dailyCapacityMinutes must be a positive number')
  }
  const codes: ConveyorPlanItemReviewReasonCode[] = []

  if (input.plannedMinutes == null) {
    codes.push('MISSING_PLANNED_MINUTES')
  } else if (input.plannedMinutes === 0) {
    codes.push('ZERO_PLANNED_MINUTES')
  } else if (input.plannedMinutes > dailyCapacity) {
    codes.push('OVER_DAILY_CAPACITY')
  }

  if (!input.plannedDate?.trim()) {
    codes.push('MISSING_PLANNED_DATE')
  }

  if (input.stepTeamIds.length > 1 && !input.plannedTeamId) {
    codes.push('MULTIPLE_TEAMS')
  }

  if (!input.plannedCollaboratorId && !input.plannedTeamId) {
    codes.push('MISSING_ASSIGNEE')
  }

  const reviewReasons = codes.map((code) => ({
    code,
    message:
      code === 'OVER_DAILY_CAPACITY'
        ? overDailyCapacityMessage(dailyCapacity)
        : STATIC_REASON_MESSAGES[code],
  }))

  const reviewRequired = reviewReasons.length > 0
  return {
    reviewRequired,
    reviewReasons,
    status: reviewRequired ? 'NEEDS_REVIEW' : 'PLANNED',
  }
}
