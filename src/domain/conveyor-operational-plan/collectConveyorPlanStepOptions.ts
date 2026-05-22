import type { ConveyorStructure } from '../conveyors/conveyor.types'

export type ConveyorPlanStepOption = {
  id: string
  label: string
  plannedMinutes: number | null
  operationalStatus: string
}

/** STEPs ativos da estrutura para seleção no plano operacional. */
export function collectConveyorPlanStepOptions(
  structure: ConveyorStructure,
): ConveyorPlanStepOption[] {
  const out: ConveyorPlanStepOption[] = []
  for (const opt of structure.options) {
    for (const area of opt.areas) {
      for (const step of area.steps) {
        out.push({
          id: step.id,
          label: `${opt.name} › ${area.name} › ${step.name}`,
          plannedMinutes: step.plannedMinutes,
          operationalStatus: step.operationalStatus,
        })
      }
    }
  }
  return out
}
