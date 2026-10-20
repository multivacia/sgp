import type pg from 'pg'
import { mondayOfWeekContaining } from '../operational-planning/operational-planning.week.js'
import { findPublishedWorkPlanForWeek } from '../my-work-queue/my-work-queue.repository.js'
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

/** Alocação direta ou via time (membro ativo) do colaborador `$1` na linha `cna`. */
const COLLABORATOR_ASSIGNMENT_SQL = `
          (
            cna.assignment_type = 'COLLABORATOR'
            AND cna.collaborator_id = $1::uuid
          )
          OR (
            cna.assignment_type = 'TEAM'
            AND EXISTS (
              SELECT 1
              FROM team_members tm
              WHERE tm.team_id = cna.team_id
                AND tm.collaborator_id = $1::uuid
                AND tm.is_active = TRUE
            )
          )`

/** STEP apontável: ativo e não concluído/dispensado operacionalmente. */
const OPEN_STEP_SQL = `step.deleted_at IS NULL
        AND step.is_active = TRUE
        AND step.node_type = 'STEP'
        AND ((step.operational_status IS DISTINCT FROM 'COMPLETED' AND step.operational_status IS DISTINCT FROM 'ABORTED'))`

const STEP_STRUCTURE_JOINS_SQL = `
      INNER JOIN conveyor_nodes area
        ON area.id = step.parent_id
        AND area.deleted_at IS NULL
        AND area.is_active = TRUE
        AND area.node_type = 'AREA'
      INNER JOIN conveyor_nodes opt
        ON opt.id = area.parent_id
        AND opt.deleted_at IS NULL
        AND opt.is_active = TRUE
        AND opt.node_type = 'OPTION'`

/** Pesquisa livre `$2` (sem `&`). `withTask` inclui o nome da tarefa (só na origem não alocada). */
function freeCandidateSearchSql(withTask: boolean): string {
  return `
        AND (
          $2::text IS NULL
          OR trim($2) = ''
          OR cv.name ILIKE '%' || $2 || '%'
          OR COALESCE(cv.code, '') ILIKE '%' || $2 || '%'
          OR COALESCE(cv.client_name, '') ILIKE '%' || $2 || '%'
          OR COALESCE(cv.vehicle, '') ILIKE '%' || $2 || '%'
          OR COALESCE(cv.plate, '') ILIKE '%' || $2 || '%'
          OR area.name ILIKE '%' || $2 || '%'${withTask ? `
          OR opt.name ILIKE '%' || $2 || '%'` : ''}
          OR step.name ILIKE '%' || $2 || '%'
        )`
}

/** Origem do candidato, na ordem de precedência da deduplicação. */
export const TIME_ENTRY_CANDIDATE_SOURCE = {
  /** Alocação estrutural direta ou por time. */
  ASSIGNED: 0,
  /** Plano semanal publicado vigente. */
  PUBLISHED_PLAN: 1,
  /** Fora da alocação (só com `includeUnassigned` e termo de pesquisa). */
  UNASSIGNED: 2,
} as const

/**
 * Chave keyset da lista de candidatos (ordem final, sem empates):
 * origem → [plano: atrasada, data, `planned_order`] → tarefa → setor → atividade → `step.id`.
 * Nas origens sem plano os três campos do plano são constantes.
 */
export type TimeEntryCandidateCursorKey = [
  sourceRank: number,
  overdueRank: number,
  plannedDate: string,
  plannedOrder: number,
  taskOrder: number,
  sectorOrder: number,
  activityOrder: number,
  stepId: string,
]

export type TimeEntryCandidatePageRow = TimeEntryCandidateRawRow & {
  source_rank: number
  k_overdue: number
  k_planned_date: string
  k_planned_order: number
  k_opt: number
  k_area: number
  k_step: number
}

export function timeEntryCandidateCursorKey(
  row: TimeEntryCandidatePageRow,
): TimeEntryCandidateCursorKey {
  return [
    row.source_rank,
    row.k_overdue,
    row.k_planned_date,
    row.k_planned_order,
    row.k_opt,
    row.k_area,
    row.k_step,
    row.step_node_id,
  ]
}

