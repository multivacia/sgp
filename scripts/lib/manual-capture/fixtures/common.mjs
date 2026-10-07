/**
 * Dados fictícios e determinísticos compartilhados pelas capturas do manual.
 * Nenhum nome, e-mail, placa ou cliente real — apenas "Demo"/"Exemplo" e domínio `.example`.
 */

/** Relógio fixo do navegador: quarta-feira 01/07/2026 10:00 (America/Sao_Paulo). */
export const FIXED_NOW_ISO = '2026-07-01T13:00:00.000Z'
export const TODAY = '2026-07-01'
export const WEEK_START = '2026-06-29'
export const WEEK_END = '2026-07-03'
export const WEEKDAYS = ['2026-06-29', '2026-06-30', '2026-07-01', '2026-07-02', '2026-07-03']

export const ROLE_IDS = {
  ADMIN: '11111111-1111-1111-1111-111111111111',
  COLABORADOR: '22222222-2222-2222-2222-222222222222',
  GESTOR: '33333333-3333-3333-3333-333333333333',
}

/** Catálogo de permissões (códigos reais de `server/migrations` / `requirePermission`). */
export const PERMISSION_CATALOG = [
  ['audit.view', 'Trilha administrativa: consultar'],
  ['collaborators_admin.activate', 'Colaboradores admin: ativar'],
  ['collaborators_admin.create', 'Colaboradores admin: criar'],
  ['collaborators_admin.deactivate', 'Colaboradores admin: inativar'],
  ['collaborators_admin.edit', 'Colaboradores admin: editar'],
  ['collaborators_admin.restore', 'Colaboradores admin: restaurar'],
  ['collaborators_admin.soft_delete', 'Colaboradores admin: eliminação lógica'],
  ['collaborators_admin.view', 'Colaboradores admin: consultar'],
  ['conveyors.create', 'Esteiras: criar'],
  ['conveyors.edit_status', 'Esteiras: alterar estado operacional'],
  ['conveyors.manage_assignments', 'Esteiras: gerir alocações por etapa'],
  ['dashboard.view_executive', 'Dashboard gerencial'],
  ['dashboard.view_operational', 'Dashboard operacional'],
  ['operation_matrix.manage', 'Matriz de operação: alterar'],
  ['operation_matrix.view', 'Matriz de operação: consultar'],
  ['operational_settings.manage', 'Configurações operacionais: gerir catálogo (setores e funções)'],
  ['rbac.manage_role_permissions', 'Permissões por papel: gerir'],
  ['system_settings.manage', 'Configurações do sistema: alterar'],
  ['system_settings.view', 'Configurações do sistema: consultar'],
  ['teams.create', 'Equipes: criar'],
  ['teams.manage_members', 'Equipes: gerir membros'],
  ['teams.update', 'Equipes: editar'],
  ['teams.view', 'Equipes: consultar'],
  ['time_entries.create_on_behalf', 'Apontamentos: lançar em nome de colaborador'],
  ['time_entries.delete_any', 'Apontamentos: remover qualquer lançamento (correção gerencial)'],
  ['time_entries.edit_any', 'Apontamentos: editar qualquer lançamento (correção gerencial)'],
  ['users.activate', 'Utilizadores: ativar'],
  ['users.create', 'Utilizadores: criar'],
  ['users.deactivate', 'Utilizadores: inativar'],
  ['users.edit', 'Utilizadores: editar'],
  ['users.force_password_change', 'Utilizadores: forçar troca de senha'],
  ['users.reset_password', 'Utilizadores: repor senha'],
  ['users.restore', 'Utilizadores: restaurar'],
  ['users.soft_delete', 'Utilizadores: eliminação lógica'],
  ['users.view', 'Utilizadores: consultar'],
].map(([code, name], i) => ({ id: `perm-${String(i + 1).padStart(2, '0')}`, code, name }))

const ALL_PERMISSION_CODES = PERMISSION_CATALOG.map((p) => p.code)

/** Perfil Gestor: permissões típicas de gestão (sem administração de usuários/RBAC). */
export const GESTOR_PERMISSION_CODES = [
  'audit.view',
  'collaborators_admin.view',
  'collaborators_admin.edit',
  'conveyors.create',
  'conveyors.edit_status',
  'conveyors.manage_assignments',
  'dashboard.view_executive',
  'dashboard.view_operational',
  'operation_matrix.view',
  'teams.view',
  'time_entries.create_on_behalf',
  'time_entries.edit_any',
  'time_entries.delete_any',
  'users.view',
]

export const COLLABORATORS = [
  { id: 'col-ana', full_name: 'Ana Demo', code: 'COL-001', sector: 'Tapeçaria', role: 'Gestora de produção' },
  { id: 'col-carlos', full_name: 'Carlos Demo', code: 'COL-002', sector: 'Tapeçaria', role: 'Tapeceiro' },
  { id: 'col-bruno', full_name: 'Bruno Exemplo', code: 'COL-003', sector: 'Costura', role: 'Costureiro' },
  { id: 'col-diana', full_name: 'Diana Exemplo', code: 'COL-004', sector: 'Montagem', role: 'Montadora' },
  { id: 'col-eduardo', full_name: 'Eduardo Teste', code: 'COL-005', sector: 'Acabamento', role: 'Acabador' },
  { id: 'col-fernanda', full_name: 'Fernanda Teste', code: 'COL-006', sector: 'Costura', role: 'Costureira' },
]

export function collaboratorName(id) {
  return COLLABORATORS.find((c) => c.id === id)?.full_name ?? id
}

/** Usuário administrativo (Ana Demo) — todas as permissões do catálogo. */
export const adminUser = {
  userId: 'user-ana-demo',
  email: 'ana.demo@sgp.example',
  role: 'ADMIN',
  roleId: ROLE_IDS.ADMIN,
  collaboratorId: 'col-ana',
  isActive: true,
  avatarUrl: null,
  mustChangePassword: false,
  passwordChangedAt: '2026-01-05T12:00:00.000Z',
  permissions: ALL_PERMISSION_CODES,
}

/** Usuário colaborador (Carlos Demo) — sem permissões administrativas. */
export const collaboratorUser = {
  userId: 'user-carlos-demo',
  email: 'carlos.demo@sgp.example',
  role: 'COLABORADOR',
  roleId: ROLE_IDS.COLABORADOR,
  collaboratorId: 'col-carlos',
  isActive: true,
  avatarUrl: null,
  mustChangePassword: false,
  passwordChangedAt: '2026-01-05T12:00:00.000Z',
  permissions: [],
}
