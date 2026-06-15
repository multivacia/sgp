import type { Request, Response, NextFunction } from 'express'
import type { AgentConfig } from '../types.js'

export function createLocalhostOnlyMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const remote = req.socket.remoteAddress ?? ''
    const allowed = new Set(['127.0.0.1', '::1', '::ffff:127.0.0.1'])
    if (!allowed.has(remote)) {
      res.status(403).json({ error: 'Acesso permitido apenas via localhost' })
      return
    }
    next()
  }
}

export function createAuthMiddleware(config: AgentConfig) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const header = req.header('x-sgp-print-token')?.trim()
    if (!header || header !== config.authToken) {
      res.status(401).json({ error: 'Token de autenticacao invalido' })
      return
    }
    next()
  }
}
