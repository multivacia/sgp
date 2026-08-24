import type pg from 'pg'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import type { ConveyorOperationalStatusDb } from './conveyorOperationalStatus.js'
import type { ConveyorNodeStepOperationalStatusDb } from './stepOperationalStatus.js'

export type LockedConveyorRow = {
  id: string
  operational_status: ConveyorOperationalStatusDb
}

export type LockedStepNodeRow = {
  id: string
  conveyor_id: string
  node_type: 'OPTION' | 'AREA' | 'STEP'
  operational_status: ConveyorNodeStepOperationalStatusDb | null
  operational_completed_at: string | null
  operational_completed_by: string | null
  aborted_at: string | null
  aborted_by: string | null
  abort_reason_code: string | null
  abort_reason_text: string | null
  abort_reason_label_snapshot: string | null
}

/**
 * Protocolo de lock compartilhado (anti-deadlock):
 * 1) conveyors FOR UPDATE
 * 2) conveyor_nodes STEP alvo FOR UPDATE
 *
 * Usar no início de TXs que mutam status do STEP ou gravam time entries no STEP.
 * Relê sempre o estado sob lock antes de decidir mutação.
 */
export async function lockConveyorAndStepForUpdate(
  client: pg.PoolClient,
  conveyorId: string,
  stepNodeId: string,
): Promise<{ conveyor: LockedConveyorRow; step: LockedStepNodeRow }> {
  const conveyorRes = await client.query<{
    id: string
    operational_status: ConveyorOperationalStatusDb
  }>(
    `SELECT id::text, operational_status
       FROM conveyors
      WHERE id = $1::uuid
        AND deleted_at IS NULL
      FOR UPDATE`,
    [conveyorId],
  )
  const conveyor = conveyorRes.rows[0]
  if (!conveyor) {
    throw new AppError('Esteira não encontrada.', 404, ErrorCodes.NOT_FOUND)
  }

  const stepRes = await client.query<{
    id: string
    conveyor_id: string
    node_type: 'OPTION' | 'AREA' | 'STEP'
    operational_status: ConveyorNodeStepOperationalStatusDb | null
    operational_completed_at: Date | null
    operational_completed_by: string | null
    aborted_at: Date | null
    aborted_by: string | null
    abort_reason_code: string | null
    abort_reason_text: string | null
    abort_reason_label_snapshot: string | null
  }>(
    `SELECT
       id::text,
       conveyor_id::text,
       node_type,
       operational_status,
       operational_completed_at,
       operational_completed_by::text,
       aborted_at,
       aborted_by::text,
       abort_reason_code,
       abort_reason_text,
       abort_reason_label_snapshot
     FROM conveyor_nodes
    WHERE id = $1::uuid
      AND conveyor_id = $2::uuid
      AND deleted_at IS NULL
    FOR UPDATE`,
    [stepNodeId, conveyorId],
  )
  const row = stepRes.rows[0]
  if (!row) {
    throw new AppError('Etapa não encontrada nesta esteira.', 404, ErrorCodes.NOT_FOUND)
  }
  if (row.node_type !== 'STEP') {
    throw new AppError(
      'Apenas etapas (STEP) são válidas nesta operação.',
      404,
      ErrorCodes.NOT_FOUND,
    )
  }

  return {
    conveyor,
    step: {
      id: row.id,
      conveyor_id: row.conveyor_id,
      node_type: row.node_type,
      operational_status: row.operational_status,
      operational_completed_at: row.operational_completed_at
        ? row.operational_completed_at.toISOString()
        : null,
      operational_completed_by: row.operational_completed_by,
      aborted_at: row.aborted_at ? row.aborted_at.toISOString() : null,
      aborted_by: row.aborted_by,
      abort_reason_code: row.abort_reason_code,
      abort_reason_text: row.abort_reason_text,
      abort_reason_label_snapshot: row.abort_reason_label_snapshot,
    },
  }
}
