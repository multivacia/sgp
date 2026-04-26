/**
 * Definição declarativa do menu lateral — uma única fonte para visibilidade e documentação.
 * `navGroup` define o bloco visual no sidebar; `section` alimenta o contexto curto do shell (header).
 * Rotas protegidas continuam a ser aplicadas em `RequirePermission` / servidor.
 */

import {
  PERMISSION_OPERATIONAL_SETTINGS_MANAGE,
  PERMISSION_RBAC_MANAGE_ROLE_PERMISSIONS,
} from '../permissions/permissionCodes'

export type ShellNavSection = 'gestao' | 'colaborador' | 'conta'

/**
 * Agrupamento visual no sidebar (domínio de uso). Independente de {@link ShellNavSection},
 * usado só para organização do menu — rotas e RBAC inalterados.
 */
export type ShellNavGroup =
  | 'gestao'
  | 'cadastros_operacionais'
  | 'estrutura_administracao'
  | 'colaborador'
  | 'conta'

export const SHELL_NAV_GROUP_LABEL: Record<ShellNavGroup, string> = {
  gestao: 'Gestão',
  cadastros_operacionais: 'Cadastros operacionais',
  estrutura_administracao: 'Estrutura e administração',
  colaborador: 'Colaborador',
  conta: 'Conta',
}

/** Ordem fixa dos blocos no sidebar. */
export const SIDEBAR_GROUP_ORDER: ShellNavGroup[] = [
  'gestao',
  'cadastros_operacionais',
  'estrutura_administracao',
  'colaborador',
  'conta',
]

export type ShellNavItem = {
  to: string
  label: string
  section: ShellNavSection
  navGroup: ShellNavGroup
  /** Exige esta permissão (RBAC efetivo). */
  permission?: string
  /** Basta uma das permissões. */
  anyOfPermissions?: string[]
  /** Só aparece quando o módulo de chamados (flag) está ativo no cliente. */
  requiresSupportTickets?: boolean
}

export const GESTAO_NAV_ITEMS: ShellNavItem[] = [
  { to: '/app/backlog', label: 'Painel operacional', section: 'gestao', navGroup: 'gestao' },
  {
    to: '/app/nova-esteira',
    label: 'Nova esteira',
    section: 'gestao',
    navGroup: 'gestao',
    permission: 'conveyors.create',
  },
  {
    to: '/app/importar-os',
    label: 'Por documento',
    section: 'gestao',
    navGroup: 'gestao',
    permission: 'conveyors.create',
  },
  {
    to: '/app/dashboard',
    label: 'Dashboard',
    section: 'gestao',
    navGroup: 'gestao',
    anyOfPermissions: ['dashboard.view_operational', 'dashboard.view_executive'],
  },
  {
    to: '/app/equipes',
    label: 'Equipes',
    section: 'gestao',
    navGroup: 'gestao',
    permission: 'teams.view',
  },
  {
    to: '/app/colaboradores',
    label: 'Colaboradores',
    section: 'gestao',
    navGroup: 'cadastros_operacionais',
    permission: 'collaborators_admin.view',
  },
  {
    to: '/app/usuarios',
    label: 'Usuários',
    section: 'gestao',
    navGroup: 'cadastros_operacionais',
    permission: 'users.view',
  },
  {
    to: '/app/configuracoes-operacionais',
    label: 'Configurações operacionais',
    section: 'gestao',
    navGroup: 'cadastros_operacionais',
    permission: PERMISSION_OPERATIONAL_SETTINGS_MANAGE,
  },
  {
    to: '/app/matrizes-operacao',
    label: 'Matrizes de operação',
    section: 'gestao',
    navGroup: 'estrutura_administracao',
    permission: 'operation_matrix.view',
  },
  {
    to: '/app/permissoes-por-papel',
    label: 'Permissões por papel',
    section: 'gestao',
    navGroup: 'estrutura_administracao',
    permission: PERMISSION_RBAC_MANAGE_ROLE_PERMISSIONS,
  },
  {
    to: '/app/usuarios/trilha',
    label: 'Trilha administrativa',
    section: 'gestao',
    navGroup: 'estrutura_administracao',
    permission: 'audit.view',
  },
  {
    to: '/app/gestao/jornada-colaborador',
    label: 'Jornada por colaborador',
    section: 'gestao',
    navGroup: 'estrutura_administracao',
    permission: 'collaborators_admin.view',
  },
]

