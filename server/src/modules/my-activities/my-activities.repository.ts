import type pg from 'pg'
import { PLANNED_ITEMS_CTE } from '../operational-planning/planned-activity.repository.js'
import { foldSearchText, sqlFold } from '../../shared/accentInsensitiveSearch.js'

export type MyActivityRawRow = {
  assignee_id: string
  conveyor_id: string
  conveyor_code: string | null
  conveyor_name: string
  conveyor_status: string
  estimated_deadline: string | null
  step_node_id: string
  step_name: string
  option_name: string
  area_name: string
  is_primary: boolean
  planned_minutes: string | null
  planned_quantity: string
  realized_minutes: string | null
  opt_order_index: string
  area_order_index: string
  step_order_index: string
}

export async function listActivitiesRawForCollaborator(
  pool: pg.Pool,
  collaboratorId: string,
  options?: { conveyorId?: string | null },
): Promise<MyActivityRawRow[]> {
  const conveyorId = options?.conveyorId?.trim() || null
  const r = await pool.query<MyActivityRawRow>(
    `
    SELECT
      cna.id::text AS assignee_id,
      cv.id::text AS conveyor_id,
      cv.code AS conveyor_code,
      cv.name AS conveyor_name,
      cv.operational_status::text AS conveyor_status,
      cv.estimated_deadline AS estimated_deadline,
      step.id::text AS step_node_id,
      step.name AS step_name,
      opt.name AS option_name,
      area.name AS area_name,
      cna.is_primary,
      step.planned_minutes::text AS planned_minutes,
      (
        SELECT SUM(cte.minutes)::text
        FROM conveyor_time_entries cte
        WHERE cte.deleted_at IS NULL
          AND cte.conveyor_node_id = step.id
          AND cte.collaborator_id = cna.collaborator_id
      ) AS realized_minutes,
      opt.order_index::text AS opt_order_index,
      area.order_index::text AS area_order_index,
      step.order_index::text AS step_order_index
    FROM conveyor_node_assignees cna
    INNER JOIN conveyor_nodes step
      ON step.id = cna.conveyor_node_id
      AND step.deleted_at IS NULL
      AND step.is_active = TRUE
      AND step.node_type = 'STEP'
    INNER JOIN conveyors cv
      ON cv.id = cna.conveyor_id
      AND cv.deleted_at IS NULL
    INNER JOIN conveyor_nodes area
      ON area.id = step.parent_id
      AND area.deleted_at IS NULL
      AND area.is_active = TRUE
      AND area.node_type = 'AREA'
    INNER JOIN conveyor_nodes opt
      ON opt.id = area.parent_id
      AND opt.deleted_at IS NULL
      AND opt.is_active = TRUE
      AND opt.node_type = 'OPTION'
    WHERE cna.deleted_at IS NULL
      AND cna.collaborator_id = $1::uuid
      AND ($2::uuid IS NULL OR cv.id = $2::uuid)
    ORDER BY cna.id ASC
    `,
    [collaboratorId, conveyorId],
  )
  return r.rows
}

export type TimeEntryCandidateRawRow = {
  assignee_id: string
  conveyor_id: string
  conveyor_code: string | null
  conveyor_name: string
  client_name: string | null
  vehicle_label: string | null
  plate: string | null
  step_node_id: string
  step_name: string
  area_name: string
  option_name: string
  is_primary: boolean
  assignment_type: 'COLLABORATOR' | 'TEAM'
  planned_minutes: string | null
  planned_quantity: string
  realized_minutes: string | null
  opt_order_index: string
  area_order_index: string
  step_order_index: string
  planned_date: string | null
}

/** Termos de busca dos candidatos de apontamento: `q` (livre) e o par esteira/atividade (`&`). */
export type TimeEntryCandidateSearch = {
  q: string | null
  conveyorQ?: string | null
  activityQ?: string | null
}

function normalizeSearchTerm(term: string | null | undefined): string | null {
  const t = term ? foldSearchText(term) : ''
  return t ? t : null
}

/**
 * Pesquisa "Esteira & atividade" (interseção — AND entre si e com `q`), parcial e sem
 * diferenciar maiúsculas/acentos.
 * - Esteira/OS: nome, código/OS, cliente, veículo, placa.
 * - Atividade: somente o **nome da atividade** (STEP) pertencente à esteira encontrada.
 * Espera os aliases `cv` e `step` na query.
 */
function scopedCandidateSearchSql(conveyorParam: number, activityParam: number): string {
  const like = (expr: string, param: number) =>
    `${sqlFold(expr)} LIKE '%' || $${param}::text || '%'`
  return `
      AND (
        $${conveyorParam}::text IS NULL
        OR ${like('cv.name', conveyorParam)}
        OR ${like('cv.code', conveyorParam)}
        OR ${like('cv.client_name', conveyorParam)}
        OR ${like('cv.vehicle', conveyorParam)}
        OR ${like('cv.plate', conveyorParam)}
      )
      AND (
        $${activityParam}::text IS NULL
        OR ${like('step.name', activityParam)}
      )`
}

/**
 * Candidatos de apontamento pela regra canônica (TASK apontamento-somente-planejado):
 * só atividades com item planejado válido (plano publicado vigente, qualquer semana),
 * STEP em aberto (nem COMPLETED nem ABORTED), esteira A_INICIAR/EM_ANDAMENTO.
 *
 * - `scope = 'mine'`: planejadas para o colaborador. Data = menor data dele; minutos = soma
 *   dos itens dele (todos os dias).
 * - `scope = 'others'`: planejadas só para outros colaboradores (nenhum item dele).
 *   Data = menor data; minutos = soma de todos os itens.
 *
 * Uma linha por atividade; realizado = apontamentos do próprio colaborador.
 * `planned_quantity` = 1: os minutos do plano já são o total planejado.
 */
