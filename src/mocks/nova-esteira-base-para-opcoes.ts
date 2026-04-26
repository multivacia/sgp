/**
 * Converte uma base de esteira do catálogo em hierarquia opção → área → etapa editável.
 */

import type { BaseEsteiraCatalogItem } from './bases-esteira-catalog'
import type { NovaEsteiraOpcaoDraft } from './nova-esteira-jornada-draft'
import { novoId, ordenarOpcoes } from './nova-esteira-opcoes-helpers'

export function mapBaseEsteiraParaOpcoes(be: BaseEsteiraCatalogItem): NovaEsteiraOpcaoDraft[] {
  const tarefas = [...be.tarefas].sort((a, b) => a.ordem - b.ordem)
  const areas = tarefas.map((t, i) => ({
    id: novoId('ar'),
    titulo: t.nome,
    origem: 'base' as const,
    ordem: i + 1,
    etapas: [
      {
        id: novoId('et'),
        titulo: `Execução · ${t.atividades.length} atividades`,
        tempoEstimadoMin: t.estimativaMin,
        origem: 'base' as const,
        ordem: 1,
      },
    ],
  }))
  const opcao: NovaEsteiraOpcaoDraft = {
    id: novoId('op'),
    titulo: `Pedido · ${be.nome}`,
    origem: 'base',
    ordem: 1,
    areas,
  }
  return ordenarOpcoes([opcao])
}
