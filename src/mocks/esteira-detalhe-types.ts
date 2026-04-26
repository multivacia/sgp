/**
 * Tipos do detalhe da esteira (mock) — extraídos para permitir matriz oficial sem ciclo de import.
 */

export type EsteiraStatusGeral =
  | 'em_execucao'
  | 'pausada'
  | 'concluida'
  | 'no_backlog'

export type AtividadeStatusDetalhe =
  | 'pendente'
  | 'pronta'
  | 'em_execucao'
  | 'pausada'
  | 'concluida'
  | 'bloqueada'

/** Prioridade relativa da atividade (linha) — não confundir com prioridade da esteira. */
export type AtividadePrioridade = 'baixa' | 'media' | 'alta' | 'critica'

export type EsteiraAtividadeMock = {
  id: string
  nome: string
  responsavel: string
  /** Identidade forte quando conhecida (mock governado); resolução também infere por nome na fonte oficial. */
  colaboradorId?: string
  setor: string
  status: AtividadeStatusDetalhe
  /** Minutos estimados */
  estimativaMin: number
  /** Minutos realizados (mock) */
  realizadoMin: number
  /** Urgência da atividade; ausente = leitura neutra (tratada como média na UI). */
  prioridade?: AtividadePrioridade
  /** Motivo operacional quando bloqueada (mock). */
  bloqueioMotivo?: string
  /** Observação curta do gestor na atividade. */
  observacaoGestor?: string
  /** Referência ao nó ACTIVITY em matrix_nodes (mock oficial). */
  matrixActivityNodeId?: string
}

export type TarefaStatusAgregado =
  | 'nao_iniciada'
  | 'em_andamento'
  | 'concluida'

export type EsteiraTarefaMock = {
  id: string
  nome: string
  ordem: number
  status: TarefaStatusAgregado
  atividades: EsteiraAtividadeMock[]
  /** Nó TASK (opção de serviço) em matrix_nodes. */
  matrixTaskNodeId?: string
  /** Nó SECTOR (área) em matrix_nodes. */
  matrixSectorNodeId?: string
  /** Rótulo da opção (TASK) — alinhado a matrix_nodes. */
  opcaoNome?: string
  /** Rótulo da área (SECTOR) — alinhado a matrix_nodes. */
  areaNome?: string
}

export type EsteiraDetalheMock = {
  id: string
  nome: string
  veiculo: string
  tipoOrigem: string
  referenciaOs: string
  statusGeral: EsteiraStatusGeral
  prioridade: 'alta' | 'media' | 'baixa'
  prazoTexto: string
  observacaoCurta?: string
  /** ITEM raiz da matriz operacional (matrix_nodes) associada ao mock. */
  matrixRootId?: string
  /** Nome exibível da matriz (ITEM raiz). */
  matrixName?: string
  tarefas: EsteiraTarefaMock[]
}
