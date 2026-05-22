/**
 * Gerador determinístico de itens do Plano Operacional da Esteira (R4-S1).
 * Função pura — sem I/O.
 */

/** Usado apenas em testes do helper puro. */
export const DEFAULT_DAILY_CAPACITY_MINUTES = 480

export type ConveyorPlanGenerationStepInput = {
  activityNodeId: string
  taskName: string
  areaName: string
  activityName: string
  optionOrderIndex: number
  areaOrderIndex: number
  stepOrderIndex: number
  plannedMinutes: number | null
  defaultResponsibleId: string | null
  collaboratorAssigneeIds: string[]
  teamAssigneeIds: string[]
}

export type BuildConveyorOperationalPlanGeneratedItemsInput = {
  steps: ConveyorPlanGenerationStepInput[]
  plannedStartDate: string
  dailyCapacityMinutes: number
}

export type ConveyorOperationalPlanGeneratedItem = {
  activityNodeId: string
  plannedDate: string
  plannedOrder: number
  plannedMinutes: number
  plannedCollaboratorId: string | null
  plannedTeamId: string | null
  reviewRequired: boolean
  status: 'PLANNED' | 'NEEDS_REVIEW'
  warnings: string[]
}

export type BuildConveyorOperationalPlanGeneratedItemsResult = {
  items: ConveyorOperationalPlanGeneratedItem[]
  plannedEndDate: string | null
  warnings: string[]
}

const MS_PER_DAY = 86_400_000

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

function formatIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function isWeekendUtc(d: Date): boolean {
  const day = d.getUTCDay()
  return day === 0 || day === 6
}

function addCalendarDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * MS_PER_DAY)
}

/** Próximo dia útil (seg–sex) igual ou posterior a `d`. */
export function nextBusinessDayOnOrAfter(d: Date): Date {
  let cur = new Date(d.getTime())
  while (isWeekendUtc(cur)) {
    cur = addCalendarDays(cur, 1)
  }
  return cur
}

/** Primeiro dia útil estritamente após `d`. */
export function nextBusinessDayAfter(d: Date): Date {
  return nextBusinessDayOnOrAfter(addCalendarDays(d, 1))
}

function sortSteps(steps: ConveyorPlanGenerationStepInput[]): ConveyorPlanGenerationStepInput[] {
  return [...steps].sort((a, b) => {
    const byOpt = a.optionOrderIndex - b.optionOrderIndex
    if (byOpt !== 0) return byOpt
    const byArea = a.areaOrderIndex - b.areaOrderIndex
    if (byArea !== 0) return byArea
    const byStep = a.stepOrderIndex - b.stepOrderIndex
    if (byStep !== 0) return byStep
    return a.activityNodeId.localeCompare(b.activityNodeId)
  })
}

function resolveMinutes(raw: number | null): { minutes: number; review: boolean; warning?: string } {
  if (raw == null) {
    return {
      minutes: 0,
      review: true,
      warning: 'Tempo previsto não informado na atividade.',
    }
  }
  if (raw === 0) {
    return {
      minutes: 0,
      review: true,
      warning: 'Tempo previsto zerado na atividade.',
    }
  }
  return { minutes: raw, review: false }
}

function resolvePlannedAssignee(input: {
  defaultResponsibleId: string | null
  collaboratorAssigneeIds: string[]
  teamAssigneeIds: string[]
}): {
  plannedCollaboratorId: string | null
  plannedTeamId: string | null
  review: boolean
  warning?: string
} {
  if (input.defaultResponsibleId) {
    return {
      plannedCollaboratorId: input.defaultResponsibleId,
      plannedTeamId: null,
      review: false,
    }
  }

  const collaborators = input.collaboratorAssigneeIds ?? []
  if (collaborators.length === 1) {
    return {
      plannedCollaboratorId: collaborators[0],
      plannedTeamId: null,
      review: false,
    }
  }
  if (collaborators.length > 1) {
    return {
      plannedCollaboratorId: null,
      plannedTeamId: null,
      review: true,
      warning:
        'Múltiplos colaboradores atribuídos à atividade; revise o responsável planejado.',
    }
  }

  const teams = input.teamAssigneeIds ?? []
  if (teams.length === 1) {
    return {
      plannedCollaboratorId: null,
      plannedTeamId: teams[0],
      review: false,
    }
  }
  if (teams.length > 1) {
    return {
      plannedCollaboratorId: null,
      plannedTeamId: null,
      review: true,
      warning: 'Múltiplas equipes atribuídas à atividade; revise a equipe planejada.',
    }
  }

  return {
    plannedCollaboratorId: null,
    plannedTeamId: null,
    review: true,
    warning: 'Sem colaborador nem equipe definidos na atividade; defina o responsável planejado.',
  }
}

