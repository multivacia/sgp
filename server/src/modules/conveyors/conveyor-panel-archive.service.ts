import type pg from 'pg'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import {
  lockConveyorPanelSection,
  type ConveyorPanelSection,
} from './conveyors.repository.js'
import { serviceCreateConveyorOperationalEvent } from './operational-events/conveyor-operational-events.service.js'

/** Status em que o arquivamento manual do Painel operacional é permitido. */
const ARCHIVABLE_STATUSES = new Set(['FINALIZADA', 'CANCELADA'])

export const CONVEYOR_ARCHIVE_STATUS_NOT_ALLOWED_MESSAGE =
  'Só é possível arquivar ou desarquivar esteiras finalizadas ou canceladas.'

export const CONVEYOR_ALREADY_IN_HISTORY_MESSAGE =
  'Esta esteira já está no Histórico.'

export const CONVEYOR_ALREADY_IN_OPERATIONAL_MESSAGE =
  'Esta esteira já está no Operacional.'

export type ConveyorPanelArchiveResultApi = {
  id: string
  panelSection: ConveyorPanelSection
  panelSectionManual: boolean
}

type ArchiveAction = 'archive' | 'unarchive'

/**
 * Arquivar: esteira encerrada no Operacional → Histórico (evento CONVEYOR_ARCHIVED).
 * Desarquivar: esteira no Histórico → Operacional até a virada do mês (evento CONVEYOR_UNARCHIVED).
 * A seção efetiva é recalculada pela mesma regra SQL da listagem.
 */
async function executeConveyorPanelArchive(
  pool: pg.Pool,
  conveyorId: string,
  action: ArchiveAction,
  actorUserId: string | null,
): Promise<ConveyorPanelArchiveResultApi | null> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    const current = await lockConveyorPanelSection(client, conveyorId)
    if (!current) {
      await client.query('ROLLBACK')
      return null
    }

    if (!ARCHIVABLE_STATUSES.has(current.operational_status)) {
      throw new AppError(
        CONVEYOR_ARCHIVE_STATUS_NOT_ALLOWED_MESSAGE,
        422,
        ErrorCodes.CONVEYOR_ARCHIVE_STATUS_NOT_ALLOWED,
      )
    }

    if (action === 'archive' && current.panel_section === 'HISTORICO') {
      throw new AppError(
        CONVEYOR_ALREADY_IN_HISTORY_MESSAGE,
        409,
        ErrorCodes.CONVEYOR_ARCHIVE_STATE_CONFLICT,
      )
    }
    if (action === 'unarchive' && current.panel_section === 'OPERACIONAL') {
      throw new AppError(
        CONVEYOR_ALREADY_IN_OPERATIONAL_MESSAGE,
        409,
        ErrorCodes.CONVEYOR_ARCHIVE_STATE_CONFLICT,
      )
    }

    const nextSection: ConveyorPanelSection =
      action === 'archive' ? 'HISTORICO' : 'OPERACIONAL'

    // occurred_at = now() do banco (mesmo relógio usado para o mês corrente na regra SQL).
    const nowRow = await client.query<{ now: Date }>('SELECT now() AS now')
    const occurredAt = (nowRow.rows[0]?.now ?? new Date()).toISOString()

    await serviceCreateConveyorOperationalEvent(client, {
      conveyorId,
      eventType: action === 'archive' ? 'CONVEYOR_ARCHIVED' : 'CONVEYOR_UNARCHIVED',
      previousValue: current.panel_section,
      newValue: nextSection,
      source: 'USER_ACTION',
      occurredAt,
      createdBy: actorUserId,
    })

    const after = await lockConveyorPanelSection(client, conveyorId)
    await client.query('COMMIT')
    return {
      id: conveyorId,
      panelSection: after?.panel_section ?? nextSection,
      panelSectionManual: after?.panel_section_manual ?? true,
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function serviceArchiveConveyor(
  pool: pg.Pool,
  conveyorId: string,
  options?: { actorUserId?: string | null },
): Promise<ConveyorPanelArchiveResultApi | null> {
  return executeConveyorPanelArchive(pool, conveyorId, 'archive', options?.actorUserId ?? null)
}

export async function serviceUnarchiveConveyor(
  pool: pg.Pool,
  conveyorId: string,
  options?: { actorUserId?: string | null },
): Promise<ConveyorPanelArchiveResultApi | null> {
  return executeConveyorPanelArchive(pool, conveyorId, 'unarchive', options?.actorUserId ?? null)
}
