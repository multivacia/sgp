import type { NextFunction, Request, Response } from 'express'
import type { Env } from '../../config/env.js'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'
import { asyncRoute } from '../../shared/asyncRoute.js'

/**
 * Proteção leve de kiosk para rotas públicas do Modo Fábrica.
 *
 * Quando `PRODUCTION_KIOSK_TOKEN` estiver definido, exige o header
 * `X-SGP-Kiosk-Token` com o valor correto. Sem o token configurado
 * (dev/test), a rota permanece aberta.
 *
 * Atenção: não é segurança absoluta — o PIN de login continua sendo o
 * segundo fator. O kiosk token evita listagem não autorizada em tablets
 * de fábrica. TODO R3-S3: adicionar rate limit por IP.
 */
export function requireKioskToken() {
  return asyncRoute(
    async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
      const env = req.app.locals.env as Env | undefined
      if (!env) {
        next(new Error('app.locals.env não configurado'))
        return
      }

      if (!env.productionKioskToken) {
        // Token não configurado: manter rota aberta (dev/test).
        // Em NODE_ENV=production o aviso já foi emitido no loadEnv.
        next()
        return
      }

      const provided = req.headers['x-sgp-kiosk-token']
      if (
        typeof provided !== 'string' ||
        provided !== env.productionKioskToken
      ) {
        next(
          new AppError(
            'Este dispositivo não está autorizado para o modo produção.',
            403,
            ErrorCodes.PRODUCTION_KIOSK_REQUIRED,
          ),
        )
        return
      }

      next()
    },
  )
}
