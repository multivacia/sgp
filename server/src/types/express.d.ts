import type { AuthJwtUser } from '../modules/auth/auth.types.js'

declare global {
  namespace Express {
    interface Request {
      /** Preenchido por `requireAuth` após validar o JWT do cookie. */
      authUser?: AuthJwtUser
      /** Cache por pedido: permissões efetivas (RBAC), preenchido pelo middleware de permissões. */
      appPermissionCodes?: Set<string>
    }
  }
}

export {}
