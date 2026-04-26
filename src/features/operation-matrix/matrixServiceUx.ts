import type { MatrixNodeType } from '../../domain/operation-matrix/operation-matrix.types'

/**
 * Diretriz conceitual permanente — Matrizes de operação:
 * a matriz é tratada como um *menu de serviços/opções* para compor o que o cliente deseja.
 *
 * Hierarquia: Item = oferta principal → Task = opção/bloco de serviço →
 * Setor = área de execução → Atividade = detalhamento operacional interno.
 *
 * UX: composição de serviço (não cadastro técnico); Task em protagonismo;
 * setor/atividade como aprofundamento, não foco primário.
 */

/** Rótulos curtos para UI (badges, tipo do nó). */
export const matrixUxNodeLabel: Record<MatrixNodeType, string> = {
  ITEM: 'Oferta',
  TASK: 'Opção',
  SECTOR: 'Área',
  ACTIVITY: 'Etapa',
}

/** CTAs ao adicionar filho — linguagem de composição de serviço. */
export const matrixUxAddChildCta: Record<MatrixNodeType, string> = {
  ITEM: 'Adicionar opção ao serviço',
  TASK: 'Adicionar área',
  SECTOR: 'Adicionar etapa operacional',
  ACTIVITY: 'Adicionar',
}
