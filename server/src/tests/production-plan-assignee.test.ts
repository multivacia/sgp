import { afterEach, describe, expect, it, vi } from 'vitest'
import type pg from 'pg'
import { DatabaseError } from 'pg'
import * as assigneeRepo from '../modules/conveyors/conveyorAssignments.repository.js'
import {
  PRODUCTION_PUBLISHED_PLAN_ASSIGNEE_METADATA,
  resolveProductionStepAssigneeId,
} from '../modules/production/production-plan-assignee.js'

const POOL = {} as pg.Pool
const CONVEYOR_ID = '11111111-1111-1111-1111-111111111101'
const STEP_ID = '11111111-1111-1111-1111-111111111102'
const MARIA_ID = '11111111-1111-1111-1111-111111111103'
const GABRIEL_ID = '11111111-1111-1111-1111-111111111104'

describe('resolveProductionStepAssigneeId', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reutiliza assignee existente do colaborador (principal)', async () => {
    vi.spyOn(assigneeRepo, 'findAssigneeIdForStepAndCollaborator').mockResolvedValue(
      'assignee-primary',
    )
    const insert = vi.spyOn(assigneeRepo, 'insertConveyorNodeAssignee')

    const id = await resolveProductionStepAssigneeId(POOL, {
      conveyorId: CONVEYOR_ID,
      stepNodeId: STEP_ID,
      collaboratorId: MARIA_ID,
    })

    expect(id).toBe('assignee-primary')
    expect(insert).not.toHaveBeenCalled()
  })

  it('cria assignee não principal quando há plano publicado e outro é principal', async () => {
    vi.spyOn(assigneeRepo, 'findAssigneeIdForStepAndCollaborator').mockResolvedValue(null)
    vi.spyOn(assigneeRepo, 'findPublishedPlanItemIdForCollaboratorOnStep').mockResolvedValue(
      'plan-item-1',
    )
    vi.spyOn(assigneeRepo, 'maxAssigneeOrderIndexForStep').mockResolvedValue(0)
    const insert = vi
      .spyOn(assigneeRepo, 'insertConveyorNodeAssignee')
      .mockResolvedValue({ id: 'assignee-support' })

    const id = await resolveProductionStepAssigneeId(POOL, {
      conveyorId: CONVEYOR_ID,
      stepNodeId: STEP_ID,
      collaboratorId: GABRIEL_ID,
    })

    expect(id).toBe('assignee-support')
    expect(insert).toHaveBeenCalledWith(
      POOL,
      expect.objectContaining({
        conveyor_id: CONVEYOR_ID,
        conveyor_node_id: STEP_ID,
        collaborator_id: GABRIEL_ID,
        is_primary: false,
        order_index: 1,
        metadata_json: PRODUCTION_PUBLISHED_PLAN_ASSIGNEE_METADATA,
      }),
    )
  })

  it('reutiliza assignee não principal já existente', async () => {
    vi.spyOn(assigneeRepo, 'findAssigneeIdForStepAndCollaborator').mockResolvedValue(
      'assignee-existing-support',
    )
    const insert = vi.spyOn(assigneeRepo, 'insertConveyorNodeAssignee')

    const id = await resolveProductionStepAssigneeId(POOL, {
      conveyorId: CONVEYOR_ID,
      stepNodeId: STEP_ID,
      collaboratorId: GABRIEL_ID,
    })

    expect(id).toBe('assignee-existing-support')
    expect(insert).not.toHaveBeenCalled()
  })

  it('idempotência: unique violation após corrida retorna assignee existente', async () => {
    vi.spyOn(assigneeRepo, 'findAssigneeIdForStepAndCollaborator')
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce('assignee-after-race')
    vi.spyOn(assigneeRepo, 'findPublishedPlanItemIdForCollaboratorOnStep').mockResolvedValue(
      'plan-item-1',
    )
    vi.spyOn(assigneeRepo, 'maxAssigneeOrderIndexForStep').mockResolvedValue(1)
    const err = new DatabaseError('duplicate', 0, 'error')
    err.code = '23505'
    vi.spyOn(assigneeRepo, 'insertConveyorNodeAssignee').mockRejectedValue(err)

    const id = await resolveProductionStepAssigneeId(POOL, {
      conveyorId: CONVEYOR_ID,
      stepNodeId: STEP_ID,
      collaboratorId: GABRIEL_ID,
    })

    expect(id).toBe('assignee-after-race')
    expect(assigneeRepo.findAssigneeIdForStepAndCollaborator).toHaveBeenCalledTimes(2)
  })

  it('sem plano publicado → null', async () => {
    vi.spyOn(assigneeRepo, 'findAssigneeIdForStepAndCollaborator').mockResolvedValue(null)
    vi.spyOn(assigneeRepo, 'findPublishedPlanItemIdForCollaboratorOnStep').mockResolvedValue(
      null,
    )
    const insert = vi.spyOn(assigneeRepo, 'insertConveyorNodeAssignee')

    const id = await resolveProductionStepAssigneeId(POOL, {
      conveyorId: CONVEYOR_ID,
      stepNodeId: STEP_ID,
      collaboratorId: GABRIEL_ID,
    })

    expect(id).toBeNull()
    expect(insert).not.toHaveBeenCalled()
  })

  it('segunda chamada reutiliza assignee sem novo insert', async () => {
    const find = vi.spyOn(assigneeRepo, 'findAssigneeIdForStepAndCollaborator')
    find.mockResolvedValueOnce(null).mockResolvedValueOnce('assignee-1')
    vi.spyOn(assigneeRepo, 'findPublishedPlanItemIdForCollaboratorOnStep').mockResolvedValue(
      'plan-item-1',
    )
    vi.spyOn(assigneeRepo, 'maxAssigneeOrderIndexForStep').mockResolvedValue(0)
    const insert = vi
      .spyOn(assigneeRepo, 'insertConveyorNodeAssignee')
      .mockResolvedValue({ id: 'assignee-1' })

    const first = await resolveProductionStepAssigneeId(POOL, {
      conveyorId: CONVEYOR_ID,
      stepNodeId: STEP_ID,
      collaboratorId: GABRIEL_ID,
    })
    const second = await resolveProductionStepAssigneeId(POOL, {
      conveyorId: CONVEYOR_ID,
      stepNodeId: STEP_ID,
      collaboratorId: GABRIEL_ID,
    })

    expect(first).toBe('assignee-1')
    expect(second).toBe('assignee-1')
    expect(insert).toHaveBeenCalledTimes(1)
  })
})
