/**
 * Catálogo governado — blocos operacionais disponíveis na origem MANUAL (montagem tipo pedido).
 * Não mutar na UI; usar apenas leitura + clone para estado da tela.
 *
 * Ordem do array é determinística (índice = ordem de apresentação no catálogo).
 */

import type { NovaEsteiraBlocoTipo } from './nova-esteira-bloco-contrato'

/** Metadados da Nova Esteira (composição/validação) por item de catálogo. */
export type NovaEsteiraCatalogoMeta = {
  tipo: NovaEsteiraBlocoTipo
  /** Se true, a montagem só materializa com este bloco ativo e configurado. */
  obrigatorioMontagem?: boolean
  /** IDs de catálogo que não podem coexistir com este bloco ativo. */
  incompatibilidadesCatalogoIds?: string[]
  /** Pré-requisitos operacionais (mesmo significado que preRequisitosCatalogoIds; duplicado para leitura de domínio). */
  dependenciasOpcionaisCatalogoIds?: string[]
}

export type SubopcaoBloco = {
  id: string
  label: string
}

/** Template interno para modo "estrutura básica" (mock). */
export type TemplateBasicoBloco = {
  setores: string[]
  atividadesCount: number
  estimativaMin: number
}

/** Textos de leitura operacional — consumidos na composição e na revisão. */
export type BlocoOperacionalLeitura = {
  /** O que o bloco representa no chão (uma linha). */
  intencao?: string
  /** Complemento do resumo quando o bloco está configurado. */
  resumoLinha?: string
  /** Impactos além de “Aciona: setores”. */
  impactosExtras?: string[]
  /** Se false e houver impactosExtras, não repete o impacto por setores. Default: true. */
  manterImpactoSetores?: boolean
}

export type BlocoOperacionalDef = {
  id: string
  nome: string
  /** Rótulo curto para checklist */
  nomeLista: string
  /** Classificação e regras da Nova Esteira por blocos. */
  novaEsteira: NovaEsteiraCatalogoMeta
  /** Catálogos de bloco que devem aparecer antes na montagem (regra explícita). */
  preRequisitosCatalogoIds?: string[]
  subopcoes?: SubopcaoBloco[]
  basico: TemplateBasicoBloco
  /** Fallback quando não há subopção obrigatória */
  manualPadrao: {
    estimativaMin: number
    atividadesCount: number
    setores: string[]
  }
  /** Leitura rica para revisão e materialização conceitual. */
  operacional?: BlocoOperacionalLeitura
}

export const TIPO_BLOCO_ORDEM: NovaEsteiraBlocoTipo[] = [
  'base',
  'estrutura',
  'setor',
  'fluxo',
  'apoio',
  'controle',
]

export const LABEL_GRUPO_TIPO_BLOCO: Record<NovaEsteiraBlocoTipo, string> = {
  base: 'Base e entrada',
  estrutura: 'Estrutura e desmontagem',
  setor: 'Setores de tapeçaria',
  fluxo: 'Fluxo de serviço',
  apoio: 'Apoio e acabamento',
  controle: 'Controle e liberação',
}

