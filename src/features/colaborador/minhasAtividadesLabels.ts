import { labelConveyorOperationalStatus as labelFromDomain } from '../../domain/conveyors/conveyorOperationalStatus'

/** Rótulos para `conveyors.operational_status` (API). */
export function labelConveyorOperationalStatus(status: string): string {
  if (
    status === 'EM_ELABORACAO' ||
    status === 'AGUARDANDO_PLANEJAMENTO' ||
    status === 'EM_PLANEJAMENTO' ||
    status === 'A_INICIAR' ||
    status === 'EM_ANDAMENTO' ||
    status === 'FINALIZADA' ||
    status === 'CANCELADA'
  ) {
    return labelFromDomain(status)
  }
  return status
}

export function labelRoleInStep(role: 'primary' | 'support'): string {
  return role === 'primary' ? 'Principal' : 'Apoio'
}
