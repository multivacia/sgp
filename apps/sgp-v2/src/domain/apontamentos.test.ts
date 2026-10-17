import { describe, expect, it } from 'vitest'
import { deleteTimeEntryBodySchema, patchTimeEntryBodySchema } from '../../../../server/src/modules/conveyors/conveyorAssignments.schemas'
import { corpoCorrecao, corpoRemocao, motivoCorrecao, type Lancamento } from './apontamentos'

const L: Lancamento = { id: 'x', collaboratorId: 'c', collaboratorName: 'Marta', minutes: 75, notes: null, entryAt: '2026-10-19T14:00:00.000Z', updatedAt: '2026-10-19T14:00:01.123Z' }

describe('gestora corrige apontamento (PATCH/DELETE da V1)', () => {
  it('correção leva o updatedAt lido (a V1 recusa se alguém mudou antes) e passa no validador real; sem motivo ou sem mudança não envia', () => {
    const motivo = motivoCorrecao('Esqueceu de pausar', 'almoço contou')
    const body = corpoCorrecao(L, 45, motivo)
    expect(body).toEqual({ expectedUpdatedAt: L.updatedAt, reason: 'Esqueceu de pausar: almoço contou', minutes: 45 })
    expect(patchTimeEntryBodySchema.safeParse(body).success).toBe(true)
    expect(corpoCorrecao(L, 75, motivo)).toBeNull()
    expect(corpoCorrecao(L, 45, motivoCorrecao(null, 'ok'))).toBeNull()
    const rem = corpoRemocao(motivoCorrecao('Lançou em dobro', ''))
    expect(deleteTimeEntryBodySchema.safeParse(rem).success).toBe(true)
    expect(corpoRemocao(null)).toBeNull()
  })
})
