import { matchPath } from 'react-router-dom'
import type { ColorThemeId } from '../theme/theme-constants'
import {
  MANUAL_PUBLIC_DIR,
  MANUAL_PUBLIC_PATH,
  PRACTICAL_GUIDE_FILES,
  type PracticalGuideId,
} from './manual-paths'

/**
 * Âncora existente no HTML do Manual do Usuário (IDs gerados por
 * `scripts/generate-manual-usuario-html.mjs`): capítulo, seção numerada ou
 * subtítulo. O teste `manual-help.test.ts` confere cada uma contra o HTML gerado.
 */
export type ManualAnchor =
  | `cap-${number}`
  | `sec-${number}-${number}`
  | `cap-${number}-${string}`

export type ScreenHelp = {
  /** Padrão de rota (react-router). Parâmetros resolvem para a mesma ajuda. */
  pattern: string
  /** Nome da tela para o usuário. */
  screen: string
  /** Destino no manual, ou `null` quando a tela não tem capítulo correspondente. */
  anchor: ManualAnchor | null
  /** Obrigatório quando `anchor` é `null`: explica por que não há ajuda contextual. */
  noHelpReason?: string
}

const SEM_ENTRADA_NO_MENU =
  'Esta tela não tem entrada no menu e não é descrita no manual.'

/**
 * ÚNICO mapa entre telas do SGP+ e o Manual do Usuário.
 * Para ajustar um destino, altere só esta lista. Rotas fora do shell com cabeçalho
 * (Modo Fábrica e Kiosk têm layout próprio) não aparecem aqui.
 */
export const SCREEN_HELP: readonly ScreenHelp[] = [
  // Operação
  { pattern: '/app/backlog', screen: 'Painel operacional', anchor: 'cap-5' },
  {
    pattern: '/app/nova-esteira',
    screen: 'Nova esteira',
    anchor: 'cap-6-6-3-as-formas-de-criar-uma-esteira',
  },
  {
    pattern: '/app/esteiras/:id',
    screen: 'Detalhe da esteira',
    anchor: 'cap-6-6-2-ler-o-detalhe-de-uma-esteira',
  },
  {
    pattern: '/app/esteiras/:id/alterar',
    screen: 'Alterar esteira',
    anchor: 'cap-6-6-10-alterar-uma-esteira-existente',
  },
  {
    pattern: '/app/importar-os',
    screen: 'Nova esteira por documento',
    anchor: 'cap-17',
  },
  {
    pattern: '/app/gestao/esteiras/laboratorio',
    screen: 'Laboratório de Esteiras',
    anchor: null,
    noHelpReason: SEM_ENTRADA_NO_MENU,
  },
  // Apontamentos
  {
    pattern: '/app/apontamento/:taskId',
    screen: 'Apontamento',
    anchor: 'cap-7',
  },
  {
    pattern: '/app/gestao/apontamento/:stepNodeId',
    screen: 'Apontamento gerencial',
    anchor: 'cap-7-corrigir-remover-e-lancar-por-outra-pessoa',
  },
  // Planejamento
  {
    pattern: '/app/planejamento-semanal',
    screen: 'Planejamento semanal',
    anchor: 'cap-8',
  },
  { pattern: '/app/agenda-semanal', screen: 'Agenda da semana', anchor: 'cap-9' },
  {
    pattern: '/app/gestao/evolucao-esteiras',
    screen: 'Evolução das Esteiras',
    anchor: 'cap-14',
  },
  // Colaborador
  { pattern: '/app/minha-fila', screen: 'Minha fila', anchor: 'cap-10' },
  { pattern: '/app/jornada', screen: 'Minha jornada', anchor: 'cap-11' },
  {
    pattern: '/app/chamados',
    screen: 'Chamados',
    anchor: 'cap-19-19-9-acompanhar-os-seus-chamados',
  },
  {
    pattern: '/app/minhas-atividades',
    screen: 'Minhas Atividades',
    anchor: null,
    noHelpReason: SEM_ENTRADA_NO_MENU,
  },
  {
    pattern: '/app/meu-trabalho',
    screen: 'Meu Trabalho',
    anchor: null,
    noHelpReason: SEM_ENTRADA_NO_MENU,
  },
  // Gestão
  {
    pattern: '/app/gestao/jornada-colaborador',
    screen: 'Jornada por colaborador',
    anchor: 'cap-12',
  },
  { pattern: '/app/dashboard', screen: 'Dashboard', anchor: 'cap-15' },
  // Cadastros e administração
  {
    pattern: '/app/colaboradores',
    screen: 'Colaboradores',
    anchor: 'cap-16-16-2-consultar-colaboradores',
  },
  {
    pattern: '/app/colaboradores/saude-operacional',
    screen: 'Saúde operacional',
    anchor: 'cap-18',
  },
  {
    pattern: '/app/equipes',
    screen: 'Equipes',
    anchor: 'cap-16-16-17-equipes-consultar-criar-e-alterar',
  },
  {
    pattern: '/app/equipes/nova',
    screen: 'Nova equipe',
    anchor: 'cap-16-16-17-equipes-consultar-criar-e-alterar',
  },
  {
    pattern: '/app/equipes/:id',
    screen: 'Equipe',
    anchor: 'cap-16-16-18-equipes-membros-e-referencia',
  },
  {
    pattern: '/app/usuarios',
    screen: 'Usuários',
    anchor: 'cap-16-16-7-consultar-usuarios',
  },
  {
    pattern: '/app/configuracoes-operacionais',
    screen: 'Configurações operacionais',
    anchor: 'cap-16-16-11-setores',
  },
  {
    pattern: '/app/configuracoes/sistema',
    screen: 'Configurações do sistema',
    anchor: 'sec-3-6',
  },
  // Matrizes (o manual só descreve o uso da matriz na criação de esteiras)
  {
    pattern: '/app/matrizes-operacao',
    screen: 'Matrizes de operação',
    anchor: 'cap-6-6-5-criar-a-partir-de-uma-matriz',
  },
  {
    pattern: '/app/matrizes-operacao/nova',
    screen: 'Nova matriz de operação',
    anchor: 'cap-6-6-5-criar-a-partir-de-uma-matriz',
  },
  {
    pattern: '/app/matrizes-operacao/:itemId',
    screen: 'Matriz de operação',
    anchor: 'cap-6-6-5-criar-a-partir-de-uma-matriz',
  },
  {
    pattern: '/app/matrizes-operacao/:itemId/preview',
    screen: 'Pré-visualização da matriz',
    anchor: 'cap-6-6-5-criar-a-partir-de-uma-matriz',
  },
  // Permissões e auditoria
  {
    pattern: '/app/permissoes-por-papel',
    screen: 'Permissões por papel',
    anchor: 'cap-4-4-7-consultar-e-alterar-as-permissoes-de-um-perfil',
  },
  {
    pattern: '/app/usuarios/trilha',
    screen: 'Trilha administrativa',
    anchor: 'cap-4-4-8-conferir-alteracoes-de-permissao-na-trilha-administrativa',
  },
  // Conta
  {
    pattern: '/app/conta/alterar-senha',
    screen: 'Alterar senha',
    anchor: 'sec-3-3',
  },
]

