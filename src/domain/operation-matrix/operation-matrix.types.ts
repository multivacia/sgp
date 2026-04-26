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

export type MatrixDeleteResult = { removedCount: number }
export type MatrixRestoreResult = { restoredCount: number }
