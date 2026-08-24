/**
 * Regras de elegibilidade do backlog operacional (Planejamento da Semana).
 * Fluxo legado: STEPs pendentes sem Plano Operacional da Esteira ativo.
 */

/** Status de esteira que não entram no backlog operacional comum. */
export const OPERATIONAL_PLANNING_BACKLOG_EXCLUDED_CONVEYOR_STATUSES = [
  'FINALIZADA',
  'CANCELADA',
  'EM_ELABORACAO',
  'AGUARDANDO_PLANEJAMENTO',
] as const

/** Plano da esteira terminal — não bloqueia backlog. */
export const OPERATIONAL_PLANNING_BACKLOG_INACTIVE_PLAN_STATUSES = ['CANCELLED', 'COMPLETED'] as const

/** Fragmento SQL: filtro de status da esteira no backlog operacional. */
export function operationalPlanningBacklogConveyorStatusSql(alias = 'cv'): string {
  const list = OPERATIONAL_PLANNING_BACKLOG_EXCLUDED_CONVEYOR_STATUSES.map((s) => `'${s}'`).join(', ')
  return `${alias}.operational_status NOT IN (${list})`
}

/** Fragmento SQL: STEPs já vinculados a item de plano da esteira ativo. */
export function operationalPlanningBacklogExcludeConveyorPlanItemsSql(
  stepAlias = 'step',
  conveyorAlias = 'cv',
): string {
  const inactive = OPERATIONAL_PLANNING_BACKLOG_INACTIVE_PLAN_STATUSES.map((s) => `'${s}'`).join(', ')
  return `
      AND NOT EXISTS (
        SELECT 1
        FROM conveyor_operational_plan_items copi
        INNER JOIN conveyor_operational_plans cop
          ON cop.id = copi.plan_id
          AND cop.deleted_at IS NULL
          AND cop.status NOT IN (${inactive})
        WHERE copi.deleted_at IS NULL
          AND copi.status <> 'CANCELLED'
          AND copi.activity_node_id = ${stepAlias}.id
          AND copi.conveyor_id = ${conveyorAlias}.id
      )`
}

/** Fragmento SQL: STEPs já vinculados a item de plano semanal ativo (DRAFT/PUBLISHED). */
export function operationalPlanningBacklogExcludeWeeklyPlanItemsSql(
  stepAlias = 'step',
  conveyorAlias = 'cv',
): string {
  return `
      AND NOT EXISTS (
        SELECT 1
        FROM operational_work_plan_items owpi
        INNER JOIN operational_work_plans owp
          ON owp.id = owpi.work_plan_id
          AND owp.deleted_at IS NULL
          AND owp.status IN ('DRAFT', 'PUBLISHED')
        WHERE owpi.deleted_at IS NULL
          AND owpi.status <> 'CANCELLED'
          AND owpi.activity_node_id = ${stepAlias}.id
          AND owpi.conveyor_id = ${conveyorAlias}.id
      )`
}

/**
 * Esteira EM_ANDAMENTO com plano operacional ativo segue fluxo novo
 * (Aguardando encaixe / semana), não o backlog legado.
 */
export function operationalPlanningBacklogExcludeEmProducaoWithActivePlanSql(
  conveyorAlias = 'cv',
): string {
  const inactive = OPERATIONAL_PLANNING_BACKLOG_INACTIVE_PLAN_STATUSES.map((s) => `'${s}'`).join(', ')
  return `
      AND NOT (
        ${conveyorAlias}.operational_status = 'EM_ANDAMENTO'
        AND EXISTS (
          SELECT 1
          FROM conveyor_operational_plans cop
          WHERE cop.conveyor_id = ${conveyorAlias}.id
            AND cop.deleted_at IS NULL
            AND cop.status NOT IN (${inactive})
        )
      )`
}
