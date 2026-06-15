import { describe, expect, it } from 'vitest'
import {
  CONVEYOR_RETURN_TO_BACKLOG_MODAL,
  CONVEYOR_RETURN_TO_PLANNING_MODAL,
  getConveyorLifecycleReturnActions,
  getConveyorReturnApiEndpoint,
  getConveyorReturnModalCopy,
  validateConveyorReturnReason,
} from './conveyorLifecycleActions'
import type { ConveyorOperationalStatus } from './conveyor.types'

describe('conveyorLifecycleActions', () => {
  it('exibe Voltar para backlog em EM_PLANEJAMENTO', () => {
    const actions = getConveyorLifecycleReturnActions('EM_PLANEJAMENTO')
    expect(actions.map((a) => a.label)).toEqual(['Voltar para backlog'])
  })

  it('exibe ambos os botões em A_INICIAR', () => {
    const actions = getConveyorLifecycleReturnActions('A_INICIAR')
    expect(actions.map((a) => a.label)).toEqual([
      'Voltar para planejamento',
      'Voltar para backlog',
    ])
  })

  it('exibe ambos os botões em EM_ANDAMENTO', () => {
    const actions = getConveyorLifecycleReturnActions('EM_ANDAMENTO')
    expect(actions.map((a) => a.label)).toEqual([
      'Voltar para planejamento',
      'Voltar para backlog',
    ])
  })

  it.each(['FINALIZADA', 'CANCELADA', 'EM_ELABORACAO', 'AGUARDANDO_PLANEJAMENTO'] as const)(
    'não exibe ações de retrocesso em %s',
    (status: ConveyorOperationalStatus) => {
      expect(getConveyorLifecycleReturnActions(status)).toEqual([])
    },
  )

  it('abre modal correto para Voltar para backlog', () => {
    const copy = getConveyorReturnModalCopy('RETURN_TO_BACKLOG')
    expect(copy.title).toBe(CONVEYOR_RETURN_TO_BACKLOG_MODAL.title)
    expect(copy.confirmLabel).toBe('Voltar para backlog')
    expect(copy.successToast).toBe('Esteira retornada para backlog.')
  })

  it('abre modal correto para Voltar para planejamento', () => {
    const copy = getConveyorReturnModalCopy('RETURN_TO_PLANNING')
    expect(copy.title).toBe(CONVEYOR_RETURN_TO_PLANNING_MODAL.title)
    expect(copy.confirmLabel).toBe('Voltar para planejamento')
    expect(copy.successToast).toBe('Esteira retornada para planejamento.')
  })

  it('bloqueia submit sem motivo válido', () => {
    expect(validateConveyorReturnReason('')).toBe('Informe o motivo para continuar.')
    expect(validateConveyorReturnReason('  ')).toBe('Informe o motivo para continuar.')
    expect(validateConveyorReturnReason('ab')).toBe('Informe o motivo para continuar.')
    expect(validateConveyorReturnReason('motivo válido')).toBeNull()
  })

  it('monta endpoint correto com reason no contrato da API', () => {
    const id = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'
    expect(getConveyorReturnApiEndpoint(id, 'RETURN_TO_BACKLOG')).toBe(
      `/api/v1/conveyors/${encodeURIComponent(id)}/return-to-backlog`,
    )
    expect(getConveyorReturnApiEndpoint(id, 'RETURN_TO_PLANNING')).toBe(
      `/api/v1/conveyors/${encodeURIComponent(id)}/return-to-planning`,
    )
  })
})
