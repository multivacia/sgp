import type { ReactNode } from 'react'

/** Container padrão para páginas autenticadas (largura + ritmo vertical). */
export function PageCanvas({ children }: { children: ReactNode }) {
  return <div className="space-y-8">{children}</div>
}
