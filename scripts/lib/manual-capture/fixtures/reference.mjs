/** Dados de referência (colaboradores, setores, funções, equipes, matriz) servidos como handlers base. */
import { COLLABORATORS } from './common.mjs'

export const SECTORS = [
  { id: 'sec-tapecaria', name: 'Tapeçaria', is_active: true },
  { id: 'sec-costura', name: 'Costura', is_active: true },
  { id: 'sec-montagem', name: 'Montagem', is_active: true },
  { id: 'sec-acabamento', name: 'Acabamento', is_active: true },
]

export const ROLES = [
  { id: 'role-gestor', name: 'Gestor de produção', is_active: true },
  { id: 'role-tapeceiro', name: 'Tapeceiro', is_active: true },
  { id: 'role-costureiro', name: 'Costureiro', is_active: true },
  { id: 'role-montador', name: 'Montador', is_active: true },
]

export function collaboratorApiJson(c) {
  const sector = SECTORS.find((s) => s.name === c.sector)
  return {
    id: c.id,
    code: c.code,
    registration_code: c.code,
    full_name: c.full_name,
    nickname: null,
    email: `${c.full_name.toLowerCase().replace(/\s+/g, '.')}@sgp.example`,
    phone: null,
    job_title: c.role,
    avatar_url: null,
    sector_id: sector?.id ?? null,
    sector_name: sector?.name ?? null,
    role_id: null,
    role_name: c.role,
    status: 'ACTIVE',
    is_active: true,
    notes: null,
    created_at: '2026-01-10T12:00:00.000Z',
    updated_at: '2026-06-20T12:00:00.000Z',
  }
}

export const TEAMS = [
  {
    id: 'team-estofaria',
    name: 'Equipe Estofaria',
    description: 'Tapeçaria e costura',
    isActive: true,
    createdAt: '2026-01-10T12:00:00.000Z',
    updatedAt: '2026-01-10T12:00:00.000Z',
    activeMemberCount: 3,
  },
]

function node(id, parent, root, type, name, order, depth, extra = {}) {
  return {
    id,
    parent_id: parent,
    root_id: root,
    node_type: type,
    code: null,
    name,
    description: null,
    order_index: order,
    level_depth: depth,
    is_active: true,
    planned_minutes: null,
    planned_quantity: 1,
    default_responsible_id: null,
    team_ids: [],
    required: false,
    source_key: null,
    metadata_json: null,
    created_at: '2026-01-10T12:00:00.000Z',
    updated_at: '2026-01-10T12:00:00.000Z',
    deleted_at: null,
    ...extra,
  }
}

/** Matriz de operação: itens (bases) e árvore ITEM → TASK → SECTOR → ACTIVITY. */
function matrixTree(rootId, name, code, tasks) {
  const root = { ...node(rootId, null, rootId, 'ITEM', name, 1, 0, { code }), children: [] }
  tasks.forEach(([taskName, sectors], ti) => {
    const tId = `${rootId}-t${ti + 1}`
    const t = { ...node(tId, rootId, rootId, 'TASK', taskName, ti + 1, 1), children: [] }
    sectors.forEach(([sectorName, acts], si) => {
      const sId = `${tId}-s${si + 1}`
      const s = { ...node(sId, tId, rootId, 'SECTOR', sectorName, si + 1, 2), children: [] }
      acts.forEach(([actName, min], ai) => {
        s.children.push({
          ...node(`${sId}-a${ai + 1}`, sId, rootId, 'ACTIVITY', actName, ai + 1, 3, { planned_minutes: min }),
          children: [],
        })
      })
      t.children.push(s)
    })
    root.children.push(t)
  })
  return root
}

export const MATRIX_TREES = [
  matrixTree('mx-bancos', 'Reforma de bancos', 'BASE-BANCOS', [
    ['Bancos dianteiros', [
      ['Tapeçaria', [['Desmontar bancos', 60], ['Remover revestimento antigo', 90], ['Recuperar espuma', 120], ['Revestir assentos', 180]]],
      ['Costura', [['Cortar couro', 90], ['Costurar capas', 150]]],
    ]],
  ]),
  matrixTree('mx-teto', 'Revestimento de teto', 'BASE-TETO', [
    ['Teto', [['Tapeçaria', [['Remover forro', 60], ['Aplicar tecido', 120]]]]],
  ]),
  matrixTree('mx-portas', 'Painéis de porta', 'BASE-PORTAS', [
    ['Portas dianteiras', [['Tapeçaria', [['Desmontar painéis', 45], ['Revestir painéis', 120]]]]],
  ]),
]

export const MATRIX_ITEMS = MATRIX_TREES.map(({ children, ...item }) => item)

export function collaboratorsList() {
  return COLLABORATORS.map(collaboratorApiJson)
}

const LINKED = {
  'col-ana': ['user-ana-demo', 'ana.demo@sgp.example', 'Ana Demo'],
  'col-carlos': ['user-carlos-demo', 'carlos.demo@sgp.example', 'Carlos Demo'],
  'col-bruno': ['user-bruno-exemplo', 'bruno.exemplo@sgp.example', 'Bruno Exemplo'],
}

/** GET /admin/collaborators — colaborador + vínculo de usuário + estado do PIN do Modo Fábrica. */
export function adminCollaboratorJson(c, overrides = {}) {
  const link = LINKED[c.id]
  return {
    ...collaboratorApiJson(c),
    deleted_at: null,
    linked_user_id: link?.[0] ?? null,
    linked_user_email: link?.[1] ?? null,
    linked_user_display_name: link?.[2] ?? null,
    productionPin: { hasCredential: c.id !== 'col-fernanda', enabled: c.id !== 'col-fernanda', mustChange: c.id === 'col-diana', locked: false },
    ...overrides,
  }
}

export function adminCollaboratorsList() {
  return COLLABORATORS.map((c) => adminCollaboratorJson(c))
}
