/**
 * Achata opção → área → etapa em tarefas-bloco para composição mock e materialização.
 */

import type { NovaEsteiraOpcaoDraft } from './nova-esteira-jornada-draft'
import type { TarefaBlocoDraft } from './nova-esteira-domain'
import { ordenarOpcoes } from './nova-esteira-opcoes-helpers'

export function flattenOpcoesParaTarefasDrafts(
  opcoes: NovaEsteiraOpcaoDraft[],
): TarefaBlocoDraft[] {
  const ord = ordenarOpcoes(opcoes)
  const out: TarefaBlocoDraft[] = []
  let globalOrdem = 1
  for (const op of ord) {
    for (const ar of [...op.areas].sort((a, b) => a.ordem - b.ordem)) {
      for (const et of [...ar.etapas].sort((a, b) => a.ordem - b.ordem)) {
        out.push({
          id: et.id,
          nome: `${op.titulo} · ${ar.titulo} · ${et.titulo}`,
          ordem: globalOrdem++,
          setores: [],
          atividadesCount: Math.max(1, Math.round(et.tempoEstimadoMin / 60) || 1),
          estimativaMin: et.tempoEstimadoMin,
          observacao: `Opção «${op.titulo}»`,
        })
      }
    }
  }
  return out
}
