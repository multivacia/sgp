import type pg from 'pg'

export type StepCollaboratorOwnership = {
  collaboratorIds: Set<string>
  collaboratorNames: string[]
  hasAssignee: boolean
}

export type ConveyorStepOwnershipIndex = Map<string, StepCollaboratorOwnership>

/**
 * Responsáveis operacionais por STEP (colaborador direto ou membro de time alocado).
 * STEP sem alocação ativa fica com `hasAssignee = false`.
 */
export async function buildConveyorStepOwnershipIndex(
  pool: pg.Pool,
  conveyorId: string,
): Promise<ConveyorStepOwnershipIndex> {
  const r = await pool.query<{
    step_id: string
    collaborator_id: string | null
    collaborator_name: string | null
    has_assignee: boolean
  }>(
    `
    WITH step_assignees AS (
      SELECT
        cna.conveyor_node_id AS step_id,
        cna.assignment_type,
        cna.collaborator_id,
        cna.team_id
      FROM conveyor_node_assignees cna
      INNER JOIN conveyor_nodes cn
        ON cn.id = cna.conveyor_node_id
        AND cn.conveyor_id = $1::uuid
        AND cn.deleted_at IS NULL
        AND cn.node_type = 'STEP'
      WHERE cna.conveyor_id = $1::uuid
        AND cna.deleted_at IS NULL
    ),
    assignee_flags AS (
      SELECT step_id, TRUE AS has_assignee
      FROM step_assignees
      GROUP BY step_id
    ),
    expanded AS (
      SELECT
        sa.step_id,
        c.id::text AS collaborator_id,
        c.full_name AS collaborator_name
      FROM step_assignees sa
      INNER JOIN collaborators c
        ON sa.assignment_type = 'COLLABORATOR'
        AND sa.collaborator_id = c.id
        AND c.deleted_at IS NULL
      UNION
      SELECT
        sa.step_id,
        tm.collaborator_id::text AS collaborator_id,
        c.full_name AS collaborator_name
      FROM step_assignees sa
      INNER JOIN team_members tm
        ON sa.assignment_type = 'TEAM'
        AND sa.team_id = tm.team_id
        AND tm.is_active = TRUE
      INNER JOIN collaborators c
        ON c.id = tm.collaborator_id
        AND c.deleted_at IS NULL
    )
    SELECT
      cn.id::text AS step_id,
      e.collaborator_id,
      e.collaborator_name,
      COALESCE(af.has_assignee, FALSE) AS has_assignee
    FROM conveyor_nodes cn
    LEFT JOIN assignee_flags af ON af.step_id = cn.id
    LEFT JOIN expanded e ON e.step_id = cn.id
    WHERE cn.conveyor_id = $1::uuid
      AND cn.deleted_at IS NULL
      AND cn.node_type = 'STEP'
      AND cn.is_active = TRUE
  `,
    [conveyorId],
  )

  const index: ConveyorStepOwnershipIndex = new Map()
  for (const row of r.rows) {
    let entry = index.get(row.step_id)
    if (!entry) {
      entry = {
        collaboratorIds: new Set<string>(),
        collaboratorNames: [],
        hasAssignee: row.has_assignee,
      }
      index.set(row.step_id, entry)
    }
    if (row.collaborator_id) {
      entry.collaboratorIds.add(row.collaborator_id)
      if (
        row.collaborator_name &&
        !entry.collaboratorNames.includes(row.collaborator_name)
      ) {
        entry.collaboratorNames.push(row.collaborator_name)
      }
    }
  }

  return index
}
