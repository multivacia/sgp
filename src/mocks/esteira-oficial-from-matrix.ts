/**
 * Enriquece o detalhe legado da esteira com ids de matrix_nodes e metadados de opção/área.
 */

import type { EsteiraDetalheMock } from './esteira-detalhe-types'
import { computeResumoEsteira } from './esteira-detalhe-compute'
import {
  aggregateMatrixTotals,
  BRAVO_MATRIX_DISPLAY_NAME,
  buildOfficialBravoMatrixTreeMock,
} from './matrix-bravo-build-tree'
import {
  LEGACY_ESTEIRA_ET001,
  LEGACY_ESTEIRA_ET002,
  LEGACY_ESTEIRA_ET003,
  LEGACY_ESTEIRA_ET004,
  LEGACY_ESTEIRA_ET005,
} from './esteira-official-legacy'

const TREE = buildOfficialBravoMatrixTreeMock()

function enrichEsteiraDetalheComMatrix(
  legacy: EsteiraDetalheMock,
  taskOffset: number,
): EsteiraDetalheMock {
  const tarefas = legacy.tarefas.map((tf, i) => {
    const taskNode = TREE.children[taskOffset + i]
    if (!taskNode || taskNode.node_type !== 'TASK') {
      throw new Error(
        `matrix-bravo: TASK ausente no índice ${taskOffset + i} para ${legacy.id}`,
      )
    }
    const sectorNode = taskNode.children[0]
    if (!sectorNode || sectorNode.node_type !== 'SECTOR') {
      throw new Error(`matrix-bravo: SECTOR ausente para tarefa ${tf.id}`)
    }
    if (sectorNode.children.length !== tf.atividades.length) {
      throw new Error(
        `matrix-bravo: divergência de atividades em ${legacy.id} / ${tf.id}`,
      )
    }

    return {
      ...tf,
      matrixTaskNodeId: taskNode.id,
      matrixSectorNodeId: sectorNode.id,
      opcaoNome: taskNode.name,
      areaNome: sectorNode.name,
      atividades: tf.atividades.map((a, j) => {
        const actNode = sectorNode.children[j]
        if (!actNode || actNode.node_type !== 'ACTIVITY') {
          throw new Error(`matrix-bravo: ACTIVITY ausente para ${a.id}`)
        }
        return {
          ...a,
          matrixActivityNodeId: actNode.id,
        }
      }),
    }
  })

  let plannedFromMatrix = 0
  for (let i = 0; i < legacy.tarefas.length; i++) {
    const sector = TREE.children[taskOffset + i]!.children[0]!
    for (const act of sector.children) {
      plannedFromMatrix += act.planned_minutes ?? 0
    }
  }

  const enriched: EsteiraDetalheMock = {
    ...legacy,
    matrixRootId: TREE.id,
    matrixName: BRAVO_MATRIX_DISPLAY_NAME,
    tarefas,
  }

  const r = computeResumoEsteira(enriched)
  if (plannedFromMatrix !== r.estimativaTotalMin) {
    throw new Error(
      `matrix-bravo: minutos planejados da matriz não batem com o detalhe (${legacy.id}: ${plannedFromMatrix} vs ${r.estimativaTotalMin}).`,
    )
  }

  return enriched
}

/** et-001: primeiras 6 TASKs da matriz concatenada. */
export const ESTEIRA_ET001 = enrichEsteiraDetalheComMatrix(LEGACY_ESTEIRA_ET001, 0)

/** et-002: TASKs 7–9. */
export const ESTEIRA_ET002 = enrichEsteiraDetalheComMatrix(LEGACY_ESTEIRA_ET002, 6)

/** et-003: TASKs 10–11. */
export const ESTEIRA_ET003 = enrichEsteiraDetalheComMatrix(LEGACY_ESTEIRA_ET003, 9)

/** et-004: TASKs 12–13 (após et-001…et-003). */
export const ESTEIRA_ET004 = enrichEsteiraDetalheComMatrix(LEGACY_ESTEIRA_ET004, 11)

/** et-005: TASKs 14–15. */
export const ESTEIRA_ET005 = enrichEsteiraDetalheComMatrix(LEGACY_ESTEIRA_ET005, 13)

export { TREE as OFFICIAL_BRAVO_MATRIX_TREE_MOCK }

export function getOfficialBravoMatrixTotals() {
  return aggregateMatrixTotals(TREE)
}
