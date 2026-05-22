import { describe, expect, it, vi, afterEach } from 'vitest'
import { applyConveyorPlanValuesToWeekItem, getFactoryIntakeItems } from './operationalPlanningApiService'
import * as client from '../../lib/api/client'

describe('applyConveyorPlanValuesToWeekItem', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls apply-conveyor-plan-values endpoint', async () => {
    const spy = vi.spyOn(client, 'requestJson').mockResolvedValue({ hasPlan: false, week: {} })
    await applyConveyorPlanValuesToWeekItem('item-uuid-1')
    expect(spy).toHaveBeenCalledWith(
      'POST',
      '/api/v1/operational-planning/week-items/item-uuid-1/apply-conveyor-plan-values',
      { body: {} },
    )
  })
})

describe('getFactoryIntakeItems', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('calls factory-intake endpoint without query when weekStart omitted', async () => {
    const spy = vi.spyOn(client, 'requestJson').mockResolvedValue({ items: [] })
    await getFactoryIntakeItems()
    expect(spy).toHaveBeenCalledWith('GET', '/api/v1/operational-planning/factory-intake')
  })

  it('passes weekStart query param when provided', async () => {
    const spy = vi.spyOn(client, 'requestJson').mockResolvedValue({ items: [] })
    await getFactoryIntakeItems('2026-05-12')
    expect(spy).toHaveBeenCalledWith(
      'GET',
      '/api/v1/operational-planning/factory-intake?weekStart=2026-05-12',
    )
  })
})
