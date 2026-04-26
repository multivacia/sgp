import { describe, expect, it } from 'vitest'
import { __resetApontamentosRuntimeForTests } from './apontamentos-repository'
import { __resetGestaoOverridesForTests } from './esteira-gestao-runtime'
import { getEsteiraOperacionalDetalheMock } from './esteira-operacional'

describe('esteira-step-analitico-mock (projeção)', () => {
  it('cada atividade carrega stepAnalitico com equipe e resumo', () => {
    __resetApontamentosRuntimeForTests()
    __resetGestaoOverridesForTests()
    const op = getEsteiraOperacionalDetalheMock('et-001')!
    const first = op.blocos[0]!.atividades[0]!
    expect(first.stepAnalitico).toBeDefined()
    expect(first.stepAnalitico!.equipe.principal).not.toBeNull()
    expect(first.stepAnalitico!.equipe.principal!.papel).toBe('principal')
    expect(first.stepAnalitico!.apontamentos.planejadoMin).toBe(first.estimativaMin)
  })
})