export const BLOCOS_OPERACIONAIS_CATALOGO: BlocoOperacionalDef[] = [
  {
    id: 'bo-limpeza',
    nome: 'Limpeza e higienização de cabine',
    nomeLista: 'Limpeza inicial',
    novaEsteira: {
      tipo: 'base',
      obrigatorioMontagem: true,
      dependenciasOpcionaisCatalogoIds: ['bo-registro-entrada'],
    },
    basico: {
      setores: ['Preparação'],
      atividadesCount: 2,
      estimativaMin: 45,
    },
    manualPadrao: {
      estimativaMin: 45,
      atividadesCount: 2,
      setores: ['Preparação'],
    },
    operacional: {
      intencao: 'Remove sujeira e odores antes de desmontar — base para rastreabilidade.',
      resumoLinha: 'Porta de entrada para o restante da montagem',
      impactosExtras: ['Reduz retrabalho por contaminação em costura e colagem'],
    },
  },
  {
    id: 'bo-registro-entrada',
    nome: 'Registro fotográfico e checklist de entrada',
    nomeLista: 'Registro de entrada',
    novaEsteira: {
      tipo: 'base',
      dependenciasOpcionaisCatalogoIds: ['bo-limpeza'],
    },
    basico: {
      setores: ['Preparação', 'Recepção'],
      atividadesCount: 2,
      estimativaMin: 25,
    },
    manualPadrao: {
      estimativaMin: 25,
      atividadesCount: 2,
      setores: ['Preparação'],
    },
    operacional: {
      intencao: 'Documenta estado inicial para divergências e garantia.',
      resumoLinha: 'Evidências antes de intervenção',
      impactosExtras: ['Suporte a contestação e pós-venda documentado'],
      manterImpactoSetores: true,
    },
  },
  {
    id: 'bo-mascaramento',
    nome: 'Mascaramento de painel, vidros e colunas',
    nomeLista: 'Mascaramento',
    novaEsteira: {
      tipo: 'apoio',
      dependenciasOpcionaisCatalogoIds: ['bo-registro-entrada'],
    },
    preRequisitosCatalogoIds: ['bo-limpeza'],
    basico: {
      setores: ['Preparação', 'Tapeçaria'],
      atividadesCount: 3,
      estimativaMin: 60,
    },
    manualPadrao: {
      estimativaMin: 50,
      atividadesCount: 2,
      setores: ['Tapeçaria'],
    },
    operacional: {
      intencao: 'Protege acabamentos que não entram na reforma.',
      resumoLinha: 'Evita arranhões e respingos em áreas sensíveis',
      impactosExtras: ['Menos retrabalho em painel e molduras'],
    },
  },
  {
    id: 'bo-desmontagem',
    nome: 'Desmontagem de bancos e componentes internos',
    nomeLista: 'Desmontagem',
    novaEsteira: {
      tipo: 'estrutura',
      dependenciasOpcionaisCatalogoIds: ['bo-montagem-final'],
    },
    basico: {
      setores: ['Desmontagem'],
      atividadesCount: 4,
      estimativaMin: 180,
    },
    manualPadrao: {
      estimativaMin: 180,
      atividadesCount: 3,
      setores: ['Desmontagem'],
    },
    operacional: {
      intencao: 'Libera acesso a estruturas e espumas para tapeçaria.',
      resumoLinha: 'Define o que pode ser cortado e removido com segurança',
      impactosExtras: ['Encadeia com montagem final na ordem correta'],
    },
  },
  {
    id: 'bo-bancos-diant',
    nome: 'Bancos dianteiros',
    nomeLista: 'Bancos dianteiros',
    novaEsteira: {
      tipo: 'fluxo',
      incompatibilidadesCatalogoIds: ['bo-bancos-tras'],
    },
    subopcoes: [
      { id: 'esq', label: 'Esquerdo' },
      { id: 'dir', label: 'Direito' },
      { id: 'ambos', label: 'Ambos' },
    ],
    basico: {
      setores: ['Tapeçaria', 'Costura'],
      atividadesCount: 5,
      estimativaMin: 360,
    },
    manualPadrao: {
      estimativaMin: 300,
      atividadesCount: 4,
      setores: ['Tapeçaria'],
    },
    operacional: {
      intencao: 'Reforma ou troca do conjunto dianteiro com acabamento alinhado ao projeto.',
      resumoLinha: 'Alto impacto em ergonomia e visão do habitáculo',
    },
  },
  {
    id: 'bo-bancos-tras',
    nome: 'Bancos traseiros',
    nomeLista: 'Bancos traseiros',
    novaEsteira: {
      tipo: 'fluxo',
      incompatibilidadesCatalogoIds: ['bo-bancos-diant'],
    },
    subopcoes: [
      { id: 'esq', label: 'Esquerdo' },
      { id: 'dir', label: 'Direito' },
      { id: 'ambos', label: 'Ambos' },
    ],
    basico: {
      setores: ['Tapeçaria', 'Costura'],
      atividadesCount: 4,
      estimativaMin: 300,
    },
    manualPadrao: {
      estimativaMin: 240,
      atividadesCount: 3,
      setores: ['Tapeçaria'],
    },
    operacional: {
      intencao: 'Trabalho no encosto/traseira — costura e espuma em volume diferente do dianteiro.',
      resumoLinha: 'Define ocupação e encosto para passageiros',
    },
  },
  {
    id: 'bo-carpete',
    nome: 'Carpete e forração de piso',
    nomeLista: 'Carpete',
    novaEsteira: {
      tipo: 'setor',
      incompatibilidadesCatalogoIds: ['bo-piso-vinil'],
    },
    basico: {
      setores: ['Tapeçaria'],
      atividadesCount: 3,
      estimativaMin: 200,
    },
    manualPadrao: {
      estimativaMin: 180,
      atividadesCount: 3,
      setores: ['Tapeçaria'],
    },
    operacional: {
      intencao: 'Troca ou recuperação de carpete moldado ao assoalho.',
      resumoLinha: 'Exige sequência limpa após desmontagem de bancos',
    },
  },
  {
    id: 'bo-piso-vinil',
    nome: 'Piso vinílico / laminado moldado',
    nomeLista: 'Piso vinílico',
    novaEsteira: {
      tipo: 'setor',
      incompatibilidadesCatalogoIds: ['bo-carpete'],
    },
    basico: {
      setores: ['Tapeçaria', 'Preparação'],
      atividadesCount: 3,
      estimativaMin: 190,
    },
    manualPadrao: {
      estimativaMin: 170,
      atividadesCount: 3,
      setores: ['Tapeçaria'],
    },
    operacional: {
      intencao: 'Alternativa ao carpete em veículos com piso técnico diferente.',
      resumoLinha: 'Incompatível com carpete moldado no mesmo piso',
      impactosExtras: ['Perfil de corte e borda diferente do carpete'],
    },
  },
  {
    id: 'bo-forros',
    nome: 'Forros de teto (laterais)',
    nomeLista: 'Forros',
    novaEsteira: {
      tipo: 'setor',
      incompatibilidadesCatalogoIds: ['bo-teto'],
    },
    basico: {
      setores: ['Tapeçaria', 'Corte'],
      atividadesCount: 4,
      estimativaMin: 280,
    },
    manualPadrao: {
      estimativaMin: 240,
      atividadesCount: 3,
      setores: ['Tapeçaria'],
    },
    operacional: {
      intencao: 'Revestimento das áreas laterais do teto sem trocar o teto central.',
      resumoLinha: 'Escolha excludente com reforma completa de teto',
    },
  },
  {
    id: 'bo-teto',
    nome: 'Teto (central e acabamentos)',
    nomeLista: 'Teto',
    novaEsteira: {
      tipo: 'setor',
      incompatibilidadesCatalogoIds: ['bo-forros'],
    },
    basico: {
      setores: ['Tapeçaria'],
      atividadesCount: 4,
      estimativaMin: 260,
    },
    manualPadrao: {
      estimativaMin: 220,
      atividadesCount: 3,
      setores: ['Tapeçaria'],
    },
    operacional: {
      intencao: 'Reforma do teto central, forro e iluminação embutida.',
      resumoLinha: 'Impacto visual dominante no habitáculo',
    },
  },
  {
    id: 'bo-laterais-portas',
    nome: 'Laterais de portas e painéis internos',
    nomeLista: 'Laterais de portas',
    novaEsteira: { tipo: 'setor' },
    subopcoes: [
      { id: 'diant', label: 'Dianteiros' },
      { id: 'tras', label: 'Traseiros' },
      { id: 'quatro', label: 'Quatro portas' },
    ],
    basico: {
      setores: ['Tapeçaria', 'Corte'],
      atividadesCount: 4,
      estimativaMin: 240,
    },
    manualPadrao: {
      estimativaMin: 200,
      atividadesCount: 3,
      setores: ['Tapeçaria'],
    },
    operacional: {
      intencao: 'Revestimento dos cards das portas alinhado a vidros e fechaduras.',
      resumoLinha: 'Coordena com borrachas e acabamentos de coluna',
    },
  },
  {
    id: 'bo-painel',
    nome: 'Painel e molduras centrais',
    nomeLista: 'Painel',
    novaEsteira: { tipo: 'setor' },
    basico: {
      setores: ['Tapeçaria', 'Elétrica'],
      atividadesCount: 3,
      estimativaMin: 200,
    },
    manualPadrao: {
      estimativaMin: 180,
      atividadesCount: 2,
      setores: ['Tapeçaria'],
    },
    operacional: {
      intencao: 'Acabamento em torno de comandos e airbags — exige cuidado com elétrica.',
      resumoLinha: 'Interface com máscaramento e desmontagem parcial',
    },
  },
  {
    id: 'bo-porta-malas',
    nome: 'Porta-malas e piso de bagagem',
    nomeLista: 'Porta-malas',
    novaEsteira: { tipo: 'fluxo' },
    subopcoes: [
      { id: 'tampon', label: 'Tampão' },
      { id: 'laterais', label: 'Laterais' },
      { id: 'piso', label: 'Piso' },
      { id: 'completo', label: 'Completo' },
    ],
    basico: {
      setores: ['Tapeçaria', 'Corte'],
      atividadesCount: 4,
      estimativaMin: 240,
    },
    manualPadrao: {
      estimativaMin: 200,
      atividadesCount: 3,
      setores: ['Tapeçaria'],
    },
    operacional: {
      intencao: 'Recuperação do compartimento com foco em ruído e vedação.',
      resumoLinha: 'Pode exigir desmontagem de forração traseira',
    },
  },
  {
    id: 'bo-volante',
    nome: 'Volante (revestimento ou troca)',
    nomeLista: 'Volante',
    novaEsteira: {
      tipo: 'fluxo',
      dependenciasOpcionaisCatalogoIds: ['bo-desmontagem', 'bo-painel'],
    },
    subopcoes: [
      { id: 'revestir', label: 'Revestir' },
      { id: 'troca', label: 'Troca' },
    ],
    basico: {
      setores: ['Tapeçaria', 'Elétrica'],
      atividadesCount: 2,
      estimativaMin: 90,
    },
    manualPadrao: {
      estimativaMin: 75,
      atividadesCount: 2,
      setores: ['Tapeçaria'],
    },
    operacional: {
      intencao: 'Contato direto com airbag — seguir protocolo de desenergização.',
      resumoLinha: 'Acoplamento com painel e comandos',
      impactosExtras: ['Checklist de segurança elétrica obrigatório no chão'],
    },
  },
  {
    id: 'bo-console-cambio',
    nome: 'Console central e alavanca',
    nomeLista: 'Console / câmbio',
    novaEsteira: {
      tipo: 'fluxo',
      dependenciasOpcionaisCatalogoIds: ['bo-desmontagem'],
    },
    subopcoes: [
      { id: 'revest', label: 'Revestimento' },
      { id: 'troca', label: 'Troca de peça' },
    ],
    basico: {
      setores: ['Tapeçaria'],
      atividadesCount: 3,
      estimativaMin: 120,
    },
    manualPadrao: {
      estimativaMin: 100,
      atividadesCount: 2,
      setores: ['Tapeçaria'],
    },
    operacional: {
      intencao: 'Desmontagem parcial do console para forrar ou trocar molduras.',
      resumoLinha: 'Coordena com carpete e freio de estacionamento',
    },
  },
  {
    id: 'bo-retrovisores',
    nome: 'Retrovisores internos / borrachas',
    nomeLista: 'Retrovisores',
    novaEsteira: { tipo: 'apoio' },
    subopcoes: [
      { id: 'esq', label: 'Esquerdo' },
      { id: 'dir', label: 'Direito' },
      { id: 'par', label: 'Par' },
    ],
    basico: {
      setores: ['Tapeçaria'],
      atividadesCount: 2,
      estimativaMin: 90,
    },
    manualPadrao: {
      estimativaMin: 75,
      atividadesCount: 2,
      setores: ['Tapeçaria'],
    },
    operacional: {
      intencao: 'Peças pequenas com alto impacto visual na conclusão.',
      resumoLinha: 'Não bloqueia fluxo principal se atrasar',
    },
  },
  {
    id: 'bo-iluminacao-cabine',
    nome: 'Iluminação de cabine (teto e porta)',
    nomeLista: 'Iluminação cabine',
    novaEsteira: {
      tipo: 'apoio',
      dependenciasOpcionaisCatalogoIds: ['bo-teto', 'bo-forros'],
    },
    basico: {
      setores: ['Tapeçaria', 'Elétrica'],
      atividadesCount: 2,
      estimativaMin: 70,
    },
    manualPadrao: {
      estimativaMin: 60,
      atividadesCount: 2,
      setores: ['Elétrica'],
    },
    operacional: {
      intencao: 'LED e difusores — enriquece entrega sem travar outros setores.',
      resumoLinha: 'Opcional; melhora percepção de acabamento',
      impactosExtras: ['Teste de consumo e aquecimento após montagem'],
    },
  },
  {
    id: 'bo-montagem-final',
    nome: 'Montagem final e reaperto',
    nomeLista: 'Montagem final',
    novaEsteira: {
      tipo: 'fluxo',
      dependenciasOpcionaisCatalogoIds: ['bo-revisao-final'],
    },
    preRequisitosCatalogoIds: ['bo-desmontagem'],
    basico: {
      setores: ['Tapeçaria', 'Montagem'],
      atividadesCount: 4,
      estimativaMin: 200,
    },
    manualPadrao: {
      estimativaMin: 180,
      atividadesCount: 3,
      setores: ['Montagem'],
    },
    operacional: {
      intencao: 'Reinstala bancos, forros e acabamentos na ordem inversa da desmontagem.',
      resumoLinha: 'Fechamento físico antes dos controles de qualidade',
    },
  },
  {
    id: 'bo-revisao-final',
    nome: 'Revisão final de acabamento',
    nomeLista: 'Revisão final',
    novaEsteira: {
      tipo: 'controle',
      dependenciasOpcionaisCatalogoIds: ['bo-checkpoint-entrega'],
    },
    preRequisitosCatalogoIds: ['bo-montagem-final'],
    basico: {
      setores: ['Pós-venda', 'Tapeçaria'],
      atividadesCount: 3,
      estimativaMin: 90,
    },
    manualPadrao: {
      estimativaMin: 60,
      atividadesCount: 2,
      setores: ['Pós-venda'],
    },
    operacional: {
      intencao: 'Conferência visual e funcional antes da entrega ao cliente interno.',
      resumoLinha: 'Altera a leitura da revisão: passa a exigir checklist fechado',
      impactosExtras: ['Registro de não conformidades para retrabalho'],
      manterImpactoSetores: true,
    },
  },
  {
    id: 'bo-checkpoint-entrega',
    nome: 'Checkpoint de entrega e liberação',
    nomeLista: 'Checkpoint de entrega',
    novaEsteira: { tipo: 'controle' },
    preRequisitosCatalogoIds: ['bo-revisao-final'],
    basico: {
      setores: ['Pós-venda', 'Gestão'],
      atividadesCount: 2,
      estimativaMin: 40,
    },
    manualPadrao: {
      estimativaMin: 30,
      atividadesCount: 1,
      setores: ['Pós-venda'],
    },
    operacional: {
      intencao: 'Última trava antes de expedir ou mover para fila de cliente.',
      resumoLinha: 'Controle explícito — reforça rastreabilidade na revisão',
      impactosExtras: ['Assinatura simulada de liberação no mock'],
      manterImpactoSetores: true,
    },
  },
]

