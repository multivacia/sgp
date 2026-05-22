import type pg from 'pg'
import {
  deriveConveyorPlanFactorySyncState,
  type ConveyorPlanFactorySyncStatus,
} from './deriveConveyorPlanFactorySyncState.js'
import {
  listConveyorPlanItemsForSyncRefresh,
  listLinkedFactoryItemsForConveyorPlan,
  recalculateConveyorPlanFactoryStatuses,
  updateConveyorPlanItemSyncFields,
  type ConveyorPlanItemSyncRefreshRow,
  type LinkedFactoryItemSyncRow,
} from './conveyor-operational-plan.repository.js'

function resolveFactoryItemForPlanItem(
  planItem: ConveyorPlanItemSyncRefreshRow,
  byConveyorItemId: Map<string, LinkedFactoryItemSyncRow>,
  byFactoryItemId: Map<string, LinkedFactoryItemSyncRow>,
): LinkedFactoryItemSyncRow | null {
  const fromConveyor = byConveyorItemId.get(planItem.id)
  if (fromConveyor) return fromConveyor
  if (planItem.origin_work_plan_item_id) {
    return byFactoryItemId.get(planItem.origin_work_plan_item_id) ?? null
  }
  return null
}

function hasFactoryLink(
  planItem: ConveyorPlanItemSyncRefreshRow,
  factoryItem: LinkedFactoryItemSyncRow | null,
): boolean {
  return Boolean(planItem.origin_work_plan_item_id) || factoryItem != null
}

/** Recalcula e persiste sync_status / review_required dos itens vinculados de um plano da esteira. */
export async function refreshConveyorOperationalPlanSyncStatus(
  client: pg.PoolClient,
  planId: string,
): Promise<void> {
  const planItems = await listConveyorPlanItemsForSyncRefresh(client, planId)
  if (planItems.length === 0) return

  const factoryItems = await listLinkedFactoryItemsForConveyorPlan(client, planId)
  const byConveyorItemId = new Map<string, LinkedFactoryItemSyncRow>()
  const byFactoryItemId = new Map<string, LinkedFactoryItemSyncRow>()
  for (const row of factoryItems) {
    if (row.conveyor_operational_plan_item_id) {
      byConveyorItemId.set(row.conveyor_operational_plan_item_id, row)
    }
    byFactoryItemId.set(row.id, row)
  }

  for (const planItem of planItems) {
    const factoryItem = resolveFactoryItemForPlanItem(planItem, byConveyorItemId, byFactoryItemId)
    const linked = hasFactoryLink(planItem, factoryItem)

    const derived = deriveConveyorPlanFactorySyncState({
      planItem: {
        plannedDate: planItem.planned_date,
        plannedMinutes: planItem.planned_minutes,
        plannedCollaboratorId: planItem.planned_collaborator_id,
        plannedTeamId: planItem.planned_team_id,
        status: planItem.status,
        reviewRequired: planItem.review_required,
        hasFactoryLink: linked,
      },
      factoryItem: factoryItem
        ? {
            plannedDate: factoryItem.planned_date,
            plannedMinutes: factoryItem.planned_minutes,
            assignedCollaboratorId: factoryItem.assigned_collaborator_id,
            assignedTeamId: factoryItem.assigned_team_id,
            status: factoryItem.status,
          }
        : null,
    })

    const nextSync: ConveyorPlanFactorySyncStatus = derived.syncStatus
    const nextReview = derived.reviewRequired

    if (planItem.sync_status !== nextSync || planItem.review_required !== nextReview) {
      await updateConveyorPlanItemSyncFields(client, planItem.id, nextSync, nextReview)
    }
  }

  await recalculateConveyorPlanFactoryStatuses(client, [planId])
}

/** Atualiza sync de todos os planos da esteira afetados pelos IDs de item informados. */
export async function refreshConveyorOperationalPlanSyncStatusByItemIds(
  client: pg.PoolClient,
  conveyorPlanItemIds: string[],
): Promise<void> {
  const uniqueItemIds = [...new Set(conveyorPlanItemIds.filter(Boolean))]
  if (uniqueItemIds.length === 0) return

  const planIds = await listDistinctPlanIdsForConveyorPlanItemIds(client, uniqueItemIds)
  for (const planId of planIds) {
    await refreshConveyorOperationalPlanSyncStatus(client, planId)
  }
}

async function listDistinctPlanIdsForConveyorPlanItemIds(
  client: pg.PoolClient,
  itemIds: string[],
): Promise<string[]> {
  const r = await client.query<{ plan_id: string }>(
    `
    SELECT DISTINCT plan_id::text
    FROM conveyor_operational_plan_items
    WHERE id = ANY($1::uuid[])
      AND deleted_at IS NULL
    `,
    [itemIds],
  )
  return r.rows.map((row) => row.plan_id)
}
