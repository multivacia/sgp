import type { MatrixNodeType } from '../../domain/operation-matrix/operation-matrix.types'

/**
 * UX operacional padronizada (R1-05): Item (oferta) → Tarefa → Setor → Atividade.
 * TASK/SECTOR/ACTIVITY em tipos/API; na interface só linguagem PT padronizada.
 */

/** Rótulos curtos para UI (badges, tipo do nó). */
export const matrixUxNodeLabel: Record<MatrixNodeType, string> = {
  ITEM: 'Oferta',
  TASK: 'Tarefa',
  SECTOR: 'Setor',
  ACTIVITY: 'Atividade',
}

/** CTAs ao adicionar filho — linguagem de composição de serviço. */
export const matrixUxAddChildCta: Record<MatrixNodeType, string> = {
  ITEM: 'Adicionar tarefa à oferta',
  TASK: 'Adicionar setor',
  SECTOR: 'Adicionar atividade',
  ACTIVITY: 'Adicionar',
}
