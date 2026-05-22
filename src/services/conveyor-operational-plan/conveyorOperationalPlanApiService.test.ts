import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  approveConveyorOperationalPlan,
  createConveyorOperationalPlan,
  generateConveyorOperationalPlanItems,
  previewConveyorOperationalPlanGeneratedItems,
  getConveyorOperationalPlan,
  sendConveyorOperationalPlanToFactory,
  updateConveyorOperationalPlanItem,
} from './conveyorOperationalPlanApiService'

const CONVEYOR_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
const PLAN_ID = 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff'
const ITEM_ID = 'cccccccc-dddd-eeee-ffff-000000000001'

describe('conveyorOperationalPlanApiService routes', () => {
  const originalFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.unstubAllEnvs()
  })

  it('GET operational-plan uses conveyor path and reads hasPlan meta', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const u = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      expect(u).toContain(`/api/v1/conveyors/${CONVEYOR_ID}/operational-plan`)
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            data: null,
            meta: { hasPlan: false },
          }),
      } as Response
    })

    const res = await getConveyorOperationalPlan(CONVEYOR_ID)
    expect(res.hasPlan).toBe(false)
    expect(res.data).toBeNull()
  })

  it('POST create plan', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const u = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      expect(u).toContain(`/operational-plan`)
      expect(init?.method).toBe('POST')
      return {
        ok: true,
        status: 201,
        text: async () =>
          JSON.stringify({
            data: {
              plan: { id: PLAN_ID, status: 'DRAFT', conveyorId: CONVEYOR_ID },
              items: [],
              dailyCapacityMinutes: 480,
            },
            meta: { hasPlan: true },
          }),
      } as Response
    })

    const data = await createConveyorOperationalPlan(CONVEYOR_ID, {})
    expect(data.plan.status).toBe('DRAFT')
  })

  it('POST approve uses approve suffix', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const u = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      expect(u).toContain(`/operational-plan/${PLAN_ID}/approve`)
      expect(init?.method).toBe('POST')
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            data: {
              plan: { id: PLAN_ID, status: 'APPROVED', conveyorId: CONVEYOR_ID },
              items: [],
              dailyCapacityMinutes: 480,
            },
            meta: {},
          }),
      } as Response
    })

    const data = await approveConveyorOperationalPlan(CONVEYOR_ID, PLAN_ID)
    expect(data.plan.status).toBe('APPROVED')
  })

  it('POST generate-items/preview uses preview suffix', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const u = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      expect(u).toContain(`/operational-plan/${PLAN_ID}/generate-items/preview`)
      expect(init?.method).toBe('POST')
      const body = JSON.parse(String(init?.body))
      expect(body).toEqual({ plannedStartDate: '2026-06-01' })
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            data: {
              plannedStartDate: '2026-06-01',
              plannedEndDate: '2026-06-03',
              dailyCapacityMinutes: 480,
              existingActiveItemsCount: 2,
              existingGeneratedItemsCount: 1,
              existingManualItemsCount: 1,
              existingReviewedItemsCount: 0,
              existingReviewRequiredItemsCount: 0,
              generatedItemsCount: 5,
              generatedReviewRequiredItemsCount: 1,
              hasExistingItems: true,
              hasManualItems: true,
              hasReviewedItems: false,
              warnings: [],
            },
            meta: {},
          }),
      } as Response
    })

    const data = await previewConveyorOperationalPlanGeneratedItems(CONVEYOR_ID, PLAN_ID, {
      plannedStartDate: '2026-06-01',
    })
    expect(data.hasManualItems).toBe(true)
    expect(data.generatedItemsCount).toBe(5)
  })

  it('POST generate-items sends plannedStartDate and overwrite', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const u = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      expect(u).toContain(`/operational-plan/${PLAN_ID}/generate-items`)
      expect(init?.method).toBe('POST')
      const body = JSON.parse(String(init?.body))
      expect(body).toEqual({ plannedStartDate: '2026-06-01', overwrite: true })
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            data: {
              plan: { id: PLAN_ID, status: 'DRAFT', conveyorId: CONVEYOR_ID },
              items: [],
              dailyCapacityMinutes: 480,
            },
            meta: {},
          }),
      } as Response
    })

    await generateConveyorOperationalPlanItems(CONVEYOR_ID, PLAN_ID, {
      plannedStartDate: '2026-06-01',
      overwrite: true,
    })
  })

  it('PATCH item sends body fields', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const u = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      expect(u).toContain(`/operational-plan/${PLAN_ID}/items/${ITEM_ID}`)
      expect(init?.method).toBe('PATCH')
      const body = JSON.parse(String(init?.body))
      expect(body).toEqual({
        plannedDate: '2026-06-02',
        plannedMinutes: 90,
        notes: 'Ajuste',
      })
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            data: {
              plan: { id: PLAN_ID, status: 'DRAFT', conveyorId: CONVEYOR_ID },
              items: [],
              dailyCapacityMinutes: 480,
            },
            meta: {},
          }),
      } as Response
    })

    await updateConveyorOperationalPlanItem(CONVEYOR_ID, PLAN_ID, ITEM_ID, {
      plannedDate: '2026-06-02',
      plannedMinutes: 90,
      notes: 'Ajuste',
    })
  })

  it('PATCH item sends plannedOrder and status', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    globalThis.fetch = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body))
      expect(body).toEqual({ plannedOrder: 2, status: 'CANCELLED' })
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            data: {
              plan: { id: PLAN_ID, status: 'DRAFT', conveyorId: CONVEYOR_ID },
              items: [],
              dailyCapacityMinutes: 480,
            },
            meta: {},
          }),
      } as Response
    })

    await updateConveyorOperationalPlanItem(CONVEYOR_ID, PLAN_ID, ITEM_ID, {
      plannedOrder: 2,
      status: 'CANCELLED',
    })
  })

  it('POST send-to-factory', async () => {
    vi.stubEnv('VITE_API_BASE_URL', '')
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const u = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
      expect(u).toContain(`/send-to-factory`)
      expect(init?.method).toBe('POST')
      return {
        ok: true,
        status: 200,
        text: async () =>
          JSON.stringify({
            data: {
              plan: {
                id: PLAN_ID,
                status: 'WAITING_FACTORY_PLANNING',
                conveyorId: CONVEYOR_ID,
              },
              items: [],
              dailyCapacityMinutes: 480,
            },
            meta: {},
          }),
      } as Response
    })

    const data = await sendConveyorOperationalPlanToFactory(CONVEYOR_ID, PLAN_ID)
    expect(data.plan.status).toBe('WAITING_FACTORY_PLANNING')
  })
})
