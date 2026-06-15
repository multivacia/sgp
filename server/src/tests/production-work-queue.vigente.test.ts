import { afterEach, describe, expect, it, vi } from 'vitest'
import type pg from 'pg'
import * as queueService from '../modules/my-work-queue/my-work-queue.service.js'
import { serviceGetProductionWorkQueue } from '../modules/production/production-work-queue.service.js'

const COLLABORATOR_ID = '00000000-0000-0000-0000-000000000002'

describe('serviceGetProductionWorkQueue — plano vigente', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('solicita somente itens PLANNED do plano publicado da semana', async () => {
    const spy = vi.spyOn(queueService, 'serviceGetWorkQueueForCollaborator').mockResolvedValue({
      date: '2026-06-02',
      planStatus: 'PUBLISHED',
      summary: {
        plannedItemsToday: 0,
        plannedMinutesToday: 0,
        overdueItems: 0,
        completedItemsToday: 0,
        outOfSequenceItems: 0,
        unassignedExceptionItems: 0,
        capacityMinutesToday: 0,
        overload: false,
      },
      items: [],
    })

    await serviceGetProductionWorkQueue({} as pg.Pool, {
      collaboratorId: COLLABORATOR_ID,
      date: '2026-06-02',
      includePastDue: true,
    })

    expect(spy).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        collaboratorId: COLLABORATOR_ID,
        listOptions: { planItemStatuses: ['PLANNED'] },
      }),
    )
  })
})
