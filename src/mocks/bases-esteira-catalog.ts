/**
 * Catálogo governado — Base de Esteira (modelo completo reutilizável).
 * Não mutar estes objetos na UI; clonar para estado editável.
 */

import type { TarefaBlocoDraft } from './nova-esteira-domain'
import { novoIdTarefaBloco } from './nova-esteira-domain'

export type BaseEsteiraTarefaCatalogo = {
  id: string
  nome: string
  ordem: number
  setores: string[]
  atividades: { id: string; nome: string }[]
  estimativaMin: number
}

export type BaseEsteiraCatalogItem = {
  id: string
  nome: string
  veiculoContexto: string
  tipo: string
  tags: string[]
  descricaoCurta: string
  tarefas: BaseEsteiraTarefaCatalogo[]
}

function sumEstimativa(tarefas: BaseEsteiraTarefaCatalogo[]): number {
  return tarefas.reduce((s, t) => s + t.estimativaMin, 0)
}

export const BASES_ESTEIRA_CATALOGO: BaseEsteiraCatalogItem[] = [
  {
    id: 'be-001',
    nome: 'Reforma interna completa — hatch médio',
    veiculoContexto: 'Hatch · 4 portas',
    tipo: 'Tapeçaria completa',
    tags: ['premium', 'bancos', 'forros'],
    descricaoCurta:
      'Sequência consolidada para reforma total de tapeçaria interna com foco em bancos e forros.',
    tarefas: [
      {
        id: 'be-001-t1',
        nome: 'Desmontagem e diagnóstico',
        ordem: 1,
        setores: ['Desmontagem', 'Tapeçaria'],
        atividades: [
          { id: 'a1', nome: 'Registrar estado e fotografar' },
          { id: 'a2', nome: 'Remover bancos dianteiros' },
          { id: 'a3', nome: 'Inspecionar espumas e guias' },
        ],
        estimativaMin: 420,
      },
      {
        id: 'be-001-t2',
        nome: 'Corte e preparação de materiais',
        ordem: 2,
        setores: ['Corte', 'Almoxarifado'],
        atividades: [
          { id: 'a4', nome: 'Conferir tecido aprovado' },
          { id: 'a5', nome: 'Cortar padrões banco motorista' },
          { id: 'a6', nome: 'Cortar padrões banco passageiro' },
        ],
        estimativaMin: 360,
      },
      {
        id: 'be-001-t3',
        nome: 'Costura e montagem bancos',
        ordem: 3,
        setores: ['Costura', 'Tapeçaria'],
        atividades: [
          { id: 'a7', nome: 'Costurar capas principais' },
          { id: 'a8', nome: 'Aplicar espumas novas' },
          { id: 'a9', nome: 'Montar bancos no veículo' },
        ],
        estimativaMin: 900,
      },
    ],
  },
  {
    id: 'be-002',
    nome: 'Somente bancos dianteiros — veículo urbano',
    veiculoContexto: 'Sedã / urbano',
    tipo: 'Bancos',
    tags: ['rápido', 'padrão'],
    descricaoCurta:
      'Fluxo enxuto para troca de revestimento dos bancos dianteiros com acabamento padrão.',
    tarefas: [
      {
        id: 'be-002-t1',
        nome: 'Remoção e preparação',
        ordem: 1,
        setores: ['Desmontagem'],
        atividades: [
          { id: 'b1', nome: 'Remover bancos' },
          { id: 'b2', nome: 'Limpar trilhos e fixações' },
        ],
        estimativaMin: 180,
      },
      {
        id: 'be-002-t2',
        nome: 'Revestimento e retorno',
        ordem: 2,
        setores: ['Tapeçaria', 'Costura'],
        atividades: [
          { id: 'b3', nome: 'Aplicar novo revestimento' },
          { id: 'b4', nome: 'Conferir costuras e encaixe' },
          { id: 'b5', nome: 'Reinstalar bancos' },
        ],
        estimativaMin: 480,
      },
    ],
  },
  {
    id: 'be-003',
    nome: 'Teto e colunas — acabamento tecido',
    veiculoContexto: 'Universal',
    tipo: 'Forros',
    tags: ['teto', 'colunas'],
    descricaoCurta:
      'Base para substituição de forro de teto e revestimento de colunas A/B.',
    tarefas: [
      {
        id: 'be-003-t1',
        nome: 'Desmontagem forros',
        ordem: 1,
        setores: ['Desmontagem'],
        atividades: [
          { id: 'c1', nome: 'Remover máscaras e luminárias' },
          { id: 'c2', nome: 'Baixar forro central' },
        ],
        estimativaMin: 240,
      },
      {
        id: 'be-003-t2',
        nome: 'Corte e aplicação teto',
        ordem: 2,
        setores: ['Corte', 'Tapeçaria'],
        atividades: [
          { id: 'c3', nome: 'Medir e cortar tecido teto' },
          { id: 'c4', nome: 'Colar e tensionar' },
        ],
        estimativaMin: 360,
      },
      {
        id: 'be-003-t3',
        nome: 'Colunas e acabamento',
        ordem: 3,
        setores: ['Tapeçaria'],
        atividades: [
          { id: 'c5', nome: 'Revestir colunas' },
          { id: 'c6', nome: 'Reinstalar máscaras' },
        ],
        estimativaMin: 300,
      },
    ],
  },
]

