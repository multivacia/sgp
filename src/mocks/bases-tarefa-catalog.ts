/**
 * Catálogo governado — Base de Tarefa (bloco reutilizável com identidade própria).
 * Não mutar na UI; ao adicionar à esteira, clonar para TarefaBlocoDraft.
 */

import type { TarefaBlocoDraft } from './nova-esteira-domain'
import { novoIdTarefaBloco } from './nova-esteira-domain'

export type BaseTarefaAtividade = {
  id: string
  nome: string
  estimativaMin: number
}

export type BaseTarefaCatalogItem = {
  id: string
  nome: string
  setores: string[]
  atividades: BaseTarefaAtividade[]
  tempoBaseMin: number
  observacoes: string
  referenciaOrigem: string
  veiculoContexto: string
  tipo: string
  tags: string[]
}

export const BASES_TAREFA_CATALOGO: BaseTarefaCatalogItem[] = [
  {
    id: 'bt-empty',
    nome: 'Pacote de validação · sem atividades na fonte',
    setores: ['Operação'],
    tempoBaseMin: 0,
    observacoes:
      'Entrada explícita para fluxos que precisam tratar catálogo sem linhas de atividade (sem preencher UI com atividades inventadas).',
    referenciaOrigem: 'Mock · validação estrutural',
    veiculoContexto: 'Universal',
    tipo: 'Validação',
    tags: ['validação', 'vazio'],
    atividades: [],
  },
  {
    id: 'bt-001',
    nome: 'Pacote desmontagem segura — bancos',
    setores: ['Desmontagem'],
    tempoBaseMin: 120,
    observacoes:
      'Checklist de torque e etiquetas de lado (motorista/passageiro) para remontagem.',
    referenciaOrigem: 'Biblioteca interna · Pacote A · v3',
    veiculoContexto: 'Universal',
    tipo: 'Desmontagem',
    tags: ['bancos', 'padrão'],
    atividades: [
      { id: 'x1', nome: 'Isolar bateria e airbag', estimativaMin: 20 },
      { id: 'x2', nome: 'Remover bancos com etiquetagem', estimativaMin: 55 },
      { id: 'x3', nome: 'Fotografar fixações', estimativaMin: 15 },
      { id: 'x4', nome: 'Encaminhar para tapeçaria', estimativaMin: 30 },
    ],
  },
  {
    id: 'bt-002',
    nome: 'Corte tecido — bancos dianteiros (par)',
    setores: ['Corte', 'Almoxarifado'],
    tempoBaseMin: 150,
    observacoes: 'Respeitar direção do pelo e sobra mínima de 3 cm nas bordas.',
    referenciaOrigem: 'Derivado de OS ET-002 · bancos dianteiros',
    veiculoContexto: 'Sedã',
    tipo: 'Corte',
    tags: ['corte', 'bancos'],
    atividades: [
      { id: 'y1', nome: 'Conferir lote do tecido', estimativaMin: 20 },
      { id: 'y2', nome: 'Posicionar padrões no cavalete', estimativaMin: 40 },
      { id: 'y3', nome: 'Cortar par dianteiro completo', estimativaMin: 90 },
    ],
  },
  {
    id: 'bt-003',
    nome: 'Costura capas — padrão reforçado',
    setores: ['Costura'],
    tempoBaseMin: 240,
    observacoes: 'Usar linha UV para áreas de atrito; reforço duplo em encostos.',
    referenciaOrigem: 'Biblioteca costura · Reforço urbano',
    veiculoContexto: 'Universal',
    tipo: 'Costura',
    tags: ['costura', 'reforço'],
    atividades: [
      { id: 'z1', nome: 'Preparar viés e zíperes', estimativaMin: 40 },
      { id: 'z2', nome: 'Costurar assentos', estimativaMin: 120 },
      { id: 'z3', nome: 'Conferir encaixe em mesa', estimativaMin: 80 },
    ],
  },
  {
    id: 'bt-004',
    nome: 'Aplicação forro de teto — cola quente',
    setores: ['Tapeçaria'],
    tempoBaseMin: 200,
    observacoes: 'Controle de temperatura e tempo de abertura da cola por lote.',
    referenciaOrigem: 'Projeto piloto · Teto 2025',
    veiculoContexto: 'Hatch',
    tipo: 'Forros',
    tags: ['teto', 'cola'],
    atividades: [
      { id: 'w1', nome: 'Preparar superfície', estimativaMin: 45 },
      { id: 'w2', nome: 'Aplicar cola e posicionar tecido', estimativaMin: 95 },
      { id: 'w3', nome: 'Acabamento bordas e máscaras', estimativaMin: 60 },
    ],
  },
  {
    id: 'bt-005',
    nome: 'Montagem final e QC tapeçaria',
    setores: ['Tapeçaria', 'Pós-venda'],
    tempoBaseMin: 90,
    observacoes: 'Checklist de folgas, encaixe de airbag e limpeza final.',
    referenciaOrigem: 'QC padrão Bravo Tapeçaria',
    veiculoContexto: 'Universal',
    tipo: 'Montagem',
    tags: ['qc', 'final'],
    atividades: [
      { id: 'v1', nome: 'Instalar bancos e travar fixações', estimativaMin: 45 },
      { id: 'v2', nome: 'Teste airbag e conectores', estimativaMin: 25 },
      { id: 'v3', nome: 'Limpeza e entrega fotográfica', estimativaMin: 20 },
    ],
  },
]

export function listBasesTarefa(): BaseTarefaCatalogItem[] {
  return BASES_TAREFA_CATALOGO
}

export function getBaseTarefa(id: string): BaseTarefaCatalogItem | undefined {
  return BASES_TAREFA_CATALOGO.find((b) => b.id === id)
}

export type FiltroBaseTarefa = {
  busca: string
  veiculo: string
  tipo: string
  tag: string
}

export function filterBasesTarefa(
  items: BaseTarefaCatalogItem[],
  f: FiltroBaseTarefa,
): BaseTarefaCatalogItem[] {
  const q = f.busca.trim().toLowerCase()
  return items.filter((b) => {
    if (q) {
      const blob = `${b.nome} ${b.observacoes} ${b.referenciaOrigem} ${b.veiculoContexto} ${b.tipo} ${b.tags.join(' ')}`.toLowerCase()
      if (!blob.includes(q)) return false
    }
    if (f.veiculo && b.veiculoContexto !== f.veiculo) return false
    if (f.tipo && b.tipo !== f.tipo) return false
    if (f.tag && !b.tags.includes(f.tag)) return false
    return true
  })
}

export function cloneBaseTarefaParaDraft(bt: BaseTarefaCatalogItem): TarefaBlocoDraft {
  return {
    id: novoIdTarefaBloco(),
    nome: bt.nome,
    ordem: 0,
    setores: [...bt.setores],
    atividadesCount: bt.atividades.length,
    estimativaMin: bt.tempoBaseMin,
    observacao: bt.observacoes,
    sourceBaseTarefaId: bt.id,
  }
}

export const BASE_TAREFA_VEICULOS_FILTRO = [
  ...new Set(BASES_TAREFA_CATALOGO.map((b) => b.veiculoContexto)),
].sort()

export const BASE_TAREFA_TIPOS_FILTRO = [
  ...new Set(BASES_TAREFA_CATALOGO.map((b) => b.tipo)),
].sort()

export const BASE_TAREFA_TAGS_FILTRO = [
  ...new Set(BASES_TAREFA_CATALOGO.flatMap((b) => b.tags)),
].sort()
