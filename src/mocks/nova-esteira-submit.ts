import type { BacklogPriority } from './backlog'

export type NovaEsteiraDadosIniciais = {
  nome: string
  cliente: string
  veiculo: string
  modeloVersao: string
  placa: string
  observacoes: string
  responsavel: string
  /** Quando o responsável vem do catálogo oficial (Nova Esteira). */
  colaboradorId?: string
  prazoEstimado: string
  prioridade: BacklogPriority | ''
}
