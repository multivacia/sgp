import { randomUUID } from 'node:crypto'
import type { Request, Response } from 'express'
import type pg from 'pg'
import type { Logger } from 'pino'
import type { Env } from '../../../config/env.js'
import { ok } from '../../../shared/http/ok.js'
import { conveyorIdParamSchema } from '../conveyors.schemas.js'
import {
  getConveyorHealthAnalysisHistoryQuerySchema,
  getConveyorHealthSummaryQuerySchema,
  postConveyorHealthAnalysisBodySchema,
} from './conveyor-health.schemas.js'
import {
  serviceAnalyzeConveyorHealthAndPersist,
  serviceGetLatestConveyorHealth,
  serviceListLatestConveyorHealthSummaries,
  serviceListConveyorHealthHistory,
} from './conveyor-health.service.js'

/** TODO(RBAC): eventual `conveyors.view` / `conveyor_health.view` alinhado ao GET detalhe/workload. */

export async function postConveyorHealthAnalysis(req: Request, res: Response): Promise<void> {
  const id = conveyorIdParamSchema.parse(req.params.id)
  const pool = req.app.locals.pool as pg.Pool
  const env = req.app.locals.env as Env
  const logger = req.app.locals.logger as Logger

  const body = postConveyorHealthAnalysisBodySchema.parse(
    req.body === undefined || req.body === null ? {} : req.body,
  )

  const requestId = req.get('x-request-id')?.trim() || randomUUID()
  const correlationId = req.get('x-correlation-id')?.trim() || randomUUID()

  const t0 = Date.now()
  try {
    const result = await serviceAnalyzeConveyorHealthAndPersist(pool, env, id, {
      policy: body.policy,
      requestId,
      correlationId,
      now: new Date(),
      createdBy: req.authUser?.id ?? null,
    })
    const durationMs = Date.now() - t0

    logger.info(
      {
        conveyorId: id,
        requestId,
        correlationId,
        policy: body.policy ?? 'balanced',
        status: 'ok',
        durationMs,
        routeUsed: result.analysis.routeUsed,
        llmUsed: result.analysis.llmUsed,
        analysisId: result.persisted.analysisId,
      },
      'conveyor health analysis ok',
    )

    const meta: Record<string, unknown> = {
      requestId,
      correlationId,
      analysisId: result.persisted.analysisId,
      savedAt: result.persisted.savedAt,
    }
    if (result.analysis.routeUsed !== undefined) meta.routeUsed = result.analysis.routeUsed
    if (result.analysis.llmUsed !== undefined) meta.llmUsed = result.analysis.llmUsed

    res.status(200).json(ok(result.analysis, meta))
  } catch (e) {
    logger.warn(
      {
        conveyorId: id,
        requestId,
        correlationId,
        policy: body.policy ?? 'balanced',
        durationMs: Date.now() - t0,
        err: e instanceof Error ? e.message : String(e),
      },
      'conveyor health analysis failed',
    )
    throw e
  }
}

export async function getLatestConveyorHealthAnalysis(req: Request, res: Response): Promise<void> {
  const id = conveyorIdParamSchema.parse(req.params.id)
  const pool = req.app.locals.pool as pg.Pool
  const result = await serviceGetLatestConveyorHealth(pool, id)
  res.status(200).json(ok(result.data, result.meta))
}

export async function getConveyorHealthAnalysisHistory(req: Request, res: Response): Promise<void> {
  const id = conveyorIdParamSchema.parse(req.params.id)
  const q = getConveyorHealthAnalysisHistoryQuerySchema.parse(req.query ?? {})
  const pool = req.app.locals.pool as pg.Pool
  const result = await serviceListConveyorHealthHistory(pool, id, { limit: q.limit })
  res.status(200).json(ok(result.data, result.meta))
}

export async function getConveyorHealthSummary(req: Request, res: Response): Promise<void> {
  const pool = req.app.locals.pool as pg.Pool
  const q = getConveyorHealthSummaryQuerySchema.parse(req.query ?? {})
  const result = await serviceListLatestConveyorHealthSummaries(pool, { limit: q.limit })
  res.status(200).json(ok(result.data, result.meta))
}
