import type pg from 'pg'
import {
  computeTimeEfficiencyMetrics,
  computeConveyorProgressMetrics,
  consolidateWeightedTimeEfficiency,
  sumMinutes,
} from '../../shared/conveyorProgressMetrics.js'
import type {
  ActivityProgressItemDto,
  ConveyorProgressItemDto,
  ConveyorProgressResponseDto,
  SectorProgressItemDto,
  TaskProgressItemDto,
  TimeEntryAnalyticalItemDto,
} from './conveyor-progress.dto.js'
import type { ConveyorProgressQuery } from './conveyor-progress.schemas.js'
import {
  listConveyorIdsForCollaboratorFilter,
  listConveyorsForProgress,
  listPrimaryAssigneesForConveyors,
  listStepHierarchyForConveyors,
  listTimeEntriesForConveyors,
} from './conveyor-progress.repository.js'

function metricsFromTotals(planned: number, realized: number) {
  return computeConveyorProgressMetrics(planned, realized)
}

function isCompletedStepStatus(status: string | null | undefined): boolean {
  return (status ?? '').trim().toUpperCase() === 'COMPLETED'
}

function buildActivityEfficiencyInput(activity: Pick<ActivityProgressItemDto, 'plannedMinutes' | 'realizedMinutes' | 'status'>) {
  return {
    plannedMinutes: activity.plannedMinutes,
    realizedMinutes: activity.realizedMinutes,
    isCompleted: isCompletedStepStatus(activity.status),
  }
}

function collectActivitiesFromSectors(
  sectors: readonly Pick<SectorProgressItemDto, 'activities'>[],
): ActivityProgressItemDto[] {
  return sectors.flatMap((sector) => sector.activities)
}

function collectActivitiesFromTasks(tasks: readonly TaskProgressItemDto[]): ActivityProgressItemDto[] {
  return tasks.flatMap((task) => collectActivitiesFromSectors(task.sectors))
}

