import type { RequestHandler } from 'express'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import { getRestoreJob, isMaintenanceActive } from './database-backups.state.js'

export const MAINTENANCE_MESSAGE =
  'O SGP+ está em manutenção: a base de dados está sendo restaurada a partir de um backup. ' +
  'Tente novamente em alguns minutos.'

/**
 * Durante o restore, toda requisição recebe 503 (inclusive as desta tela, porque a autenticação
 * consulta o banco). O corpo informa só a fase do restore, para a tela mostrar o andamento.
 */
export function maintenanceGuard(): RequestHandler {
  return (_req, res, next) => {
    if (!isMaintenanceActive()) {
      next()
      return
    }
    res.setHeader('Retry-After', '30')
    res.status(503).json({
      error: {
        code: ErrorCodes.SERVICE_UNAVAILABLE,
        message: MAINTENANCE_MESSAGE,
        category: 'SYSTEM',
        severity: 'critical',
        details: { maintenance: true, restorePhase: getRestoreJob()?.phase ?? null },
      },
    })
  }
}
