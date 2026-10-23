/**
 * Verifica a consulta SQL real contra tabelas temporárias do PostgreSQL.
 * Nada é gravado no esquema permanente: a transação sempre sofre ROLLBACK.
 * Este teste usa o mesmo banco local configurado em server/.env, se houver.
 */
import { randomUUID } from 'node:crypto'
import pg from 'pg'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { hasDatabaseConnectionInEnv, loadDotenvFiles, loadEnv } from '../config/env.js'
import { getTimeEntryPlanningEligibility } from '../modules/operational-planning/time-entry-planning.repository.js'

loadDotenvFiles()

const hasDb = hasDatabaseConnectionInEnv(process.env)
const JOAO = randomUUID()
const MARIA = randomUUID()
const CONVEYOR = randomUUID()
const STEP = randomUUID()
const STEP_ONLY_OLDER = randomUUID()

describe.skipIf(!hasDb)('1.10.2 — troca de responsável entre semanas (PostgreSQL temporário)', () => {
  let pool: pg.Pool

  beforeAll(() => {
    pool = new pg.Pool(loadEnv().pgPoolConfig)
  })

  afterAll(async () => {
    await pool?.end()
  })

  it('a semana publicada mais recente substitui o responsável antigo; cancelamento, MOVED e sem responsável não ressuscitam o plano anterior', async () => {
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      // Os nomes temporários sombreiam as tabelas reais somente nesta conexão.
      await client.query(`
        CREATE TEMP TABLE operational_work_plans (
          id uuid PRIMARY KEY,
          week_start_date date NOT NULL,
          status text NOT NULL,
          published_at timestamptz,
          updated_at timestamptz NOT NULL DEFAULT now(),
          deleted_at timestamptz
        ) ON COMMIT DROP
      `)
      await client.query(`
        CREATE TEMP TABLE operational_work_plan_items (
          id uuid PRIMARY KEY,
          work_plan_id uuid NOT NULL,
          conveyor_id uuid NOT NULL,
          activity_node_id uuid NOT NULL,
          assigned_collaborator_id uuid,
          planned_date date NOT NULL,
          planned_minutes integer,
          status text NOT NULL,
          updated_at timestamptz NOT NULL DEFAULT now(),
          deleted_at timestamptz
        ) ON COMMIT DROP
      `)

      const oldPlan = randomUUID()
      const newPlan = randomUUID()
      const draftPlan = randomUUID()
      const oldItem = randomUUID()
      const latestItem = randomUUID()
      const otherStepItem = randomUUID()

      await client.query(
        `INSERT INTO operational_work_plans (id, week_start_date, status, published_at)
         VALUES ($1::uuid, '2026-10-05', 'PUBLISHED', now()),
                ($2::uuid, '2026-10-19', 'PUBLISHED', now()),
                ($3::uuid, '2026-10-26', 'DRAFT', NULL)`,
        [oldPlan, newPlan, draftPlan],
      )
      await client.query(
        `INSERT INTO operational_work_plan_items
           (id, work_plan_id, conveyor_id, activity_node_id, assigned_collaborator_id,
            planned_date, planned_minutes, status)
         VALUES
           ($1::uuid, $4::uuid, $6::uuid, $7::uuid, $9::uuid, '2026-10-06', 30, 'PLANNED'),
           ($2::uuid, $5::uuid, $6::uuid, $7::uuid, $10::uuid, '2026-10-20', 60, 'PLANNED'),
           ($3::uuid, $4::uuid, $6::uuid, $8::uuid, $9::uuid, '2026-10-07', 45, 'PLANNED')`,
        [oldItem, latestItem, otherStepItem, oldPlan, newPlan, CONVEYOR, STEP, STEP_ONLY_OLDER, JOAO, MARIA],
      )

      async function scopeFor(collaboratorId: string, stepNodeId = STEP) {
        return getTimeEntryPlanningEligibility(client, {
          conveyorId: CONVEYOR, stepNodeId, collaboratorId,
        })
      }

      // João mantém um planejamento antigo, mas a atividade agora é de Maria.
      expect(await scopeFor(JOAO)).toMatchObject({ scope: 'OTHER' })
      expect(await scopeFor(MARIA)).toMatchObject({
        scope: 'MINE', plannedMinutesForCollaborator: 60,
      })

      // A troca nesta atividade não invalida outra atividade apenas planejada na semana antiga.
      expect(await scopeFor(JOAO, STEP_ONLY_OLDER)).toMatchObject({
        scope: 'MINE', plannedMinutesForCollaborator: 45,
      })

      // Um rascunho de semana posterior não altera nenhuma elegibilidade.
      await client.query(
        `INSERT INTO operational_work_plan_items
           (id, work_plan_id, conveyor_id, activity_node_id, assigned_collaborator_id,
            planned_date, planned_minutes, status)
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::uuid, '2026-10-27', 120, 'PLANNED')`,
        [randomUUID(), draftPlan, CONVEYOR, STEP, JOAO],
      )
      expect(await scopeFor(MARIA)).toMatchObject({ scope: 'MINE' })

      for (const status of ['MOVED', 'CANCELLED']) {
        await client.query(
          'UPDATE operational_work_plan_items SET status = $2::text WHERE id = $1::uuid',
          [latestItem, status],
        )
        expect(await scopeFor(JOAO)).toMatchObject({ scope: 'NONE' })
        expect(await scopeFor(MARIA)).toMatchObject({ scope: 'NONE' })
      }

      await client.query(
        `UPDATE operational_work_plan_items
            SET status = 'PLANNED', assigned_collaborator_id = NULL
          WHERE id = $1::uuid`,
        [latestItem],
      )
      expect(await scopeFor(JOAO)).toMatchObject({ scope: 'NONE' })
      expect(await scopeFor(MARIA)).toMatchObject({ scope: 'NONE' })

      await client.query(
        `UPDATE operational_work_plan_items
            SET assigned_collaborator_id = $2::uuid, deleted_at = now()
          WHERE id = $1::uuid`,
        [latestItem, MARIA],
      )
      expect(await scopeFor(JOAO)).toMatchObject({ scope: 'NONE' })
      expect(await scopeFor(MARIA)).toMatchObject({ scope: 'NONE' })
    } finally {
      // Inclusive em erro: nunca persiste dados nem altera o esquema do banco local.
      await client.query('ROLLBACK')
      client.release()
    }
  })
})
