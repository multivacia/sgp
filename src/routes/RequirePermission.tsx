import type { ReactNode } from 'react'
import { useAuth } from '../lib/use-auth'

type Props = {
  permission: string
  children: ReactNode
}

/**
 * Área que exige uma permissão explícita (alinhada ao middleware `requirePermission` no servidor).
 */
export function RequirePermission({ permission, children }: Props) {
  const { user, ready, can } = useAuth()

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-400">
        Carregando…
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (!can(permission)) {
    return (
      <div
        role="alert"
        className="mx-auto max-w-lg rounded-2xl border border-amber-500/25 bg-amber-500/10 px-5 py-6 text-center"
      >
        <p className="text-sm font-semibold text-amber-100/95">Sem permissão para esta área</p>
        <p className="mt-2 text-sm text-slate-400">
          Não tem permissão para acessar este conteúdo. Contate um administrador se precisar de
          acesso.
        </p>
      </div>
    )
  }

  return <>{children}</>
}

type AnyProps = {
  permissions: string[]
  children: ReactNode
}

export function RequireAnyPermission({ permissions, children }: AnyProps) {
  const { user, ready, canAny } = useAuth()

  if (!ready) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-400">
        Carregando…
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (!canAny(permissions)) {
    return (
      <div
        role="alert"
        className="mx-auto max-w-lg rounded-2xl border border-amber-500/25 bg-amber-500/10 px-5 py-6 text-center"
      >
        <p className="text-sm font-semibold text-amber-100/95">Sem permissão para esta área</p>
        <p className="mt-2 text-sm text-slate-400">
          Não tem permissão para acessar este conteúdo. Contate um administrador se precisar de
          acesso.
        </p>
      </div>
    )
  }

  return <>{children}</>
}
