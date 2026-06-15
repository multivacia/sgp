import { describe, expect, it } from 'vitest'
import {
  canConveyorAcceptTimeEntry,
  canReturnConveyorToBacklog,
  canReturnConveyorToPlanning,
  canTransitionConveyorStatus,
  CONVEYOR_OPERATIONAL_STATUS_DEFAULT,
  mapLegacyConveyorOperationalStatus,
  resolveCompletedAtMode,
  timeEntryBlockedMessage,
} from './conveyorOperationalStatus.js'

describe('conveyorOperationalStatus', () => {
  it('mapeia status legados para o novo ciclo', () => {
    expect(mapLegacyConveyorOperationalStatus('NO_BACKLOG')).toBe('EM_ELABORACAO')
    expect(mapLegacyConveyorOperationalStatus('EM_REVISAO')).toBe(
      'AGUARDANDO_PLANEJAMENTO',
    )
    expect(mapLegacyConveyorOperationalStatus('PRONTA_LIBERAR')).toBe('A_INICIAR')
    expect(mapLegacyConveyorOperationalStatus('EM_PRODUCAO')).toBe('EM_ANDAMENTO')
    expect(mapLegacyConveyorOperationalStatus('CONCLUIDA')).toBe('FINALIZADA')
    expect(mapLegacyConveyorOperationalStatus('UNKNOWN')).toBeNull()
  })

  it('default de criação é EM_ELABORACAO', () => {
    expect(CONVEYOR_OPERATIONAL_STATUS_DEFAULT).toBe('EM_ELABORACAO')
  })

  it('permite transições oficiais e cancelamento de qualquer status', () => {
    expect(
      canTransitionConveyorStatus('EM_ELABORACAO', 'AGUARDANDO_PLANEJAMENTO'),
    ).toBe(true)
    expect(
      canTransitionConveyorStatus('AGUARDANDO_PLANEJAMENTO', 'EM_PLANEJAMENTO'),
    ).toBe(true)
    expect(canTransitionConveyorStatus('EM_PLANEJAMENTO', 'A_INICIAR')).toBe(true)
    expect(canTransitionConveyorStatus('EM_ANDAMENTO', 'FINALIZADA')).toBe(true)
    expect(canTransitionConveyorStatus('A_INICIAR', 'CANCELADA')).toBe(true)
    expect(canTransitionConveyorStatus('EM_ELABORACAO', 'A_INICIAR')).toBe(false)
  })

  it('apontamento só em A_INICIAR e EM_ANDAMENTO', () => {
    expect(canConveyorAcceptTimeEntry('A_INICIAR')).toBe(true)
    expect(canConveyorAcceptTimeEntry('EM_ANDAMENTO')).toBe(true)
    expect(canConveyorAcceptTimeEntry('EM_ELABORACAO')).toBe(false)
    expect(canConveyorAcceptTimeEntry('EM_PLANEJAMENTO')).toBe(false)
    expect(canConveyorAcceptTimeEntry('FINALIZADA')).toBe(false)
  })

  it('mensagens de bloqueio de apontamento', () => {
    expect(timeEntryBlockedMessage('EM_ELABORACAO')).toContain(
      'não foi liberada para produção',
    )
    expect(timeEntryBlockedMessage('EM_PLANEJAMENTO')).toContain(
      'em planejamento',
    )
    expect(timeEntryBlockedMessage('FINALIZADA')).toContain('finalizada')
  })

  it('completed_at ao finalizar e ao sair de FINALIZADA', () => {
    expect(resolveCompletedAtMode('EM_ANDAMENTO', 'FINALIZADA')).toBe('now')
    expect(resolveCompletedAtMode('FINALIZADA', 'CANCELADA')).toBe('clear')
    expect(resolveCompletedAtMode('A_INICIAR', 'EM_ANDAMENTO')).toBe('keep')
  })

  it('retrocesso para backlog a partir de planejamento e produção', () => {
    expect(canReturnConveyorToBacklog('EM_PLANEJAMENTO')).toBe(true)
    expect(canReturnConveyorToBacklog('A_INICIAR')).toBe(true)
    expect(canReturnConveyorToBacklog('EM_ANDAMENTO')).toBe(true)
    expect(canReturnConveyorToBacklog('FINALIZADA')).toBe(false)
    expect(canReturnConveyorToBacklog('CANCELADA')).toBe(false)
  })

  it('retrocesso para planejamento a partir de produção', () => {
    expect(canReturnConveyorToPlanning('A_INICIAR')).toBe(true)
    expect(canReturnConveyorToPlanning('EM_ANDAMENTO')).toBe(true)
    expect(canReturnConveyorToPlanning('EM_PLANEJAMENTO')).toBe(false)
    expect(canReturnConveyorToPlanning('FINALIZADA')).toBe(false)
  })
})
