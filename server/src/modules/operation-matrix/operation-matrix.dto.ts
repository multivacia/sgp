export type MatrixNodeType = 'ITEM' | 'TASK' | 'SECTOR' | 'ACTIVITY'

export type MatrixNodeApi = {
  id: string
  parent_id: string | null
  root_id: string
  node_type: MatrixNodeType
  code: string | null
  name: string
  description: string | null
  order_index: number
  level_depth: number
  is_active: boolean
  planned_minutes: number | null
  default_responsible_id: string | null
  team_ids: string[]
  required: boolean
  source_key: string | null
  metadata_json: unknown | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type MatrixNodeTreeApi = MatrixNodeApi & {
  children: MatrixNodeTreeApi[]
}

/** Entrada mínima para autocomplete (Opção=TASK, Área=SECTOR, Atividade=ACTIVITY). */
export type CatalogLabelEntryApi = {
  id: string
  label: string
  code: string | null
}

/** @deprecated usar CatalogLabelEntryApi */
export type MatrixActivityCatalogEntryApi = CatalogLabelEntryApi

/** Catálogo consolidado para sugestões locais em Matrizes (sem árvore). */
export type MatrixSuggestionCatalogApi = {
  options: CatalogLabelEntryApi[]
  areas: CatalogLabelEntryApi[]
  activities: CatalogLabelEntryApi[]
}

export type MatrixNodeRow = {
  id: string
  parent_id: string | null
  root_id: string
  node_type: string
  code: string | null
  name: string
  description: string | null
  order_index: number
  level_depth: number
  is_active: boolean
  planned_minutes: number | null
  default_responsible_id: string | null
  team_ids: string[]
  required: boolean
  source_key: string | null
  metadata_json: unknown | null
  created_at: Date
  updated_at: Date
  deleted_at: Date | null
}

export function rowToMatrixNodeApi(row: MatrixNodeRow): MatrixNodeApi {
  return {
    id: row.id,
    parent_id: row.parent_id,
    root_id: row.root_id,
    node_type: row.node_type as MatrixNodeType,
    code: row.code,
    name: row.name,
    description: row.description,
    order_index: row.order_index,
    level_depth: row.level_depth,
    is_active: row.is_active,
    planned_minutes: row.planned_minutes,
    default_responsible_id: row.default_responsible_id,
    team_ids: Array.isArray(row.team_ids) ? row.team_ids : [],
    required: row.required,
    source_key: row.source_key,
    metadata_json: row.metadata_json,
    created_at: row.created_at.toISOString(),
    updated_at: row.updated_at.toISOString(),
    deleted_at: row.deleted_at ? row.deleted_at.toISOString() : null,
  }
}