const NO_MAPPING_REASON = 'Esta tela ainda não tem ajuda específica no manual.'

export type ResolvedScreenHelp = {
  screen: string | null
  anchor: ManualAnchor | null
  /** Preenchido quando `anchor` é `null`. */
  noHelpReason: string | null
}

/** Resolve a ajuda da tela atual; rotas com parâmetros usam o padrão correspondente. */
export function resolveScreenHelp(pathname: string): ResolvedScreenHelp {
  const path = (pathname.split(/[?#]/)[0] ?? pathname).replace(/(.)\/+$/, '$1')
  for (const entry of SCREEN_HELP) {
    if (matchPath({ path: entry.pattern, end: true }, path)) {
      return {
        screen: entry.screen,
        anchor: entry.anchor,
        noHelpReason: entry.anchor ? null : (entry.noHelpReason ?? NO_MAPPING_REASON),
      }
    }
  }
  return { screen: null, anchor: null, noHelpReason: NO_MAPPING_REASON }
}

export type ManualTheme = 'claro' | 'escuro'

/** O manual só tem dois temas: Light Executive é claro; os demais são escuros. */
export function manualThemeFor(themeId: ColorThemeId): ManualTheme {
  return themeId === 'light-executive' ? 'claro' : 'escuro'
}

/**
 * URL do manual aberto a partir do SGP+ (mesma aba, mesmo domínio).
 * Só leva o tema e o modo integrado; nunca dados de sessão ou de usuário.
 */
export function buildManualUrl(options: {
  theme: ManualTheme
  anchor?: ManualAnchor | null
}): string {
  const hash = options.anchor ? `#${options.anchor}` : ''
  return `${MANUAL_PUBLIC_PATH}?${integratedQuery(options.theme)}${hash}`
}

/** Guias Práticos oferecidos no menu "? Ajuda", na ordem de exibição. */
export const PRACTICAL_GUIDES: readonly { id: PracticalGuideId; label: string }[] = [
  { id: 'colaborador', label: 'Guia prático do colaborador' },
  { id: 'gestor', label: 'Guia prático do gestor' },
]

/** URL de um Guia Prático aberto a partir do SGP+ (mesmas regras do manual). */
export function buildGuideUrl(options: {
  guide: PracticalGuideId
  theme: ManualTheme
}): string {
  const file = PRACTICAL_GUIDE_FILES[options.guide]
  return `${MANUAL_PUBLIC_DIR}/${file}?${integratedQuery(options.theme)}`
}

function integratedQuery(theme: ManualTheme): string {
  return new URLSearchParams({ integrado: '1', tema: theme }).toString()
}
