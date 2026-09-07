import type pg from 'pg'
import { resolveActivityPlannedTotalMinutes } from '../../shared/activityOperationalQuantity.js'
import { updateConveyorStructureMeta } from './conveyors.repository.js'
import type { StructureDiffCurrentNode } from './conveyor-structure-diff.js'

/** Snapshot ativo (`deleted_at IS NULL`) da esteira, sob a transação do PATCH structure. */
export async function listActiveConveyorNodesForDiff(
  client: pg.PoolClient,
  conveyorId: string,
): Promise<StructureDiffCurrentNode[]> {
  const r = await client.query<{
    id: string
    parent_id: string | null
    root_id: string
    node_type: 'OPTION' | 'AREA' | 'STEP'
    order_index: number
    name: string
    planned_minutes: number | null
    required: boolean
  }>(
    `
    SELECT id::text, parent_id::text, root_id::text, node_type, order_index, name, planned_minutes, required
      FROM conveyor_nodes
     WHERE conveyor_id = $1::uuid AND deleted_at IS NULL
    `,
    [conveyorId],
  )
  return r.rows
}

/**
 * UPDATE de campos cadastrais (nome/título, planned_minutes, order_index, required).
 * NUNCA toca `operational_status`, `operational_completed_*`, `aborted_*` — esses
 * campos são preservados independentemente do status operacional do STEP.
 */
export async function updateConveyorNodeCadastralFields(
  client: pg.PoolClient,
  input: {
    conveyorId: string
    id: string
    orderIndex: number
    name: string
    plannedMinutes?: number | null
    required?: boolean | null
  },
): Promise<boolean> {
  const r = await client.query(
    `
    UPDATE conveyor_nodes SET
      order_index = $3,
      name = $4,
      planned_minutes = COALESCE($5::int, planned_minutes),
      required = COALESCE($6::boolean, required),
      updated_at = now()
    WHERE id = $2::uuid AND conveyor_id = $1::uuid AND deleted_at IS NULL
    `,
    [
      input.conveyorId,
      input.id,
      input.orderIndex,
      input.name,
      input.plannedMinutes ?? null,
      input.required ?? null,
    ],
  )
  return (r.rowCount ?? 0) > 0
}

/** Soft-delete em lote — NUNCA hard-delete. */
export async function softDeleteConveyorNodes(
  client: pg.PoolClient,
  input: { conveyorId: string; nodeIds: string[] },
): Promise<number> {
  if (input.nodeIds.length === 0) return 0
  const r = await client.query(
    `
    UPDATE conveyor_nodes SET deleted_at = now(), updated_at = now()
    WHERE conveyor_id = $1::uuid AND id = ANY($2::uuid[]) AND deleted_at IS NULL
    `,
    [input.conveyorId, input.nodeIds],
  )
  return r.rowCount ?? 0
}

/** Soft-delete das alocações dos nós removidos (mesma semântica de `softDeleteConveyorNodeAssignee`, em lote). */
export async function softDeleteConveyorNodeAssigneesForNodes(
  client: pg.PoolClient,
  input: { conveyorId: string; nodeIds: string[] },
): Promise<number> {
  if (input.nodeIds.length === 0) return 0
  const r = await client.query(
    `
    UPDATE conveyor_node_assignees SET deleted_at = now(), updated_at = now()
    WHERE conveyor_id = $1::uuid AND conveyor_node_id = ANY($2::uuid[]) AND deleted_at IS NULL
    `,
    [input.conveyorId, input.nodeIds],
  )
  return r.rowCount ?? 0
}

export type ConveyorStructureMetaFields = {
  origin_register: 'MANUAL' | 'BASE' | 'HYBRID'
  base_ref_snapshot: string | null
  base_code_snapshot: string | null
  base_name_snapshot: string | null
  base_version_snapshot: number | null
  metadata_json: unknown | null
}

/**
 * Recalcula os totais a partir do ESTADO FINAL da árvore ativa
 * (`deleted_at IS NULL`) e persiste junto com os metadados de origem/base.
 */
export async function recomputeAndUpdateConveyorTotals(
  client: pg.PoolClient,
  conveyorId: string,
  metaFields: ConveyorStructureMetaFields,
): Promise<{
  total_options: number
  total_areas: number
  total_steps: number
  total_planned_minutes: number
}> {
  const r = await client.query<{
    node_type: 'OPTION' | 'AREA' | 'STEP'
    planned_minutes: number | null
    planned_quantity: number
  }>(
    `
    SELECT node_type, planned_minutes, planned_quantity
      FROM conveyor_nodes
     WHERE conveyor_id = $1::uuid AND deleted_at IS NULL
    `,
    [conveyorId],
  )

  let total_options = 0
  let total_areas = 0
  let total_steps = 0
  let total_planned_minutes = 0
  for (const row of r.rows) {
    if (row.node_type === 'OPTION') {
      total_options++
    } else if (row.node_type === 'AREA') {
      total_areas++
    } else {
      total_steps++
      total_planned_minutes += resolveActivityPlannedTotalMinutes(
        row.planned_minutes,
        row.planned_quantity,
      )
    }
  }

  await updateConveyorStructureMeta(client, conveyorId, {
    ...metaFields,
    total_options,
    total_areas,
    total_steps,
    total_planned_minutes,
  })

  return { total_options, total_areas, total_steps, total_planned_minutes }
}