function buildProgressTree(
  conveyors: Awaited<ReturnType<typeof listConveyorsForProgress>>,
  steps: Awaited<ReturnType<typeof listStepHierarchyForConveyors>>,
  timeEntries: Awaited<ReturnType<typeof listTimeEntriesForConveyors>>,
  assignees: Awaited<ReturnType<typeof listPrimaryAssigneesForConveyors>>,
): ConveyorProgressItemDto[] {
  const assigneeByStep = new Map(
    assignees.map((a) => [a.conveyor_node_id, a.collaborator_name]),
  )

  const entriesByStep = new Map<string, TimeEntryAnalyticalItemDto[]>()
  const realizedByStep = new Map<string, number>()

  for (const te of timeEntries) {
    const list = entriesByStep.get(te.conveyor_node_id) ?? []
    list.push({
      timeEntryId: te.id,
      entryDate: te.entry_at.toISOString(),
      collaboratorName: te.collaborator_name,
      durationMinutes: te.minutes,
      executedQuantity: te.executed_quantity,
      notes: te.notes,
      entryMode: te.entry_mode,
    })
    entriesByStep.set(te.conveyor_node_id, list)
    realizedByStep.set(
      te.conveyor_node_id,
      (realizedByStep.get(te.conveyor_node_id) ?? 0) + te.minutes,
    )
  }

  const stepsByConveyor = new Map<string, typeof steps>()
  for (const step of steps) {
    const list = stepsByConveyor.get(step.conveyor_id) ?? []
    list.push(step)
    stepsByConveyor.set(step.conveyor_id, list)
  }

  return conveyors.map((conveyor) => {
    const conveyorSteps = stepsByConveyor.get(conveyor.id) ?? []

    const taskMap = new Map<
      string,
      {
        taskId: string
        taskName: string
        taskOrder: number
        sectors: Map<
          string,
          {
            sectorId: string
            sectorName: string
            sectorOrder: number
            activities: ActivityProgressItemDto[]
          }
        >
      }
    >()

    for (const step of conveyorSteps) {
      const planned = step.planned_minutes ?? 0
      const realized = realizedByStep.get(step.step_id) ?? 0
      const activityMetrics = metricsFromTotals(planned, realized)
      const timeEfficiency = computeTimeEfficiencyMetrics({
        plannedMinutes: step.planned_minutes,
        realizedMinutes: realized,
        isCompleted: isCompletedStepStatus(step.operational_status),
      })

      const activity: ActivityProgressItemDto = {
        activityId: step.step_id,
        activityName: step.step_name,
        status: step.operational_status ?? 'PENDING',
        collaboratorName: assigneeByStep.get(step.step_id) ?? null,
        ...activityMetrics,
        timeEfficiency,
        timeEntries: entriesByStep.get(step.step_id) ?? [],
      }

      let task = taskMap.get(step.option_id)
      if (!task) {
        task = {
          taskId: step.option_id,
          taskName: step.option_name,
          taskOrder: step.option_order,
          sectors: new Map(),
        }
        taskMap.set(step.option_id, task)
      }

      let sector = task.sectors.get(step.area_id)
      if (!sector) {
        sector = {
          sectorId: step.area_id,
          sectorName: step.area_name,
          sectorOrder: step.area_order,
          activities: [],
        }
        task.sectors.set(step.area_id, sector)
      }
      sector.activities.push(activity)
    }

    const tasks: TaskProgressItemDto[] = [...taskMap.values()]
      .sort((a, b) => a.taskOrder - b.taskOrder)
      .map((task) => {
        const sectors: SectorProgressItemDto[] = [...task.sectors.values()]
          .sort((a, b) => a.sectorOrder - b.sectorOrder)
          .map((sector) => {
            const planned = sumMinutes(sector.activities.map((a) => a.plannedMinutes))
            const realized = sumMinutes(sector.activities.map((a) => a.realizedMinutes))
            return {
              sectorId: sector.sectorId,
              sectorName: sector.sectorName,
              ...metricsFromTotals(planned, realized),
              timeEfficiency: consolidateWeightedTimeEfficiency(
                sector.activities.map(buildActivityEfficiencyInput),
              ),
              activities: sector.activities,
            }
          })

        const planned = sumMinutes(sectors.map((s) => s.plannedMinutes))
        const realized = sumMinutes(sectors.map((s) => s.realizedMinutes))
        const activities = collectActivitiesFromSectors(sectors)
        return {
          taskId: task.taskId,
          taskName: task.taskName,
          ...metricsFromTotals(planned, realized),
          timeEfficiency: consolidateWeightedTimeEfficiency(
            activities.map(buildActivityEfficiencyInput),
          ),
          sectors,
        }
      })

    const planned = sumMinutes(tasks.map((t) => t.plannedMinutes))
    const realized = sumMinutes(tasks.map((t) => t.realizedMinutes))
    const activities = collectActivitiesFromTasks(tasks)

    return {
      conveyorId: conveyor.id,
      conveyorCode: conveyor.code,
      conveyorName: conveyor.name,
      operationalStatus: conveyor.operational_status,
      ...metricsFromTotals(planned, realized),
      timeEfficiency: consolidateWeightedTimeEfficiency(
        activities.map(buildActivityEfficiencyInput),
      ),
      tasks,
    }
  })
}

export async function serviceConveyorProgress(
  pool: pg.Pool,
  query: ConveyorProgressQuery,
): Promise<ConveyorProgressResponseDto> {
  const emptySummary = {
    timeEfficiency: consolidateWeightedTimeEfficiency([]),
  }
  const filters = {
    search: query.search,
    operationalStatus: query.operationalStatus,
    timeEntryFrom: query.timeEntryFrom,
    timeEntryTo: query.timeEntryTo,
    collaboratorId: query.collaboratorId,
  }

  let conveyors = await listConveyorsForProgress(pool, filters)
  if (conveyors.length === 0) {
    return { items: [], summary: emptySummary }
  }

  let conveyorIds = conveyors.map((c) => c.id)

  if (query.collaboratorId) {
    const allowed = await listConveyorIdsForCollaboratorFilter(
      pool,
      conveyorIds,
      query.collaboratorId,
    )
    conveyors = conveyors.filter((c) => allowed.has(c.id))
    conveyorIds = conveyors.map((c) => c.id)
    if (conveyorIds.length === 0) {
      return { items: [], summary: emptySummary }
    }
  }

  const [steps, timeEntries, assignees] = await Promise.all([
    listStepHierarchyForConveyors(pool, conveyorIds),
    listTimeEntriesForConveyors(pool, conveyorIds, filters),
    listPrimaryAssigneesForConveyors(pool, conveyorIds),
  ])

  let items = buildProgressTree(conveyors, steps, timeEntries, assignees)

  if (query.onlyExceeded) {
    items = items.filter((item) => item.exceededMinutes > 0)
  }

  return {
    items,
    summary: {
      timeEfficiency: consolidateWeightedTimeEfficiency(
        items.flatMap((item) => collectActivitiesFromTasks(item.tasks)).map(buildActivityEfficiencyInput),
      ),
    },
  }
}