const byId = new Map(BLOCOS_OPERACIONAIS_CATALOGO.map((b) => [b.id, b]))

export function getBlocoOperacionalDef(id: string): BlocoOperacionalDef | undefined {
  return byId.get(id)
}

export function listBlocosOperacionais(): BlocoOperacionalDef[] {
  return BLOCOS_OPERACIONAIS_CATALOGO
}

/** Agrupamento natural para UI — ordem de tipos fixa. */
export function blocosOperacionaisPorGrupo(): {
  tipo: NovaEsteiraBlocoTipo
  label: string
  itens: BlocoOperacionalDef[]
}[] {
  const map = new Map<NovaEsteiraBlocoTipo, BlocoOperacionalDef[]>()
  for (const t of TIPO_BLOCO_ORDEM) {
    map.set(t, [])
  }
  for (const def of BLOCOS_OPERACIONAIS_CATALOGO) {
    const t = def.novaEsteira.tipo
    map.get(t)?.push(def)
  }
  return TIPO_BLOCO_ORDEM.map((tipo) => ({
    tipo,
    label: LABEL_GRUPO_TIPO_BLOCO[tipo],
    itens: map.get(tipo) ?? [],
  })).filter((g) => g.itens.length > 0)
}

export function subopcaoLabel(
  def: BlocoOperacionalDef,
  subopcaoId?: string,
): string | undefined {
  if (!subopcaoId || !def.subopcoes) return undefined
  return def.subopcoes.find((s) => s.id === subopcaoId)?.label
}

/** Nome exibido na esteira (bloco + detalhe de subopção se houver). */
export function nomeExibicaoBlocoOperacional(
  catalogoId: string,
  subopcaoId?: string,
): string {
  const def = getBlocoOperacionalDef(catalogoId)
  if (!def) return catalogoId
  const sub = subopcaoLabel(def, subopcaoId)
  return sub ? `${def.nome} · ${sub}` : def.nome
}