export async function listPlannedTimeEntryCandidates(
  pool: pg.Pool,
  input: TimeEntryCandidateSearch & {
    collaboratorId: string
    scope: 'mine' | 'others'
    limit: number
  },
): Promise<TimeEntryCandidateRawRow[]> {
  const q = input.q?.trim() || null
  const conveyorQ = normalizeSearchTerm(input.conveyorQ)
  const activityQ = normalizeSearchTerm(input.activityQ)
  const havingSql =
    input.scope === 'mine'
      ? 'HAVING bool_or(valid_items.assigned_collaborator_id = $1::uuid)'
      : 'HAVING NOT bool_or(valid_items.assigned_collaborator_id = $1::uuid)'
  const mineFilter = input.scope === 'mine' ? ' FILTER (WHERE valid_items.assigned_collaborator_id = $1::uuid)' : ''
  const r = await pool.query<TimeEntryCandidateRawRow>(
    `
    WITH ${PLANNED_ITEMS_CTE},
    planned_steps AS (
      SELECT
        valid_items.activity_node_id,
        MIN(valid_items.planned_date)${mineFilter} AS first_date,
        MIN(valid_items.planned_order)${mineFilter} AS first_order,
        SUM(valid_items.planned_minutes)${mineFilter} AS planned_minutes
      FROM valid_items
      GROUP BY valid_items.activity_node_id
      ${havingSql}
    )
    SELECT
      COALESCE(
        (
          SELECT cna.id::text
          FROM conveyor_node_assignees cna
          WHERE cna.deleted_at IS NULL
            AND cna.conveyor_id = cv.id
            AND cna.conveyor_node_id = step.id
            AND cna.assignment_type = 'COLLABORATOR'
            AND cna.collaborator_id = $1::uuid
          ORDER BY cna.is_primary DESC, cna.order_index, cna.id
          LIMIT 1
        ),
        ''::text
      ) AS assignee_id,
      cv.id::text AS conveyor_id,
      cv.code AS conveyor_code,
      cv.name AS conveyor_name,
      cv.client_name AS client_name,
      cv.vehicle AS vehicle_label,
      cv.plate AS plate,
      step.id::text AS step_node_id,
      step.name AS step_name,
      area.name AS area_name,
      opt.name AS option_name,
      COALESCE(
        (
          SELECT cna.is_primary
          FROM conveyor_node_assignees cna
          WHERE cna.deleted_at IS NULL
            AND cna.conveyor_id = cv.id
            AND cna.conveyor_node_id = step.id
            AND cna.assignment_type = 'COLLABORATOR'
            AND cna.collaborator_id = $1::uuid
          ORDER BY cna.is_primary DESC, cna.order_index, cna.id
          LIMIT 1
        ),
        false
      ) AS is_primary,
      'COLLABORATOR'::text AS assignment_type,
      ps.planned_minutes::text AS planned_minutes,
      '1'::text AS planned_quantity,
      (
        SELECT COALESCE(SUM(cte.minutes), 0)::text
        FROM conveyor_time_entries cte
        WHERE cte.deleted_at IS NULL
          AND cte.conveyor_node_id = step.id
          AND cte.collaborator_id = $1::uuid
      ) AS realized_minutes,
      opt.order_index::text AS opt_order_index,
      area.order_index::text AS area_order_index,
      step.order_index::text AS step_order_index,
      ps.first_date::text AS planned_date
    FROM planned_steps ps
    INNER JOIN conveyor_nodes step
      ON step.id = ps.activity_node_id
      AND step.deleted_at IS NULL
      AND step.is_active = TRUE
      AND step.node_type = 'STEP'
      AND step.operational_status IS DISTINCT FROM 'COMPLETED'
      AND step.operational_status IS DISTINCT FROM 'ABORTED'
    INNER JOIN conveyors cv
      ON cv.id = step.conveyor_id
      AND cv.deleted_at IS NULL
      AND cv.operational_status IN ('A_INICIAR', 'EM_ANDAMENTO')
    INNER JOIN conveyor_nodes area
      ON area.id = step.parent_id
      AND area.deleted_at IS NULL
      AND area.is_active = TRUE
      AND area.node_type = 'AREA'
    INNER JOIN conveyor_nodes opt
      ON opt.id = area.parent_id
      AND opt.deleted_at IS NULL
      AND opt.is_active = TRUE
      AND opt.node_type = 'OPTION'
    WHERE (
        $2::text IS NULL
        OR trim($2) = ''
        OR cv.name ILIKE '%' || $2 || '%'
        OR COALESCE(cv.code, '') ILIKE '%' || $2 || '%'
        OR COALESCE(cv.client_name, '') ILIKE '%' || $2 || '%'
        OR COALESCE(cv.vehicle, '') ILIKE '%' || $2 || '%'
        OR COALESCE(cv.plate, '') ILIKE '%' || $2 || '%'
        OR area.name ILIKE '%' || $2 || '%'
        OR step.name ILIKE '%' || $2 || '%'
      )${scopedCandidateSearchSql(4, 5)}
    ORDER BY
      ps.first_date ASC,
      ps.first_order ASC NULLS LAST,
      opt.order_index,
      area.order_index,
      step.order_index
    LIMIT $3::int
    `,
    [input.collaboratorId, q, input.limit, conveyorQ, activityQ],
  )
  return r.rows
}
