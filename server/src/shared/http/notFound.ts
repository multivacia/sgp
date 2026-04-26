import type { Request, Response } from 'express'
import { ErrorCodes } from '../errors/errorCodes.js'

/** Rotas não registradas: envelope alinhado ao restante da API. */
export function notFoundHandler(_req: Request, res: Response): void {
  if (res.headersSent) return
  res.status(404).json({
    error: {
      code: ErrorCodes.ROUTE_NOT_FOUND,
      message: 'Rota não encontrada.',
      details: {},
    },
  })
}
