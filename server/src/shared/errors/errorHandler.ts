import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import type { Logger } from 'pino'
import { AppError } from './AppError.js'
import { ErrorCodes } from './errorCodes.js'
import { ErrorRefs } from './errorRefs.js'

/** Caminho legível tipo `options[0].areas[1].steps[2].orderIndex` (sem stack). */
function formatZodIssuePath(path: ReadonlyArray<string | number>): string {
  let s = ''
  for (const seg of path) {
    if (typeof seg === 'number') s += `[${seg}]`
    else s += s === '' ? seg : `.${seg}`
  }
  return s
}

function firstZodIssueUserMessage(err: ZodError): string {
  const issue = err.issues[0]
  if (!issue) return 'Dados inválidos.'
  const pathStr = formatZodIssuePath(issue.path)
  const prefix = pathStr ? `Campo inválido: ${pathStr}. ` : ''
  return `${prefix}${issue.message}`.trim()
}

export function errorHandler(logger: Logger) {
  return (
    err: unknown,
    req: Request,
    res: Response,
    _next: NextFunction,
  ): void => {
    const requestId = req.get('x-request-id') ?? undefined
    const correlationId = req.get('x-correlation-id') ?? undefined

    if (err instanceof ZodError) {
      const message = firstZodIssueUserMessage(err)
      logger.warn(
        {
          issues: err.issues.map((i) => ({ path: i.path, message: i.message })),
          requestId,
          correlationId,
          errorRef: ErrorRefs.API_VALIDATION,
          route: req.originalUrl,
          method: req.method,
        },
        'validation failed',
      )
      res.status(422).json({
        error: {
          code: ErrorCodes.VALIDATION_ERROR,
          message,
          errorRef: ErrorRefs.API_VALIDATION,
          category: 'VALIDATION',
          severity: 'warning',
          ...(correlationId ? { correlationId } : {}),
          details: err.flatten(),
        },
      })
      return
    }

    if (err instanceof AppError) {
      res.status(err.statusCode).json({
        error: {
          code: err.code,
          message: err.message,
          ...(err.errorRef ? { errorRef: err.errorRef } : {}),
          ...(err.category ? { category: err.category } : {}),
          ...(err.severity ? { severity: err.severity } : {}),
          ...(correlationId ? { correlationId } : {}),
          ...(err.details !== undefined ? { details: err.details } : {}),
        },
      })
      return
    }

    logger.error(
      {
        err,
        requestId,
        correlationId,
        errorRef: ErrorRefs.API_UNHANDLED,
        route: req.originalUrl,
        method: req.method,
      },
      'unhandled error',
    )
    res.status(500).json({
      error: {
        code: ErrorCodes.INTERNAL,
        message: 'Serviço temporariamente indisponível. Tente novamente em instantes.',
        errorRef: ErrorRefs.API_UNHANDLED,
        category: 'SYSTEM',
        severity: 'critical',
        ...(correlationId ? { correlationId } : {}),
      },
    })
  }
}
