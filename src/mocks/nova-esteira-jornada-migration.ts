/**
 * Normalização de rascunhos legados (2 etapas / origens antigas) para o modelo atual.
 */

import type { NovaEsteiraDraft } from './nova-esteira-composicao'
import type {
  NovaEsteiraEtapaPersistida,
  NovaEsteiraRascunhoPersistido,
} from './nova-esteira-persistido'

/** Converte origens antigas em montagem unificada (manual + referências no mesmo bloco). */
export function normalizeNovaEsteiraDraft(draft: NovaEsteiraDraft): NovaEsteiraDraft {
  const o = draft.estruturaOrigem
  if (o === 'MANUAL') {
    return {
      ...draft,
      opcoes: draft.opcoes ?? [],
      estruturaOrigem: 'MONTAGEM_UNIFICADA',
      linhasManual: draft.linhasManual,
      tarefas: [],
    }
  }
  if (o === 'BASE_TAREFA') {
    return {
      ...draft,
      opcoes: draft.opcoes ?? [],
      estruturaOrigem: 'MONTAGEM_UNIFICADA',
      linhasManual: [],
      tarefas: draft.tarefas,
    }
  }
  return {
    ...draft,
    opcoes: draft.opcoes ?? [],
  }
}

export function normalizeEtapaPersistida(
  raw: string | undefined | null,
): NovaEsteiraEtapaPersistida {
  if (raw === 'revisao') return 'revisao'
  if (raw === 'dados_iniciais') return 'dados_iniciais'
  if (raw === 'estrutura_montagem') return 'estrutura_montagem'
  if (raw === 'montagem') return 'estrutura_montagem'
  return 'dados_iniciais'
}

export function normalizeRascunhoNovaEsteira(
  p: NovaEsteiraRascunhoPersistido,
): NovaEsteiraRascunhoPersistido {
  return {
    ...p,
    etapaAtual: normalizeEtapaPersistida(p.etapaAtual),
    draft: normalizeNovaEsteiraDraft(p.draft),
  }
}
