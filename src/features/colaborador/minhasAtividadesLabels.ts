/** Rótulos para `conveyors.operational_status` (API). */
export function labelConveyorOperationalStatus(status: string): string {
  const m: Record<string, string> = {
    NO_BACKLOG: 'No backlog',
    EM_REVISAO: 'Em revisão',
    PRONTA_LIBERAR: 'Pronta para liberar',
    EM_PRODUCAO: 'Em produção',
    CONCLUIDA: 'Concluída',
  }
  return m[status] ?? status
}

export function labelRoleInStep(role: 'primary' | 'support'): string {
  return role === 'primary' ? 'Principal' : 'Apoio'
}
