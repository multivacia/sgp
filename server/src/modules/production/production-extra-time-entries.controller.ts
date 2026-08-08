import type { Request, Response } from 'express'
import type pg from 'pg'
import { findAppUserIdByCollaboratorId } from '../auth/auth.repository.js'
import {
  serviceCreateMyExtraTimeEntry,
  serviceListExtraTimeEntryDescriptionOptions,
} from '../my-activities/extra-time-entries.service.js'
import { createExtraTimeEntryBodySchema } from '../my-activities/extra-time-entries.schemas.js'
import {
  toEntryJson,
  toOptionJson,
} from '../my-activities/extra-time-entries.controller.js'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import { ok } from '../../shared/http/ok.js'

export async function getProductionExtraTimeEntryDescriptions(
  req: Request,
  res: Response,
): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const rows = await serviceListExtraTimeEntryDescriptionOptions(pool)
  const data = rows.map(toOptionJson)
  res.json(ok(data, { total: data.length }))
}

export async function postProductionExtraTimeEntry(
  req: Request,
  res: Response,
): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const collaboratorId = req.productionSession!.collaboratorId
  const body = createExtraTimeEntryBodySchema.parse(req.body)
  const userId = await findAppUserIdByCollaboratorId(pool, collaboratorId)

  if (!userId) {
    throw new AppError(
      'Não é possível registrar extra esteira: colaborador sem usuário de sistema vinculado. Solicite vínculo/cadastro ao administrador.',
      422,
      ErrorCodes.VALIDATION_ERROR,
    )
  }

  const row = await serviceCreateMyExtraTimeEntry(pool, { userId, body })
  res.status(201).json(ok(toEntryJson(row)))
}
