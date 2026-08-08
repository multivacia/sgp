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
  planned_quantity?: number
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

/** Resposta de POST …/operation-matrix/items/:id/duplicate */
export type DuplicateMatrixItemSummary = {
  id: string
  name: string
  is_active: boolean
}

export type MatrixDuplicationWarningReason =
  | 'RESPONSIBLE_INACTIVE'
  | 'TEAM_MEMBERSHIP_INACTIVE'
  | 'RESPONSIBLE_NOT_IN_TEAM'

/**
 * Aviso não bloqueante em `meta.warnings` de POST …/duplicate: a duplicação foi
 * concluída, mas o responsável padrão da atividade de origem não pôde ser
 * copiado (colaborador inativo, vínculo de equipe inativo, ou fora da equipe
 * copiada) — espelha `MatrixDuplicationWarning` do backend.
 */
export type MatrixDuplicationWarning = {
  code: 'MATRIX_ACTIVITY_RESPONSIBLE_NOT_COPIED'
  sourceActivityId: string
  duplicatedActivityId: string
  activityName: string
  sourceResponsibleId: string
  reason: MatrixDuplicationWarningReason
  message: string
}
