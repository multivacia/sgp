import type { ConveyorStructure } from '../conveyors/conveyor.types'
import type {
  ConveyorOperationalPlanItem,
  ConveyorPlanItemReviewReason,
} from './conveyor-operational-plan.types'

export const CONVEYOR_PLAN_REVIEW_REASON_LABELS: Record<string, string> = {
  MISSING_PLANNED_MINUTES: 'sem tempo previsto',
  ZERO_PLANNED_MINUTES: 'com tempo zerado',
  OVER_DAILY_CAPACITY: 'acima da capacidade diária',
  MULTIPLE_TEAMS: 'com múltiplas equipes',
  MISSING_ASSIGNEE: 'sem responsável planejado',
  MISSING_PLANNED_DATE: 'sem data planejada',
}

export function labelConveyorPlanReviewReason(code: string): string {
  return CONVEYOR_PLAN_REVIEW_REASON_LABELS[code] ?? code
}

export function formatConveyorPlanReviewReasons(reasons: ConveyorPlanItemReviewReason[]): string {
  if (reasons.length === 0) return ''
  return reasons.map((r) => r.message).join(' · ')
}

export type ConveyorPlanReviewSummary = {
  totalActive: number
  readyCount: number
  reviewCount: number
  totalPlannedMinutes: number
  firstPlannedDate: string | null
  lastPlannedDate: string | null
  reasonCounts: { code: string; label: string; count: number }[]
}

export function buildConveyorPlanReviewSummary(
  items: ConveyorOperationalPlanItem[],
): ConveyorPlanReviewSummary {
  const active = items.filter((i) => i.status !== 'CANCELLED')
  const reviewItems = active.filter((i) => i.reviewRequired)
  const totalPlannedMinutes = active.reduce((sum, i) => sum + (i.plannedMinutes ?? 0), 0)
  const dates = active
    .map((i) => i.plannedDate)
    .filter((d): d is string => Boolean(d))
    .sort()

  const reasonMap = new Map<string, number>()
  for (const item of reviewItems) {
    for (const reason of item.reviewReasons) {
      reasonMap.set(reason.code, (reasonMap.get(reason.code) ?? 0) + 1)
    }
  }

  const reasonCounts = [...reasonMap.entries()]
    .map(([code, count]) => ({
      code,
      label: labelConveyorPlanReviewReason(code),
      count,
    }))
    .sort((a, b) => b.count - a.count)

  return {
    totalActive: active.length,
    readyCount: active.length - reviewItems.length,
    reviewCount: reviewItems.length,
    totalPlannedMinutes,
    firstPlannedDate: dates[0] ?? null,
    lastPlannedDate: dates[dates.length - 1] ?? null,
    reasonCounts,
  }
}

export function canApproveConveyorOperationalPlan(
  items: ConveyorOperationalPlanItem[],
): boolean {
  const active = items.filter((i) => i.status !== 'CANCELLED')
  if (active.length === 0) return false
  return !active.some((i) => i.reviewRequired || i.status === 'NEEDS_REVIEW')
}

export type StepAssigneeOption = { id: string; label: string }

export function getStepTeamOptionsFromStructure(
  structure: ConveyorStructure,
  activityNodeId: string,
): StepAssigneeOption[] {
  for (const opt of structure.options) {
    for (const area of opt.areas) {
      for (const step of area.steps) {
        if (step.id !== activityNodeId) continue
        return (step.assignees ?? [])
          .filter((a) => a.type === 'TEAM' && a.teamId)
          .map((a) => ({
            id: a.teamId!,
            label: a.teamName?.trim() || a.teamId!,
          }))
      }
    }
  }
  return []
}

export function getStepCollaboratorOptionsFromStructure(
  structure: ConveyorStructure,
  activityNodeId: string,
): StepAssigneeOption[] {
  for (const opt of structure.options) {
    for (const area of opt.areas) {
      for (const step of area.steps) {
        if (step.id !== activityNodeId) continue
        return (step.assignees ?? [])
          .filter((a) => a.type === 'COLLABORATOR' && a.collaboratorId)
          .map((a) => ({
            id: a.collaboratorId!,
            label: a.collaboratorName?.trim() || a.collaboratorId!,
          }))
      }
    }
  }
  return []
}

export function itemHasReviewReason(
  item: ConveyorOperationalPlanItem,
  code: string,
): boolean {
  return item.reviewReasons.some((r) => r.code === code)
}

/** Destaque visual de campos de minutos na edição (usa capacidade do GET, não valor fixo). */
export function plannedMinutesNeedsReviewHighlight(
  plannedMinutes: number | '',
  dailyCapacityMinutes: number,
): boolean {
  if (plannedMinutes === '' || plannedMinutes === 0) return true
  return plannedMinutes > dailyCapacityMinutes
}
