import type { NextFunction, Request, Response } from 'express'
import multer from 'multer'
import type { Env } from '../../config/env.js'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'

export function documentDraftMulter(env: Env) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: env.documentDraftMaxFileBytes },
  }).single('file')
}

export function documentDraftMulterErrorHandler(
  err: unknown,
  _req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
    next(
      new AppError(
        'Ficheiro excede o tamanho máximo permitido.',
        413,
        ErrorCodes.VALIDATION_ERROR,
      ),
    )
    return
  }
  next(err)
}
