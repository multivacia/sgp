export type CollaboratorPlanningCapacityStatus =
  | 'SEM_CAPACIDADE_CADASTRADA'
  | 'DISPONIVEL'
  | 'PROXIMO_DO_LIMITE'
  | 'ACIMA_DA_CAPACIDADE'
  | 'SOBRECARGA_CRITICA'

export type CollaboratorPlanningCapacitySummary = {
  collaboratorId: string
  collaboratorName: string
  capacityMinutes: number | null
  plannedMinutes: number
  availableMinutes: number | null
  overloadMinutes: number
  occupancyPct: number | null
  status: CollaboratorPlanningCapacityStatus
}

export type CollaboratorPlanningCapacityAggregateSummary = {
  collaboratorsCount: number
  totalPlannedMinutes: number
  totalOverloadMinutes: number
  byStatus: Record<CollaboratorPlanningCapacityStatus, number>
}

export type OperationalPlanningCapacityItemInput = {
  collaboratorId: string | null
  collaboratorName: string | null
  plannedDate: string
  plannedMinutes: number | null
  status: string | null
}

export type OperationalPlanningExplicitCapacityInput = {
  collaboratorId: string
  date: string
  explicitDailyMinutes: number | null
}

export type OperationalPlanningCapacityBlock = {
  summary: CollaboratorPlanningCapacityAggregateSummary
  collaborators: CollaboratorPlanningCapacitySummary[]
}

const EMPTY_STATUS_COUNTS: Record<CollaboratorPlanningCapacityStatus, number> = {
  SEM_CAPACIDADE_CADASTRADA: 0,
  DISPONIVEL: 0,
  PROXIMO_DO_LIMITE: 0,
  ACIMA_DA_CAPACIDADE: 0,
  SOBRECARGA_CRITICA: 0,
}

function normalizeMinutes(value: number | null | undefined): number {
  if (value == null || !Number.isFinite(value)) return 0
  return Math.max(0, Math.floor(value))
}

function roundPct(value: number): number {
  return Math.round(value * 10) / 10
}

function isActivePlanningItem(
  item: OperationalPlanningCapacityItemInput,
  weekdayDatesSet: ReadonlySet<string>,
): item is OperationalPlanningCapacityItemInput & { collaboratorId: string } {
  const collaboratorId = item.collaboratorId?.trim()
  if (!collaboratorId) return false
  if (!weekdayDatesSet.has(item.plannedDate)) return false
  const status = item.status?.trim().toUpperCase()
  return status !== 'CANCELLED' && status !== 'REMOVED'
}

export function classifyCollaboratorPlanningCapacityStatus(input: {
  capacityMinutes: number | null
  occupancyPct: number | null
  missingExplicitCapacity: boolean
}): CollaboratorPlanningCapacityStatus {
  if (
    input.missingExplicitCapacity ||
    input.capacityMinutes == null ||
    input.capacityMinutes <= 0 ||
    input.occupancyPct == null
  ) {
    return 'SEM_CAPACIDADE_CADASTRADA'
  }
  if (input.occupancyPct < 90) return 'DISPONIVEL'
  if (input.occupancyPct <= 100) return 'PROXIMO_DO_LIMITE'
  if (input.occupancyPct <= 110) return 'ACIMA_DA_CAPACIDADE'
  return 'SOBRECARGA_CRITICA'
}

export function buildOperationalPlanningCapacityBlock(input: {
  weekdayDates: readonly string[]
  items: readonly OperationalPlanningCapacityItemInput[]
  explicitCapacityByCollaboratorDay: readonly OperationalPlanningExplicitCapacityInput[]
}): OperationalPlanningCapacityBlock {
  const weekdayDatesSet = new Set(input.weekdayDates)
  const capacityByKey = new Map<string, number | null>()
  for (const entry of input.explicitCapacityByCollaboratorDay) {
    capacityByKey.set(`${entry.collaboratorId}|${entry.date}`, entry.explicitDailyMinutes)
  }

  const collaboratorAggregates = new Map<
    string,
    { collaboratorName: string; plannedMinutes: number }
  >()

  for (const item of input.items) {
    if (!isActivePlanningItem(item, weekdayDatesSet)) continue
    const collaboratorId = item.collaboratorId.trim()
    const current = collaboratorAggregates.get(collaboratorId)
    const collaboratorName = item.collaboratorName?.trim() || current?.collaboratorName || collaboratorId
    collaboratorAggregates.set(collaboratorId, {
      collaboratorName,
      plannedMinutes: (current?.plannedMinutes ?? 0) + normalizeMinutes(item.plannedMinutes),
    })
  }

  const collaborators = [...collaboratorAggregates.entries()]
    .map(([collaboratorId, aggregate]) => {
      const explicitDailyCapacities: Array<number | null> = input.weekdayDates.map((date) => {
        const key = `${collaboratorId}|${date}`
        return capacityByKey.has(key) ? (capacityByKey.get(key) ?? null) : null
      })
      const missingExplicitCapacity = explicitDailyCapacities.some((value) => value == null)

      if (missingExplicitCapacity) {
        return {
          collaboratorId,
          collaboratorName: aggregate.collaboratorName,
          capacityMinutes: null,
          plannedMinutes: aggregate.plannedMinutes,
          availableMinutes: null,
          overloadMinutes: 0,
          occupancyPct: null,
          status: 'SEM_CAPACIDADE_CADASTRADA' as const,
        }
      }

      let capacityMinutes = 0
      for (const value of explicitDailyCapacities) {
        capacityMinutes += normalizeMinutes(value)
      }

      if (capacityMinutes <= 0) {
        return {
          collaboratorId,
          collaboratorName: aggregate.collaboratorName,
          capacityMinutes: null,
          plannedMinutes: aggregate.plannedMinutes,
          availableMinutes: null,
          overloadMinutes: 0,
          occupancyPct: null,
          status: 'SEM_CAPACIDADE_CADASTRADA' as const,
        }
      }

      const overloadMinutes = Math.max(aggregate.plannedMinutes - capacityMinutes, 0)
      const availableMinutes = Math.max(capacityMinutes - aggregate.plannedMinutes, 0)
      const occupancyPct = roundPct((aggregate.plannedMinutes / capacityMinutes) * 100)

      return {
        collaboratorId,
        collaboratorName: aggregate.collaboratorName,
        capacityMinutes,
        plannedMinutes: aggregate.plannedMinutes,
        availableMinutes,
        overloadMinutes,
        occupancyPct,
        status: classifyCollaboratorPlanningCapacityStatus({
          capacityMinutes,
          occupancyPct,
          missingExplicitCapacity: false,
        }),
      }
    })
    .sort(
      (a, b) =>
        a.collaboratorName.localeCompare(b.collaboratorName, 'pt-BR') ||
        a.collaboratorId.localeCompare(b.collaboratorId),
    )

  const byStatus = { ...EMPTY_STATUS_COUNTS }
  let totalPlannedMinutes = 0
  let totalOverloadMinutes = 0

  for (const collaborator of collaborators) {
    byStatus[collaborator.status] += 1
    totalPlannedMinutes += collaborator.plannedMinutes
    totalOverloadMinutes += collaborator.overloadMinutes
  }

  return {
    summary: {
      collaboratorsCount: collaborators.length,
      totalPlannedMinutes,
      totalOverloadMinutes,
      byStatus,
    },
    collaborators,
  }
}