export const COLABORADOR_NAV_ITEMS: ShellNavItem[] = [
  { to: '/app/meu-trabalho', label: 'Meu Trabalho', section: 'colaborador', navGroup: 'colaborador' },
  {
    to: '/app/minhas-atividades',
    label: 'Minhas atividades',
    section: 'colaborador',
    navGroup: 'colaborador',
  },
  {
    to: '/app/chamados',
    label: 'Chamados',
    section: 'colaborador',
    navGroup: 'colaborador',
    requiresSupportTickets: true,
  },
  { to: '/app/jornada', label: 'Jornada', section: 'colaborador', navGroup: 'colaborador' },
]

export const CONTA_NAV_ITEMS: ShellNavItem[] = [
  {
    to: '/app/conta/alterar-senha',
    label: 'Alterar senha',
    section: 'conta',
    navGroup: 'conta',
  },
]

/** Visibilidade de um item de menu a partir das permissões efetivas (contrato RBAC ↔ UI). */
export function navItemVisible(
  item: ShellNavItem,
  can: (code: string) => boolean,
  canAny: (codes: string[]) => boolean,
): boolean {
  if (item.anyOfPermissions?.length) {
    return canAny(item.anyOfPermissions)
  }
  if (item.permission) {
    return can(item.permission)
  }
  return true
}

/** Alias legível para uso declarativo (`requiredPermissions` + `canAccess`). */
export const canAccessNavItem = navItemVisible

export function filterShellNavItems(
  items: ShellNavItem[],
  can: (code: string) => boolean,
  canAny: (codes: string[]) => boolean,
): ShellNavItem[] {
  return items.filter((item) => navItemVisible(item, can, canAny))
}

/** Prefixos de rota que contam como área Colaborador (alinhado ao menu e ao switcher). */
const COLABORADOR_PATH_PREFIXES = [
  '/app/minhas-atividades',
  '/app/meu-trabalho',
  '/app/chamados',
  '/app/jornada',
  '/app/apontamento',
] as const

export type AppShellFunctionId = 'gestao' | 'colaborador'

/** Rótulo curto da área (sidebar / shell) — alinhado às secções do menu. */
export function sectionDisplayLabel(section: ShellNavSection): string {
  switch (section) {
    case 'gestao':
      return 'Gestão'
    case 'colaborador':
      return 'Colaborador'
    case 'conta':
      return 'Conta'
    default: {
      const _x: never = section
      return _x
    }
  }
}

function normalizeAppPath(pathname: string): string {
  const p = pathname.split('?')[0] ?? pathname
  const s = p.replace(/\/$/, '') || '/'
  return s
}

/**
 * Item de menu cuja rota é prefixo mais longo que casa com o pathname (inclui sub-rotas).
 * Usado pelo shell para contexto curto alinhado à sidebar.
 */
export function longestNavItemMatchForPath(pathname: string): ShellNavItem | null {
  const nPath = normalizeAppPath(pathname)
  const all = [...GESTAO_NAV_ITEMS, ...COLABORADOR_NAV_ITEMS, ...CONTA_NAV_ITEMS]
  const sorted = [...all].sort((a, b) => b.to.length - a.to.length)
  for (const item of sorted) {
    const to = normalizeAppPath(item.to)
    if (nPath === to || nPath.startsWith(`${to}/`)) {
      return item
    }
  }
  return null
}

export function inferShellFunctionFromPath(pathname: string): AppShellFunctionId {
  const path = pathname.split('?')[0] ?? pathname
  for (const prefix of COLABORADOR_PATH_PREFIXES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) {
      return 'colaborador'
    }
  }
  return 'gestao'
}

export function defaultRouteForShellFunction(id: AppShellFunctionId): string {
  return id === 'colaborador' ? '/app/minhas-atividades' : '/app/backlog'
}