export function buildConveyorOperationalPlanGeneratedItems(
  input: BuildConveyorOperationalPlanGeneratedItemsInput,
): BuildConveyorOperationalPlanGeneratedItemsResult {
  const dailyCapacity = input.dailyCapacityMinutes
  if (!Number.isFinite(dailyCapacity) || dailyCapacity <= 0) {
    throw new Error('dailyCapacityMinutes must be a positive number')
  }
  const sorted = sortSteps(input.steps)
  const globalWarnings: string[] = []

  if (sorted.length === 0) {
    const start = formatIsoDate(nextBusinessDayOnOrAfter(parseIsoDate(input.plannedStartDate)))
    return {
      items: [],
      plannedEndDate: start,
      warnings: globalWarnings,
    }
  }

  let currentDate = nextBusinessDayOnOrAfter(parseIsoDate(input.plannedStartDate))
  let remainingInDay = dailyCapacity
  const items: ConveyorOperationalPlanGeneratedItem[] = []
  let plannedEndDate: string | null = null

  for (let order = 0; order < sorted.length; order += 1) {
    const step = sorted[order]
    const itemWarnings: string[] = []
    let reviewRequired = false

    const { minutes, review: minutesReview, warning: minutesWarning } = resolveMinutes(
      step.plannedMinutes,
    )
    if (minutesReview) {
      reviewRequired = true
      if (minutesWarning) itemWarnings.push(minutesWarning)
    }
    if (minutes > dailyCapacity) {
      reviewRequired = true
      itemWarnings.push(
        `Tempo previsto (${minutes} min) excede a capacidade diária simplificada (${dailyCapacity} min).`,
      )
    }

    const assigneeResolved = resolvePlannedAssignee({
      defaultResponsibleId: step.defaultResponsibleId,
      collaboratorAssigneeIds: step.collaboratorAssigneeIds,
      teamAssigneeIds: step.teamAssigneeIds,
    })
    if (assigneeResolved.review) {
      reviewRequired = true
      if (assigneeResolved.warning) itemWarnings.push(assigneeResolved.warning)
    }

    if (minutes > dailyCapacity) {
      // STEP inteiro em um único dia; não avança por capacidade antes de alocar.
    } else if (minutes > remainingInDay) {
      currentDate = nextBusinessDayAfter(currentDate)
      remainingInDay = dailyCapacity
    }

    const plannedDate = formatIsoDate(currentDate)
    plannedEndDate = plannedDate

    if (minutes > dailyCapacity) {
      remainingInDay = 0
    } else {
      remainingInDay -= minutes
    }

    const status: 'PLANNED' | 'NEEDS_REVIEW' = reviewRequired ? 'NEEDS_REVIEW' : 'PLANNED'

    items.push({
      activityNodeId: step.activityNodeId,
      plannedDate,
      plannedOrder: order,
      plannedMinutes: minutes,
      plannedCollaboratorId: assigneeResolved.plannedCollaboratorId,
      plannedTeamId: assigneeResolved.plannedTeamId,
      reviewRequired,
      status,
      warnings: itemWarnings,
    })
  }

  const reviewCount = items.filter((i) => i.reviewRequired).length
  if (reviewCount > 0) {
    globalWarnings.push(
      `${reviewCount} atividade(s) marcada(s) para revisão após a geração automática.`,
    )
  }

  return { items, plannedEndDate, warnings: globalWarnings }
}
