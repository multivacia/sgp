/** Capítulo 4 — Perfis e permissões. */
import { h, ok } from '../mock-api.mjs'
import { GESTOR_PERMISSION_CODES, PERMISSION_CATALOG, ROLE_IDS } from '../fixtures/common.mjs'

const ROLES = [
  { id: ROLE_IDS.ADMIN, code: 'ADMIN', name: 'Administrador' },
  { id: ROLE_IDS.GESTOR, code: 'GESTOR', name: 'Gestor' },
  { id: ROLE_IDS.COLABORADOR, code: 'COLABORADOR', name: 'Colaborador' },
]

export const rbacHandlers = () => [
  h('GET', '/api/v1/rbac/roles', () => ok(ROLES)),
  h('GET', '/api/v1/rbac/permissions', () => ok(PERMISSION_CATALOG)),
  h('GET', /^\/api\/v1\/rbac\/roles\/[^/]+\/permissions$/, ({ url }) => {
    const id = decodeURIComponent(url.pathname.split('/')[5])
    const role = ROLES.find((r) => r.id === id) ?? ROLES[0]
    const codes =
      role.code === 'ADMIN'
        ? PERMISSION_CATALOG.map((p) => p.code)
        : role.code === 'GESTOR'
          ? GESTOR_PERMISSION_CODES
          : []
    return ok({ role, permissionCodes: codes })
  }),
]

const AUDIT_ROWS = [
  {
    id: 'audit-1',
    eventType: 'role_permissions_updated',
    occurredAt: '2026-06-30T17:42:00.000Z',
    resultStatus: 'SUCCESS',
    actorUserId: 'user-ana-demo',
    actorEmail: 'ana.demo@sgp.example',
    targetUserId: null,
    targetUserEmail: null,
    targetCollaboratorId: null,
    metadata: {
      role_id: ROLE_IDS.GESTOR,
      role_code: 'GESTOR',
      added_permission_codes: ['time_entries.delete_any'],
      removed_permission_codes: [],
    },
  },
  {
    id: 'audit-2',
    eventType: 'role_permissions_updated',
    occurredAt: '2026-06-22T12:15:00.000Z',
    resultStatus: 'SUCCESS',
    actorUserId: 'user-ana-demo',
    actorEmail: 'ana.demo@sgp.example',
    targetUserId: null,
    targetUserEmail: null,
    targetCollaboratorId: null,
    metadata: {
      role_id: ROLE_IDS.COLABORADOR,
      role_code: 'COLABORADOR',
      added_permission_codes: [],
      removed_permission_codes: ['dashboard.view_operational'],
    },
  },
  {
    id: 'audit-3',
    eventType: 'admin_user_created',
    occurredAt: '2026-06-20T14:03:00.000Z',
    resultStatus: 'SUCCESS',
    actorUserId: 'user-ana-demo',
    actorEmail: 'ana.demo@sgp.example',
    targetUserId: 'user-carlos-demo',
    targetUserEmail: 'carlos.demo@sgp.example',
    targetCollaboratorId: 'col-carlos',
    metadata: { role_code: 'COLABORADOR' },
  },
]

export const auditHandlers = () => [
  h('GET', '/api/v1/admin/audit-events', ({ query }) => {
    const type = query.get('event_type')
    const rows = type ? AUDIT_ROWS.filter((r) => r.eventType === type) : AUDIT_ROWS
    return ok(rows, { total: rows.length, limit: 100, offset: 0 })
  }),
]

export default [
  {
    id: 'cap04-01',
    slug: 'permissoes-por-papel',
    match: 'Tela Permissões por papel com o perfil Gestor',
    route: '/app/permissoes-por-papel',
    scenario: 'Papel Gestor selecionado; catálogo real de permissões agrupado por domínio, com caixas marcadas (permissões do Gestor) e desmarcadas.',
    handlers: rbacHandlers,
    async run({ page, shot }) {
      await page.locator('#rbac-role').selectOption(ROLE_IDS.GESTOR)
      await page.getByRole('checkbox').first().waitFor()
      await page.waitForLoadState('networkidle')
      await shot()
    },
  },
  {
    id: 'cap04-02',
    slug: 'trilha-administrativa',
    match: 'Trilha administrativa filtrada por Permissões do papel atualizadas',
    route: '/app/usuarios/trilha',
    scenario: 'Filtro "Tipo de evento" = Permissões do papel atualizadas aplicado; dois eventos de alteração de papel.',
    handlers: auditHandlers,
    async run({ page, shot }) {
      await page.getByLabel('Tipo de evento').selectOption('role_permissions_updated')
      await page.getByRole('button', { name: 'Aplicar filtros' }).click()
      await page.waitForLoadState('networkidle')
      await page.getByRole('cell', { name: 'Permissões do papel atualizadas' }).first().waitFor()
      await shot()
    },
  },
]
