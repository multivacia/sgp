import type { AuthJwtUser } from '../modules/auth/auth.types.js'
import type { SessionActivityTimestamps } from '../modules/auth/session-timeout.service.js'
import type { ProductionSessionContext } from '../modules/production/production.types.js'

declare global {
  namespace Express {
    interface Request {
      /** Preenchido por `requireAuth` após validar o JWT do cookie. */
      authUser?: AuthJwtUser
      /** Atividade da sessão após validação/renovação em `requireAuth`. */
      sessionActivity?: SessionActivityTimestamps
      /** Cache por pedido: permissões efetivas (RBAC), preenchido pelo middleware de permissões. */
      appPermissionCodes?: Set<string>
      /** Preenchido por `requireProductionAuth` após validar cookie de produção. */
      productionSession?: ProductionSessionContext
    }
  }
}

export {}