export function listBasesEsteira(): BaseEsteiraCatalogItem[] {
  return BASES_ESTEIRA_CATALOGO
}

export function getBaseEsteira(id: string): BaseEsteiraCatalogItem | undefined {
  return BASES_ESTEIRA_CATALOGO.find((b) => b.id === id)
}

export type FiltroBaseEsteira = {
  busca: string
  veiculo: string
  tipo: string
  tag: string
}

export function filterBasesEsteira(
  items: BaseEsteiraCatalogItem[],
  f: FiltroBaseEsteira,
): BaseEsteiraCatalogItem[] {
  const q = f.busca.trim().toLowerCase()
  return items.filter((b) => {
    if (q) {
      const blob = `${b.nome} ${b.descricaoCurta} ${b.veiculoContexto} ${b.tipo} ${b.tags.join(' ')}`.toLowerCase()
      if (!blob.includes(q)) return false
    }
    if (f.veiculo && b.veiculoContexto !== f.veiculo) return false
    if (f.tipo && b.tipo !== f.tipo) return false
    if (f.tag && !b.tags.includes(f.tag)) return false
    return true
  })
}

export function estimativaBaseTotalMin(be: BaseEsteiraCatalogItem): number {
  return sumEstimativa(be.tarefas)
}

export function setoresBaseEsteira(be: BaseEsteiraCatalogItem): string[] {
  const s = new Set<string>()
  for (const t of be.tarefas) for (const x of t.setores) s.add(x)
  return [...s].sort()
}

export function totalAtividadesBaseEsteira(be: BaseEsteiraCatalogItem): number {
  return be.tarefas.reduce((s, t) => s + t.atividades.length, 0)
}

/** Clona a base para blocos editáveis na tela (novos IDs de instância). */
export function cloneBaseEsteiraParaDrafts(be: BaseEsteiraCatalogItem): TarefaBlocoDraft[] {
  return be.tarefas
    .slice()
    .sort((a, b) => a.ordem - b.ordem)
    .map((t, i) => ({
      id: novoIdTarefaBloco(),
      nome: t.nome,
      ordem: i + 1,
      setores: [...t.setores],
      atividadesCount: t.atividades.length,
      estimativaMin: t.estimativaMin,
      observacao: `Da base «${be.nome}» · ${t.id}`,
    }))
}

export const BASE_ESTEIRA_VEICULOS_FILTRO = [
  ...new Set(BASES_ESTEIRA_CATALOGO.map((b) => b.veiculoContexto)),
].sort()

export const BASE_ESTEIRA_TIPOS_FILTRO = [
  ...new Set(BASES_ESTEIRA_CATALOGO.map((b) => b.tipo)),
].sort()

export const BASE_ESTEIRA_TAGS_FILTRO = [
  ...new Set(BASES_ESTEIRA_CATALOGO.flatMap((b) => b.tags)),
].sort()
