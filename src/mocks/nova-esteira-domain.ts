/**
 * Domínio conceitual da criação de esteira (protótipo mock).
 *
 * - BacklogOrigin (`manual` | `documento`): como a OS entrou no backlog.
 * - NovaEsteiraEstruturaOrigem: como a estrutura da esteira foi montada nesta tela.
 * - Contrato rico por bloco: ver `nova-esteira-bloco-contrato.ts` (`NovaEsteiraBlocoOperacional`).
 *
 * Uma 4ª origem estrutural poderá ser acrescentada no union sem quebrar chamadas
 * existentes, desde que a UI continue a tratar apenas as três oficiais.
 */

/** Origem estrutural da criação — não confundir com BacklogOrigin. */
export type NovaEsteiraEstruturaOrigem =
  | 'MANUAL'
  | 'BASE_ESTEIRA'
  | 'BASE_TAREFA'
  /** Manual + referências no mesmo fluxo (substitui exclusão MANUAL vs BASE_TAREFA na UI). */
  | 'MONTAGEM_UNIFICADA'

/** Como o gestor monta um bloco operacional na origem MANUAL. */
export type ModoMontagemBloco = 'REFERENCIA' | 'MANUAL' | 'BASICO'

/**
 * Linha na montagem tipo pedido (origem MANUAL) — um bloco operacional incluído.
 */
export type LinhaBlocoOperacionalDraft = {
  instanceId: string
  catalogoId: string
  subopcaoId?: string
  modo: ModoMontagemBloco | null
  referenciaId?: string
  observacaoManual?: string
}

/** Extensão futura (não exposta na UI nesta fase). */
export type NovaEsteiraEstruturaOrigemFutura =
  | NovaEsteiraEstruturaOrigem
  | 'RESERVADO_FUTURO'

/**
 * Instância operacional em formação — bloco da esteira materializado para resumo/backlog.
 * Diferente de Base de Esteira (modelo completo) e do catálogo de blocos reutilizáveis.
 */
export type TarefaBlocoDraft = {
  id: string
  nome: string
  ordem: number
  setores: string[]
  atividadesCount: number
  estimativaMin: number
  observacao?: string
  /** Catálogo de bloco reutilizável (origem composição / referência). */
  sourceBaseTarefaId?: string
  /** Bloco operacional do checklist (origem MANUAL). */
  blocoOperacionalCatalogoId?: string
  modoMontagem?: ModoMontagemBloco
}

export function labelEstruturaOrigem(o: NovaEsteiraEstruturaOrigem): string {
  const map: Record<NovaEsteiraEstruturaOrigem, string> = {
    MANUAL: 'Criar do zero',
    BASE_ESTEIRA: 'Usar Base de Esteira',
    BASE_TAREFA: 'Montar por blocos de referência',
    MONTAGEM_UNIFICADA: 'Montagem operacional',
  }
  return map[o]
}

export function novoIdTarefaBloco(): string {
  return `tb-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function novoInstanceLinhaBloco(): string {
  return `lbo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function computeResumoDrafts(tarefas: TarefaBlocoDraft[]) {
  const setores = new Set<string>()
  let estimativaTotalMin = 0
  let totalAtividades = 0
  for (const t of tarefas) {
    estimativaTotalMin += t.estimativaMin
    totalAtividades += t.atividadesCount
    for (const s of t.setores) setores.add(s)
  }
  return {
    totalTarefas: tarefas.length,
    setores: [...setores].sort(),
    estimativaTotalMin,
    totalAtividades,
  }
}
