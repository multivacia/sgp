import { describe, expect, it } from 'vitest'
import { exceptionsOf, isOverdue, progressOf, type ConveyorDetail, type ConveyorListItem, type ConveyorStep, type StepStatus } from './conveyors'

const NOW = new Date(2026, 9, 17, 10, 0) // 17/10/2026

function step(id: string, status: StepStatus, minutes: number, qty = 1): ConveyorStep {
  return { id, name: id, orderIndex: 0, plannedMinutes: minutes, plannedQuantity: qty, operationalStatus: status, completedByName: null, assignees: [] }
}

function item(id: string, status: ConveyorListItem['operationalStatus'], deadline: string | null): ConveyorListItem {
  return { id, code: null, name: id, clientName: null, responsible: null, operationalStatus: status, estimatedDeadline: deadline, totalSteps: 0 }
}

function detail(base: ConveyorListItem, steps: ConveyorStep[]): ConveyorDetail {
  return {
    ...base,
    vehicle: null,
    modelVersion: null,
    plate: null,
    baseNameSnapshot: null,
    originRegister: 'BASE',
    matrixRootItemId: null,
    structure: { options: [{ id: 'o1', name: 'Bancos dianteiros', orderIndex: 0, areas: [{ id: 'a1', name: 'Costura', orderIndex: 0, steps }] }] },
  }
}

describe('leitura de esteiras na V2', () => {
  it('progresso usa minutos previstos (com quantidade), ignora atividade interrompida e conta paradas', () => {
    const p = progressOf(
      detail(item('e1', 'EM_ANDAMENTO', null), [
        step('feito', 'COMPLETED', 30, 2), // 60 min feitos
        step('andando', 'IN_PROGRESS', 60),
        step('parado', 'BLOCKED', 60),
        step('interrompido', 'ABORTED', 500), // fora da conta
      ]),
    )
    expect(p).toMatchObject({ totalSteps: 3, doneSteps: 1, totalMinutes: 180, doneMinutes: 60, pct: 33, blocked: 1 })
  })

  it('atraso segue a regra da V1: prazo de dia anterior e esteira não fechada (ISO ou dd/mm/aaaa)', () => {
    expect(isOverdue(item('a', 'EM_ANDAMENTO', '2026-10-16'), NOW)).toBe(true)
    expect(isOverdue(item('b', 'A_INICIAR', '16/10/2026'), NOW)).toBe(true)
    expect(isOverdue(item('c', 'EM_ANDAMENTO', '17/10/2026'), NOW)).toBe(false) // vence hoje: ainda não atrasou
    expect(isOverdue(item('d', 'FINALIZADA', '01/01/2026'), NOW)).toBe(false)
    expect(isOverdue(item('e', 'EM_ANDAMENTO', null), NOW)).toBe(false)
  })

  it('"Precisa de você" lista atividades paradas primeiro, depois atrasadas, e ignora esteiras fechadas', () => {
    const atrasada = item('atrasada', 'EM_ANDAMENTO', '2026-10-10')
    const comParada = item('com-parada', 'EM_ANDAMENTO', '2026-12-01')
    const fechada = item('fechada', 'CANCELADA', '2026-10-01')
    const details = new Map([[comParada.id, detail(comParada, [step('Costurar capa', 'BLOCKED', 60)])]])

    const out = exceptionsOf([atrasada, comParada, fechada], details, NOW)

    expect(out.map((x) => [x.kind, x.conveyor.id])).toEqual([
      ['parada', 'com-parada'],
      ['atrasada', 'atrasada'],
    ])
    expect(out[0].detail).toBe('Bancos dianteiros · Costura: Costurar capa')
  })
})