/**
 * Candidatos de apontamento em **uma única consulta paginada** (cursor keyset).
 *
 * Une as três origens (`UNION ALL`), mantendo por STEP só a de maior precedência
 * (`DISTINCT ON`): alocação estrutural → plano publicado vigente → fora da alocação.
 * Elegibilidade, pesquisa e deduplicação valem para o conjunto inteiro; só a página final
 * é limitada (`fetchLimit` = tamanho da página + 1, para detectar continuação).
 *
 * - Alocação: esteira A_INICIAR/EM_ANDAMENTO, STEP aberto, alocação direta ou via time
 *   (prioriza assignee COLLABORATOR).
 * - Plano: itens PLANNED do plano publicado da semana de `referenceDate`, do dia ou
 *   atrasados na semana.
 * - Fora da alocação: STEPs abertos sem alocação do colaborador; só com `includeUnassigned`.
 */
export async function listTimeEntryCandidatesPage(
  pool: pg.Pool,
  input: TimeEntryCandidateSearch & {
    collaboratorId: string
    referenceDate: string
    includeUnassigned: boolean
    after: TimeEntryCandidateCursorKey | null
    fetchLimit: number
  },
): Promise<TimeEntryCandidatePageRow[]> {
  const referenceDate = input.referenceDate.trim()
  const plan = await findPublishedWorkPlanForWeek(pool, mondayOfWeekContaining(referenceDate))
  const q = input.q?.trim() || null
  const conveyorQ = normalizeSearchTerm(input.conveyorQ)
  const activityQ = normalizeSearchTerm(input.activityQ)
  const after = input.after

  const r = await pool.query<TimeEntryCandidatePageRow>(
    `
    WITH assigned_ranked AS (
      SELECT
        cna.id::text AS assignee_id,
        cv.id AS conveyor_uuid,
        step.id AS step_uuid,
        cna.is_primary,
        cna.assignment_type::text AS assignment_type,
        step.planned_minutes::text AS planned_minutes,
        opt.order_index AS k_opt,
        area.order_index AS k_area,
        step.order_index AS k_step,
        ROW_NUMBER() OVER (
          PARTITION BY step.id
          ORDER BY
            CASE WHEN cna.assignment_type = 'COLLABORATOR' THEN 0 ELSE 1 END,
            cna.id
        ) AS rn
      FROM conveyor_node_assignees cna
      INNER JOIN conveyor_nodes step
        ON step.id = cna.conveyor_node_id
        AND ${OPEN_STEP_SQL}
      INNER JOIN conveyors cv
        ON cv.id = cna.conveyor_id
        AND cv.deleted_at IS NULL
        AND cv.operational_status IN ('A_INICIAR', 'EM_ANDAMENTO')${STEP_STRUCTURE_JOINS_SQL}
      WHERE cna.deleted_at IS NULL
        AND (${COLLABORATOR_ASSIGNMENT_SQL}
        )${freeCandidateSearchSql(false)}${scopedCandidateSearchSql(3, 4)}
    ),
    candidates AS (
      SELECT
        ${TIME_ENTRY_CANDIDATE_SOURCE.ASSIGNED} AS source_rank,
        assignee_id,
        conveyor_uuid,
        step_uuid,
        is_primary,
        assignment_type,
        planned_minutes,
        NULL::date AS planned_date,
        0 AS k_overdue,
        DATE '1900-01-01' AS k_planned_date,
        0 AS k_planned_order,
        k_opt,
        k_area,
        k_step
      FROM assigned_ranked
      WHERE rn = 1

      UNION ALL

      SELECT
        ${TIME_ENTRY_CANDIDATE_SOURCE.PUBLISHED_PLAN},
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
        ),
        cv.id,
        step.id,
        false,
        'COLLABORATOR'::text,
        COALESCE(i.planned_minutes, step.planned_minutes)::text,
        i.planned_date,
        CASE WHEN i.planned_date < $6::date THEN 0 ELSE 1 END,
        i.planned_date,
        i.planned_order,
        opt.order_index,
        area.order_index,
        step.order_index
      FROM operational_work_plan_items i
      INNER JOIN operational_work_plans p
        ON p.id = i.work_plan_id
        AND p.deleted_at IS NULL
        AND p.status = 'PUBLISHED'
      INNER JOIN conveyors cv
        ON cv.id = i.conveyor_id
        AND cv.deleted_at IS NULL
        AND cv.operational_status IN ('A_INICIAR', 'EM_ANDAMENTO')
      INNER JOIN conveyor_nodes step
        ON step.id = i.activity_node_id
        AND step.conveyor_id = cv.id
        AND ${OPEN_STEP_SQL}${STEP_STRUCTURE_JOINS_SQL}
      WHERE i.work_plan_id = $5::uuid
        AND i.deleted_at IS NULL
        AND i.status = 'PLANNED'
        AND i.assigned_collaborator_id = $1::uuid
        AND i.planned_date >= $7::date
        AND i.planned_date <= $8::date
        AND (
          i.planned_date = $6::date
          OR (
            i.planned_date < $6::date
            AND (step.operational_status IS DISTINCT FROM 'COMPLETED' AND step.operational_status IS DISTINCT FROM 'ABORTED')
          )
        )${freeCandidateSearchSql(false)}${scopedCandidateSearchSql(3, 4)}

      UNION ALL

      SELECT
        ${TIME_ENTRY_CANDIDATE_SOURCE.UNASSIGNED},
        ''::text,
        cv.id,
        step.id,
        false,
        'COLLABORATOR'::text,
        step.planned_minutes::text,
        NULL::date,
        0,
        DATE '1900-01-01',
        0,
        opt.order_index,
        area.order_index,
        step.order_index
      FROM conveyor_nodes step
      INNER JOIN conveyors cv
        ON cv.id = step.conveyor_id
        AND cv.deleted_at IS NULL
        AND cv.operational_status IN ('A_INICIAR', 'EM_ANDAMENTO')${STEP_STRUCTURE_JOINS_SQL}
      WHERE $9::boolean
        AND ${OPEN_STEP_SQL}
        AND NOT EXISTS (
          SELECT 1
          FROM conveyor_node_assignees cna
          WHERE cna.conveyor_node_id = step.id
            AND cna.deleted_at IS NULL
            AND cna.conveyor_id = step.conveyor_id
            AND (${COLLABORATOR_ASSIGNMENT_SQL}
            )
        )${freeCandidateSearchSql(true)}${scopedCandidateSearchSql(3, 4)}
    ),
    deduped AS (
      SELECT DISTINCT ON (step_uuid) *
      FROM candidates
      ORDER BY
        step_uuid,
        source_rank,
        k_overdue,
        k_planned_date,
        k_planned_order,
        k_opt,
        k_area,
        k_step
    )
    SELECT
      d.assignee_id,
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
      d.is_primary,
      d.assignment_type,
      d.planned_minutes,
      step.planned_quantity::text AS planned_quantity,
      (
        SELECT COALESCE(SUM(cte.minutes), 0)::text
        FROM conveyor_time_entries cte
        WHERE cte.deleted_at IS NULL
          AND cte.conveyor_node_id = step.id
          AND cte.collaborator_id = $1::uuid
      ) AS realized_minutes,
      d.k_opt::text AS opt_order_index,
      d.k_area::text AS area_order_index,
      d.k_step::text AS step_order_index,
      d.planned_date::text AS planned_date,
      d.source_rank,
      d.k_overdue,
      d.k_planned_date::text AS k_planned_date,
      d.k_planned_order,
      d.k_opt,
      d.k_area,
      d.k_step
    FROM deduped d
    INNER JOIN conveyors cv ON cv.id = d.conveyor_uuid
    INNER JOIN conveyor_nodes step ON step.id = d.step_uuid
    INNER JOIN conveyor_nodes area ON area.id = step.parent_id
    INNER JOIN conveyor_nodes opt ON opt.id = area.parent_id
    WHERE (
      $10::int IS NULL
      OR (
        d.source_rank, d.k_overdue, d.k_planned_date, d.k_planned_order,
        d.k_opt, d.k_area, d.k_step, d.step_uuid
      ) > (
        $10::int, $11::int, $12::date, $13::int,
        $14::int, $15::int, $16::int, $17::uuid
      )
    )
    ORDER BY
      d.source_rank,
      d.k_overdue,
      d.k_planned_date,
      d.k_planned_order,
      d.k_opt,
      d.k_area,
      d.k_step,
      d.step_uuid
    LIMIT $18::int
    `,
    [
      input.collaboratorId,
      q,
      conveyorQ,
      activityQ,
      plan?.id ?? null,
      referenceDate,
      plan?.weekStartDate ?? null,
      plan?.weekEndDate ?? null,
      input.includeUnassigned,
      after?.[0] ?? null,
      after?.[1] ?? null,
      after?.[2] ?? null,
      after?.[3] ?? null,
      after?.[4] ?? null,
      after?.[5] ?? null,
      after?.[6] ?? null,
      after?.[7] ?? null,
      input.fetchLimit,
    ],
  )
  return r.rows
}
