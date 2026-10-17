import { describe, expect, it } from 'vitest'
import { productionTimeEntryBodySchema, productionUnassignedTimeEntryBodySchema } from '../../../../server/src/modules/production/production-time-entries.schemas'
import { buildOutraBody, buildTimeEntryBody, continuar, iniciar, minutosDe, pausar, precisaJustificar, tarefasAbertas, type Tarefa } from './tablet'

const u = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`

function tarefa(n: number, extra: Partial<Tarefa> = {}): Tarefa {
  return {
    workPlanItemId: u(100 + n),
    conveyorId: u(1),
    conveyorTitle: 'Gol GTI · ABC1D23',
    activityNodeId: u(200 + n),
    activityTitle: `Atividade ${n}`,
    taskTitle: 'Bancos dianteiros',
    sectorTitle: 'Costura',
    plannedDate: '2026-10-19',
    plannedMinutes: 60,
    realizedMinutes: 0,
    pendingMinutes: 60,
    isActivityCompleted: false,
    isOverdue: false,
    isNextRecommended: false,
    group: 'today',
    canTrackTime: true,
    canCompleteStep: true,
    requiresOutOfSequenceJustification: false,
    ...extra,
  }
}

describe('tablet do setor → POST /api/v1/production/time-entries', () => {
  it('lançamento passa no validador real da V1; 100% conclui só se a V1 permitir; ontem e justificativa vão no corpo', () => {
    const feito = buildTimeEntryBody({ tarefa: tarefa(1), minutos: 75, pct: 100, pausas: ['Almoço / intervalo'] })
    expect(productionTimeEntryBodySchema.safeParse(feito).success).toBe(true)
    expect(feito).toMatchObject({ minutes: 75, markAsDone: true, sessionCompletionPct: 100, note: 'Pausas: Almoço / intervalo' })

    const naoPode = buildTimeEntryBody({ tarefa: tarefa(2, { canCompleteStep: false }), minutos: 30, pct: 100 })
    expect(naoPode.markAsDone).toBe(false)

    const ontem = buildTimeEntryBody({ tarefa: tarefa(3), minutos: 0.4, pct: 50, ontem: '2026-10-18', justificativa: { id: u(9), complemento: ' ' } })
    const parsed = productionTimeEntryBodySchema.safeParse(ontem)
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true)
    expect(ontem).toMatchObject({ minutes: 1, markAsDone: false, entryAt: '2026-10-18', justificationId: u(9), justificationComplement: null })
  })

  it('pede justificativa como a V1: fora de sequência, ou quando passa do previsto', () => {
    expect(precisaJustificar(tarefa(1, { requiresOutOfSequenceJustification: true }), 10)).toBe('sequencia')
    expect(precisaJustificar(tarefa(1, { realizedMinutes: 40 }), 20)).toBeNull()
    expect(precisaJustificar(tarefa(1, { realizedMinutes: 40 }), 21)).toBe('excesso')
    expect(precisaJustificar(tarefa(1, { plannedMinutes: null }), 500)).toBeNull()
  })

  it('cronômetro não conta a pausa; próxima tarefa = a recomendada, depois as atrasadas; concluída/bloqueada fora', () => {
    let c = iniciar(tarefa(1), 0)
    c = pausar(c, 'Almoço / intervalo', 30 * 60_000)
    c = continuar(c, 90 * 60_000)
    expect(minutosDe(c, 105 * 60_000)).toBe(45)
    expect(c.pausas).toEqual(['Almoço / intervalo'])

    const fila = tarefasAbertas([
      tarefa(1),
      tarefa(2, { group: 'overdue', isOverdue: true }),
      tarefa(3, { isNextRecommended: true }),
      tarefa(4, { isActivityCompleted: true, group: 'completed' }),
      tarefa(5, { canTrackTime: false, blockingReason: 'Esteira parada' }),
    ])
    expect(fila.map((t) => t.activityTitle)).toEqual(['Atividade 3', 'Atividade 2', 'Atividade 1'])
  })

  it('"outra atividade": corpo passa no validador real da V1; justificativa vai como exceção e/ou fora de sequência', () => {
    const c = { conveyorId: u(1), conveyorName: 'Gol', plate: 'ABC1D23', stepNodeId: u(300), activityTitle: 'Costura do volante', sectorTitle: 'Costura', isAssignedToMe: false, requiresJustification: true, isOutOfSequence: false, hasPreviousPendingStep: true, requiresOutOfSequenceJustification: false, canPointTime: true }
    const body = buildOutraBody(c, 45, { id: u(9), label: 'Ajudei outro setor', complemento: 'faltou gente' }, '2026-10-18')
    const parsed = productionUnassignedTimeEntryBodySchema.safeParse(body)
    expect(parsed.success, JSON.stringify(parsed.error?.issues)).toBe(true)
    expect(body).toMatchObject({ minutes: 45, entryAt: '2026-10-18', exceptionJustificationId: u(9), exceptionJustification: 'Ajudei outro setor: faltou gente', outOfSequenceJustificationId: u(9) })
    const minha = buildOutraBody({ ...c, isAssignedToMe: true, requiresJustification: false, hasPreviousPendingStep: false }, 30, null)
    expect(minha).toEqual({ conveyorId: u(1), stepNodeId: u(300), minutes: 30 })
  })
})
