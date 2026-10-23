import type pg from 'pg'
import { insertAdminAuditEvent } from '../admin-audit/admin-audit.repository.js'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import type {
  DeleteExtraTimeEntryBody,
  PatchExtraTimeEntryBody,
} from './extra-time-entry-corrections.schemas.js'

type LockedEntry = {
  id: string
  collaborator_id: string
  description_id: string
  entry_date: string
  minutes: number
  notes: string | null
  updated_at: Date
  origin: 'WEB' | 'PRODUCTION'
}
type Snapshot = Pick<LockedEntry, 'description_id' | 'entry_date' | 'minutes' | 'notes'>
function snapshot(e: Snapshot) {
  return {
    descriptionId: e.description_id,
    entryDate: e.entry_date,
    minutes: e.minutes,
    notes: e.notes,
  }
}

async function lockEntry(client: pg.PoolClient, id: string): Promise<LockedEntry> {
  const result = await client.query<LockedEntry>(
    `SELECT id, collaborator_id, description_id,
            to_char(entry_date, 'YYYY-MM-DD') AS entry_date,
            minutes, notes, updated_at, origin
       FROM operational_extra_time_entries
      WHERE id = $1::uuid AND deleted_at IS NULL
      FOR UPDATE`,
    [id],
  )
  if (!result.rows[0]) {
    throw new AppError('Apontamento Extra Esteira não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }
  return result.rows[0]
}

function checkRevision(entry: LockedEntry, expectedUpdatedAt: string) {
  if (entry.updated_at.toISOString() !== new Date(expectedUpdatedAt).toISOString()) {
    throw new AppError(
      'O apontamento foi alterado. Atualize a jornada antes de tentar novamente.',
      409,
      ErrorCodes.CONFLICT,
    )
  }
}

async function transaction<T>(pool: pg.Pool, fn: (db: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const result = await fn(client)
    await client.query('COMMIT')
    return result
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
}

/** Altera registros do app e do Kiosk sem alterar sua origem nem o autor original. */
export function servicePatchExtraTimeEntryAsManager(
  pool: pg.Pool,
  input: { id: string; actorId: string; body: PatchExtraTimeEntryBody },
): Promise<{ id: string; updatedAt: string }> {
  return transaction(pool, async (db) => {
    const old = await lockEntry(db, input.id)
    checkRevision(old, input.body.expectedUpdatedAt)
    if (old.description_id !== input.body.descriptionId) {
      const active = await db.query(
        `SELECT id FROM operational_extra_time_entry_descriptions
         WHERE id = $1::uuid AND is_active = true AND deleted_at IS NULL`,
        [input.body.descriptionId],
      )
      if (active.rowCount === 0) {
        throw new AppError('Selecione uma descrição ativa.', 422, ErrorCodes.VALIDATION_ERROR)
      }
    }
    const after = {
      description_id: input.body.descriptionId,
      entry_date: input.body.entryDate,
      minutes: input.body.minutes,
      notes: input.body.notes,
    }
    if (JSON.stringify(snapshot(old)) === JSON.stringify(snapshot(after))) {
      throw new AppError('Nenhuma alteração informada.', 422, ErrorCodes.VALIDATION_ERROR)
    }
    const updated = await db.query<{ updated_at: Date }>(
      `UPDATE operational_extra_time_entries
          SET description_id = $2::uuid, entry_date = $3::date,
              minutes = $4::int, notes = $5::text, updated_at = clock_timestamp()
        WHERE id = $1::uuid AND deleted_at IS NULL
        RETURNING updated_at`,
      [input.id, after.description_id, after.entry_date, after.minutes, after.notes],
    )
    await insertAdminAuditEvent(db, {
      eventType: 'extra_time_entry_edited_by_manager',
      actorUserId: input.actorId,
      targetUserId: null,
      targetCollaboratorId: old.collaborator_id,
      metadata: {
        time_entry_id: old.id,
        target_collaborator_id: old.collaborator_id,
        reason: input.body.reason,
        previous_snapshot: snapshot(old),
        new_snapshot: snapshot(after),
      },
    })
    return { id: input.id, updatedAt: updated.rows[0]!.updated_at.toISOString() }
  })
}

/** Remoção lógica: mantém o registro anterior e grava a justificativa na auditoria. */
export function serviceDeleteExtraTimeEntryAsManager(
  pool: pg.Pool,
  input: { id: string; actorId: string; body: DeleteExtraTimeEntryBody },
): Promise<{ deleted: true; id: string }> {
  return transaction(pool, async (db) => {
    const old = await lockEntry(db, input.id)
    checkRevision(old, input.body.expectedUpdatedAt)
    await db.query(
      `UPDATE operational_extra_time_entries
          SET deleted_at = clock_timestamp(), updated_at = clock_timestamp()
        WHERE id = $1::uuid AND deleted_at IS NULL`,
      [input.id],
    )
    await insertAdminAuditEvent(db, {
      eventType: 'extra_time_entry_deleted_by_manager',
      actorUserId: input.actorId,
      targetUserId: null,
      targetCollaboratorId: old.collaborator_id,
      metadata: {
        time_entry_id: old.id,
        target_collaborator_id: old.collaborator_id,
        reason: input.body.reason,
        previous_snapshot: snapshot(old),
      },
    })
    return { deleted: true, id: input.id }
  })
}
