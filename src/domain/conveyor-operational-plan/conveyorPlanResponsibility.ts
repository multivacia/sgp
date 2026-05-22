import type { ConveyorOperationalPlan } from './conveyor-operational-plan.types'

export type ConveyorPlanResponsibilityRole =
  | 'CONVEYOR_MANAGER'
  | 'FACTORY_MANAGER'
  | 'EXECUTION'
  | 'CLOSED'
  | 'NONE'

export type ConveyorOperationalPlanResponsibility = {
  role: ConveyorPlanResponsibilityRole
  /** Rótulo curto para o cabeçalho: "Responsável atual: …" */
  label: string
}

export function resolveConveyorOperationalPlanResponsibility(
  plan: ConveyorOperationalPlan | null,
): ConveyorOperationalPlanResponsibility {
  if (!plan) {
    return { role: 'CONVEYOR_MANAGER', label: 'Gestor da Esteira' }
  }

  switch (plan.status) {
    case 'DRAFT':
    case 'APPROVED':
      return { role: 'CONVEYOR_MANAGER', label: 'Gestor da Esteira' }
    case 'WAITING_FACTORY_PLANNING':
    case 'PARTIALLY_PLANNED_IN_FACTORY':
      return { role: 'FACTORY_MANAGER', label: 'Gestor da Fábrica' }
    case 'FULLY_PLANNED_IN_FACTORY':
    case 'IN_EXECUTION':
      return { role: 'EXECUTION', label: 'Execução' }
    case 'COMPLETED':
    case 'CANCELLED':
      return { role: 'CLOSED', label: 'Encerrado' }
    default:
      return { role: 'NONE', label: '—' }
  }
}

export function formatConveyorPlanCurrentResponsibility(
  plan: ConveyorOperationalPlan | null,
): string {
  const { label } = resolveConveyorOperationalPlanResponsibility(plan)
  return `Responsável atual: ${label}`
}
