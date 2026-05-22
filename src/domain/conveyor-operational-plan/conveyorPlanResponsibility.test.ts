import { describe, expect, it } from 'vitest'
import {
  formatConveyorPlanCurrentResponsibility,
  resolveConveyorOperationalPlanResponsibility,
} from './conveyorPlanResponsibility'
import type { ConveyorOperationalPlan } from './conveyor-operational-plan.types'

function plan(status: ConveyorOperationalPlan['status']): ConveyorOperationalPlan {
  return {
    id: 'p1',
    conveyorId: 'c1',
    status,
    plannedStartDate: null,
    plannedEndDate: null,
    version: 1,
    generatedAt: null,
    generatedBy: null,
    approvedAt: null,
    approvedBy: null,
    factoryPlanningStatus: null,
    notes: null,
    createdAt: '',
    updatedAt: '',
  }
}

describe('resolveConveyorOperationalPlanResponsibility', () => {
  it('returns conveyor manager without plan', () => {
    expect(resolveConveyorOperationalPlanResponsibility(null).label).toBe('Gestor da Esteira')
  })

  it('returns conveyor manager for DRAFT and APPROVED', () => {
    expect(resolveConveyorOperationalPlanResponsibility(plan('DRAFT')).label).toBe(
      'Gestor da Esteira',
    )
    expect(resolveConveyorOperationalPlanResponsibility(plan('APPROVED')).label).toBe(
      'Gestor da Esteira',
    )
  })

  it('returns factory manager when waiting or partially planned', () => {
    expect(
      resolveConveyorOperationalPlanResponsibility(plan('WAITING_FACTORY_PLANNING')).label,
    ).toBe('Gestor da Fábrica')
    expect(
      resolveConveyorOperationalPlanResponsibility(plan('PARTIALLY_PLANNED_IN_FACTORY')).label,
    ).toBe('Gestor da Fábrica')
  })

  it('returns execution when fully planned or in execution', () => {
    expect(
      resolveConveyorOperationalPlanResponsibility(plan('FULLY_PLANNED_IN_FACTORY')).label,
    ).toBe('Execução')
    expect(resolveConveyorOperationalPlanResponsibility(plan('IN_EXECUTION')).label).toBe(
      'Execução',
    )
  })

  it('returns closed for completed and cancelled', () => {
    expect(resolveConveyorOperationalPlanResponsibility(plan('COMPLETED')).label).toBe('Encerrado')
    expect(resolveConveyorOperationalPlanResponsibility(plan('CANCELLED')).label).toBe('Encerrado')
  })

  it('formats header label', () => {
    expect(formatConveyorPlanCurrentResponsibility(plan('WAITING_FACTORY_PLANNING'))).toBe(
      'Responsável atual: Gestor da Fábrica',
    )
  })
})
