import { describe, expect, it } from 'vitest'
import { patchConveyorDadosBodySchema, postConveyorDadosSchema } from '../../../../server/src/modules/conveyors/conveyors.schemas'
import { dadosDe, dadosParaCriar, dadosVazios, erroDados, mudancasDados, patchDados } from './dadosEsteira'

const u = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`
const DETALHE = { name: 'Gol GTI · ABC1D23', clientName: 'Bruno', vehicle: 'Gol GTI', modelVersion: null, plate: 'ABC1D23', initialNotes: null, responsible: 'Ana', estimatedDeadline: '2026-10-23', priority: 'media' as const }

describe('dados básicos da esteira (mesmos campos da V1)', () => {
  it('inclusão: passa no validador real; nome vazio vira "veículo · PLACA"; placa em maiúsculas', () => {
    const d = { ...dadosVazios('2026-10-23', u(1)), veiculo: 'Gol GTI', placa: 'abc 1d23', modeloVersao: '1.0', observacoes: 'Cliente traz o volante', prioridade: 'alta' as const }
    const body = dadosParaCriar(d, 'Gol GTI completo')
    expect(postConveyorDadosSchema.safeParse(body).success).toBe(true)
    expect(body).toMatchObject({ nome: 'Gol GTI · ABC1D23', placa: 'ABC1D23', modeloVersao: '1.0', prioridade: 'alta', colaboradorId: u(1) })
    expect(erroDados(dadosVazios('', null))).not.toBeNull()
  })

  it('alteração: manda só o que mudou (com motivo passa no validador real); sem mudança não manda nada; "O que muda" legível', () => {
    const antes = dadosDe(DETALHE)
    expect(patchDados(antes, antes)).toEqual({})
    const depois = { ...antes, prazoEstimado: '2026-10-30', prioridade: 'alta' as const, colaboradorId: u(2), responsavel: 'Marta' }
    const patch = patchDados(antes, depois)
    expect(patch).toEqual({ prazoEstimado: '2026-10-30', prioridade: 'alta', responsavel: 'Marta', colaboradorId: u(2) })
    expect(patchConveyorDadosBodySchema.safeParse({ ...patch, reason: 'Cliente pediu mudança' }).success).toBe(true)
    expect(mudancasDados(antes, depois)).toEqual(['Responsável: Ana → Marta', 'Prazo: 23/10/2026 → 30/10/2026', 'Prioridade: Média → Alta'])
  })
})
