import { describe, expect, it } from 'vitest'
import { aggregateMatrixTotals, buildOfficialBravoMatrixTreeMock } from './matrix-bravo-build-tree'
import {
  computeResumoEsteira,
  ESTEIRA_ET001,
  ESTEIRA_ET002,
  ESTEIRA_ET003,
  ESTEIRA_ET004,
  ESTEIRA_ET005,
} from './esteira-detalhe'
import { getEsteiraOperacionalDetalheMock } from './esteira-operacional'
import { getOfficialBravoMatrixTotals } from './esteira-oficial-from-matrix'

describe('matrix_nodes mock Bravo', () => {
  it('totais agregados da árvore = soma das três esteiras oficiais', () => {
    const tree = buildOfficialBravoMatrixTreeMock()
    const fromTree = aggregateMatrixTotals(tree)
    const fromTotalsHelper = getOfficialBravoMatrixTotals()
    expect(fromTotalsHelper).toEqual(fromTree)

    const r1 = computeResumoEsteira(ESTEIRA_ET001)
    const r2 = computeResumoEsteira(ESTEIRA_ET002)
    const r3 = computeResumoEsteira(ESTEIRA_ET003)
    const r4 = computeResumoEsteira(ESTEIRA_ET004)
    const r5 = computeResumoEsteira(ESTEIRA_ET005)
    const sumMin =
      r1.estimativaTotalMin +
      r2.estimativaTotalMin +
      r3.estimativaTotalMin +
      r4.estimativaTotalMin +
      r5.estimativaTotalMin
    const sumActs =
      r1.totalAtividades +
      r2.totalAtividades +
      r3.totalAtividades +
      r4.totalAtividades +
      r5.totalAtividades

    expect(sumMin).toBe(fromTree.totalPlannedMinutes)
    expect(sumActs).toBe(fromTree.totalSteps)
    expect(fromTree.totalOptions).toBe(15)
    expect(fromTree.totalAreas).toBe(15)
  })

  it('atividades da projeção et-001 carregam matrixActivityNodeId', () => {
    const op = getEsteiraOperacionalDetalheMock('et-001')
    expect(op).toBeDefined()
    const withMatrix = op!.blocos
      .flatMap((b) => b.atividades)
      .filter((a) => a.matrixActivityNodeId)
    expect(withMatrix.length).toBeGreaterThan(0)
  })
})
