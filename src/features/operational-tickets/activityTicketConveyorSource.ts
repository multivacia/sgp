import type {
  ConveyorDetail,
  ConveyorStructureStepAssignee,
} from '../../domain/conveyors/conveyor.types'
import type { ConveyorNodeWorkload } from '../../domain/conveyors/conveyorNodeWorkload.types'
import { isStepOperationallyCompleted } from '../../domain/conveyors/stepOperationalStatus'
import type { ActivityTicketPrintModelInput } from './activityTicketPrintModel'
import { normalizeTicketText } from './activityTicketPrintModel'

/** Fonte allowlisted de uma atividade da estrutura da esteira (ordem da árvore preservada). */
export type ConveyorActivityTicketSource = ActivityTicketPrintModelInput & {
  sortTaskOrder: number
  sortAreaOrder: number
  sortStepOrder: number
}

export function resolveStepAssigneeFields(
  assignees: readonly ConveyorStructureStepAssignee[] | undefined,
): Pick<ActivityTicketPrintModelInput, 'responsibleName' | 'teamName'> {
  const list = assignees ?? []
  if (list.length === 0) return {}

  const primary = list.find((a) => a.isPrimary) ?? list[0]

  if (primary.type === 'COLLABORATOR') {
    const name = normalizeTicketText(primary.collaboratorName)
    if (name) return { responsibleName: name }
  }

  if (primary.type === 'TEAM') {
    const team = normalizeTicketText(primary.teamName)
    if (team) return { teamName: team }
  }

  const collaborator = list.find((a) => normalizeTicketText(a.collaboratorName))
  const collabName = normalizeTicketText(collaborator?.collaboratorName)
  if (collabName) return { responsibleName: collabName }

  const teamRow = list.find((a) => normalizeTicketText(a.teamName))
  const teamName = normalizeTicketText(teamRow?.teamName)
  if (teamName) return { teamName }

  return {}
}

function buildWorkloadRealizedLookup(
  workload: ConveyorNodeWorkload | null | undefined,
): ReadonlyMap<string, number> {
  const map = new Map<string, number>()
  for (const step of workload?.steps ?? []) {
    const id = step.stepId?.trim()
    if (!id) continue
    map.set(id, Math.max(0, Math.floor(step.realizedMinutes ?? 0)))
  }
  return map
}

function resolveConveyorVehicleRef(detail: ConveyorDetail): string | undefined {
  return normalizeTicketText(detail.vehicle)
}

function resolveConveyorTitle(detail: ConveyorDetail): string {
  return normalizeTicketText(detail.name) ?? 'Esteira'
}

export function collectConveyorActivityTicketSources(
  detail: ConveyorDetail,
  workload?: ConveyorNodeWorkload | null,
): ConveyorActivityTicketSource[] {
  const realizedLookup = buildWorkloadRealizedLookup(workload)
  const conveyorTitle = resolveConveyorTitle(detail)
  const conveyorCode = normalizeTicketText(detail.code)
  const conveyorVehicleRef = resolveConveyorVehicleRef(detail)
  const sources: ConveyorActivityTicketSource[] = []

  const options = [...detail.structure.options].sort((a, b) => a.orderIndex - b.orderIndex)

  for (const opt of options) {
    const areas = [...opt.areas].sort((a, b) => a.orderIndex - b.orderIndex)
    for (const area of areas) {
      const steps = [...area.steps].sort((a, b) => a.orderIndex - b.orderIndex)
      for (const step of steps) {
        const assigneeFields = resolveStepAssigneeFields(step.assignees)
        const realizedMinutes = realizedLookup.get(step.id)

        const input: ConveyorActivityTicketSource = {
          conveyorId: detail.id,
          conveyorTitle,
          activityNodeId: step.id,
          activityTitle: normalizeTicketText(step.name) ?? 'Atividade',
          taskTitle: normalizeTicketText(opt.name),
          sectorTitle: normalizeTicketText(area.name),
          plannedMinutes: step.plannedMinutes,
          realizedMinutes: realizedMinutes ?? null,
          activityOperationalStatus: step.operationalStatus,
          sortTaskOrder: opt.orderIndex,
          sortAreaOrder: area.orderIndex,
          sortStepOrder: step.orderIndex,
          ...assigneeFields,
        }

        if (conveyorCode) input.conveyorCode = conveyorCode
        if (conveyorVehicleRef) input.conveyorVehicleRef = conveyorVehicleRef

        sources.push(input)
      }
    }
  }

  return sources
}

export function isConveyorActivityTicketSourceCompleted(
  source: Pick<ActivityTicketPrintModelInput, 'activityOperationalStatus'>,
): boolean {
  const status = source.activityOperationalStatus?.trim()
  if (!status) return false
  return isStepOperationallyCompleted({
    operationalStatus: status as 'COMPLETED',
  })
}

export function filterConveyorActivityTicketSources(
  sources: readonly ConveyorActivityTicketSource[],
  includeCompleted: boolean,
): ConveyorActivityTicketSource[] {
  if (includeCompleted) return [...sources]
  return sources.filter((source) => !isConveyorActivityTicketSourceCompleted(source))
}
