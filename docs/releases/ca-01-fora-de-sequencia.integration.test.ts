/**
 * CA-01 — "Fora de sequência" por dono do planejamento (cenário João/Maria).
 *
 * Objetivo do teste (rede de segurança para o risco "Alto" do relatório: call site
 * que esquece de passar o colaborador volta a bloquear todos):
 *   A) João conclui a Pintura enquanto a Funilaria (pendente, planejada p/ Maria) está aberta
 *      -> NÃO bloqueia, NÃO exige justificativa; a Funilaria aparece como "aguardando" (de terceiro).
 *   B) Espelho: com uma predecessora pendente planejada p/ o PRÓPRIO João
 *      -> bloqueia com 422 STEP_COMPLETION_OUT_OF_SEQUENCE_REQUIRES_JUSTIFICATION;
 *         concluir de novo COM justificativa -> sucesso.
 *
 * Convenções seguidas de:
 *   - conveyor-step-completion.integration.test.ts (seed SQL + service-level + skipIf(!hasDb))
 *   - conveyor-assignments-http.integration.test.ts (variante HTTP com supertest — ver bloco no fim)
 *
 * PONTOS DE SEED A CONFIRMAR (marcados com TODO(seed)):
 *   1. Vínculo app_user <-> collaborator (como o service resolve o colaborador atuante a partir
 *      de actorAppUserId). Alinhar com ensureMariaCollaboratorSeedForIntegration / integrationSeedFixtures.
 *   2. Colunas NOT NULL extras de conveyors (total_options/areas/steps já vistas no outro teste).
 *   3. Se o gate de conclusão resolve posse por operational_work_plan_items (esperado pela spec).
 */
import { randomUUID } from 'node:crypto'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { hasDatabaseConnectionInEnv, loadDotenvFiles, loadEnv } from '../config/env.js'
import { closePool, getPool } from '../plugins/db.js'
import { servicePatchConveyorStepCompletion } from '../modules/conveyors/conveyor-step-operational.service.js'
import { serviceAnalyzeConveyorActivitySequence } from '../modules/conveyors/conveyorActivitySequence.service.js'
import { ErrorCodes } from '../shared/errors/errorCodes.js' // TODO(seed): confirmar caminho do enum

loadDotenvFiles()
const hasDb = hasDatabaseConnectionInEnv(process.env)
let tablesAvailable = false

describe.skipIf(!hasDb)('CA-01 fora de sequência por dono do plano (João/Maria)', () => {
  let pool: ReturnType<typeof getPool>

  beforeAll(async () => {
    pool = getPool(loadEnv())
    const probe = await pool.query<{ ok: string }>(
      `SELECT CASE
         WHEN to_regclass('public.conveyors') IS NOT NULL
          AND to_regclass('public.conveyor_nodes') IS NOT NULL
          AND to_regclass('public.operational_work_plans') IS NOT NULL
          AND to_regclass('public.operational_work_plan_items') IS NOT NULL
         THEN '1' ELSE '0' END AS ok`,
    )
    tablesAvailable = probe.rows[0]?.ok === '1'
  })

  afterAll(async () => {
    await closePool()
  })

  /**
   * Esteira: OPTION -> AREA -> [STEP Funilaria (ordem 1), STEP Pintura (ordem 2)], ambas PENDING.
   * Dois colaboradores (João, Maria) + app_users vinculados. Plano PUBLISHED.
   * Os itens de plano (posse) são criados por planPlanItem() em cada caso.
   */
  async function seedScenario() {
    const conveyorId = randomUUID()
    const optionId = randomUUID()
    const areaId = randomUUID()
    const funilariaId = randomUUID() // predecessora (ordem 1)
    const pinturaId = randomUUID() // alvo do apontamento do João (ordem 2)

    const joaoCollab = randomUUID()
    const mariaCollab = randomUUID()
    const joaoAppUser = randomUUID()
    const workPlanId = randomUUID()

    // colaboradores
    await pool.query(
      `INSERT INTO collaborators (id, full_name, status, is_active) VALUES
         ($1::uuid, 'João Teste', 'ACTIVE', true),
         ($2::uuid, 'Maria Teste', 'ACTIVE', true)`,
      [joaoCollab, mariaCollab],
    )

    // app_user do ator (João). TODO(seed): incluir a coluna de vínculo real com collaborator
    // (ex.: collaborator_id) conforme integrationSeedFixtures/ensureMariaCollaboratorSeedForIntegration.
    await pool.query(
      `INSERT INTO app_users (id, email, full_name, status /*, collaborator_id */)
       VALUES ($1::uuid, $2, 'João Teste', 'ACTIVE' /*, $3::uuid */)`,
      [joaoAppUser, `joao+${joaoAppUser}@teste.local` /*, joaoCollab */],
    )

    // esteira + árvore (mesma forma do conveyor-step-completion.integration.test.ts)
    await pool.query(
      `INSERT INTO conveyors (id, name, origin_register, total_options, total_areas, total_steps, total_planned_minutes)
       VALUES ($1::uuid, 'CA-01 João/Maria', 'MANUAL', 1, 1, 2, 240)`,
      [conveyorId],
    )
    await pool.query(
      `INSERT INTO conveyor_nodes (
         id, conveyor_id, parent_id, root_id, node_type, source_origin, name,
         order_index, level_depth, planned_minutes, operational_status
       ) VALUES
         ($1::uuid, $6::uuid, NULL,      $1::uuid, 'OPTION', 'manual', 'Tarefa',   1, 0, NULL, NULL),
         ($2::uuid, $6::uuid, $1::uuid,  $1::uuid, 'AREA',   'manual', 'Setor',    1, 1, NULL, NULL),
         ($3::uuid, $6::uuid, $2::uuid,  $1::uuid, 'STEP',   'manual', 'Funilaria',1, 2, 120,  'PENDING'),
         ($4::uuid, $6::uuid, $2::uuid,  $1::uuid, 'STEP',   'manual', 'Pintura',  2, 2, 120,  'PENDING')`,
      [optionId, areaId, funilariaId, pinturaId, /* $5 unused */ null, conveyorId],
    )

    // cabeçalho de plano publicado
    await pool.query(
      `INSERT INTO operational_work_plans (id, week_start_date, week_end_date, status, created_by)
       VALUES ($1::uuid, CURRENT_DATE, CURRENT_DATE + 6, 'PUBLISHED', $2::uuid)`,
      [workPlanId, joaoAppUser],
    )

    return { conveyorId, funilariaId, pinturaId, joaoCollab, mariaCollab, joaoAppUser, workPlanId }
  }

  /** Cria um item de plano (posse) para uma atividade. */
  async function planItem(
    s: Awaited<ReturnType<typeof seedScenario>>,
    activityNodeId: string,
    collaboratorId: string,
  ) {
    await pool.query(
      `INSERT INTO operational_work_plan_items
         (id, work_plan_id, conveyor_id, activity_node_id, assigned_collaborator_id, planned_date, status)
       VALUES (gen_random_uuid(), $1::uuid, $2::uuid, $3::uuid, $4::uuid, CURRENT_DATE, 'PLANNED')`,
      [s.workPlanId, s.conveyorId, activityNodeId, collaboratorId],
    )
  }

  // ----------------------------------------------------------------------------
  // A) predecessora de OUTRO colaborador (Maria) -> NÃO bloqueia, sem justificativa
  // ----------------------------------------------------------------------------
  it.skipIf(!tablesAvailable)(
    'João conclui a Pintura com a Funilaria pendente da Maria sem 422 e sem justificativa',
    async () => {
      const s = await seedScenario()
      await planItem(s, s.funilariaId, s.mariaCollab) // Funilaria é da Maria (pendente)
      await planItem(s, s.pinturaId, s.joaoCollab) // Pintura é do João

      // análise deve dizer: não é fora de sequência p/ João; Funilaria vira "aguardando"
      const seq = await serviceAnalyzeConveyorActivitySequence(
        pool,
        s.conveyorId,
        s.pinturaId,
        s.joaoCollab, // 4º parâmetro (ownership) — spec §5
      )
      expect(seq.isOutOfSequence).toBe(false)
      expect(seq.awaitingOthersActivities.map((a) => a.activityTitle)).toContain('Funilaria')

      // conclusão sem justificativa -> sucesso (sem throw 422)
      const res = await servicePatchConveyorStepCompletion(pool, {
        conveyorId: s.conveyorId,
        stepNodeId: s.pinturaId,
        actorAppUserId: s.joaoAppUser,
        action: 'COMPLETE',
      })
      expect(res.idempotent).toBe(false)

      const st = await pool.query<{ operational_status: string }>(
        `SELECT operational_status FROM conveyor_nodes WHERE id = $1::uuid`,
        [s.pinturaId],
      )
      expect(st.rows[0]?.operational_status).toBe('COMPLETED')
    },
  )

  // ----------------------------------------------------------------------------
  // B) predecessora do PRÓPRIO João -> bloqueia 422; com justificativa -> conclui
  // ----------------------------------------------------------------------------
  it.skipIf(!tablesAvailable)(
    'João é bloqueado (422) por pendência própria e conclui informando justificativa',
    async () => {
      const s = await seedScenario()
      await planItem(s, s.funilariaId, s.joaoCollab) // Funilaria é do PRÓPRIO João (pendente)
      await planItem(s, s.pinturaId, s.joaoCollab)

      const seq = await serviceAnalyzeConveyorActivitySequence(pool, s.conveyorId, s.pinturaId, s.joaoCollab)
      expect(seq.isOutOfSequence).toBe(true)

      // sem justificativa -> 422 com o código específico
      await expect(
        servicePatchConveyorStepCompletion(pool, {
          conveyorId: s.conveyorId,
          stepNodeId: s.pinturaId,
          actorAppUserId: s.joaoAppUser,
          action: 'COMPLETE',
        }),
      ).rejects.toMatchObject({
        statusCode: 422,
        code: ErrorCodes.STEP_COMPLETION_OUT_OF_SEQUENCE_REQUIRES_JUSTIFICATION,
      })

      // com justificativa -> sucesso
      const ok = await servicePatchConveyorStepCompletion(pool, {
        conveyorId: s.conveyorId,
        stepNodeId: s.pinturaId,
        actorAppUserId: s.joaoAppUser,
        action: 'COMPLETE',
        outOfSequenceJustification: 'Liberado pelo líder para adiantar a pintura.',
      })
      expect(ok.idempotent).toBe(false)
    },
  )

  // ----------------------------------------------------------------------------
  // (opcional) predecessora não planejada -> ignorada: nem bloqueio nem "aguardando"
  // ----------------------------------------------------------------------------
  it.skipIf(!tablesAvailable)(
    'predecessora não planejada não bloqueia nem gera aguardando',
    async () => {
      const s = await seedScenario()
      // Só a Pintura é planejada (João); Funilaria fica SEM item de plano.
      await planItem(s, s.pinturaId, s.joaoCollab)

      const seq = await serviceAnalyzeConveyorActivitySequence(pool, s.conveyorId, s.pinturaId, s.joaoCollab)
      expect(seq.isOutOfSequence).toBe(false)
      expect(seq.awaitingOthersActivities).toHaveLength(0)
    },
  )
})

/*
 * -------------------------------------------------------------------------------------
 * VARIANTE HTTP (fidelidade 201/422 sobre a rede) — se quiserem cobrir a rota inteira.
 * Base: conveyor-assignments-http.integration.test.ts (supertest + createApp + cookie).
 *
 *   import request from 'supertest'
 *   import { createApp } from '../app.js'
 *   import { sessionCookieForUser } from './sessionTestCookie.js'
 *
 *   const app = await createApp({ logger: createLogger() })
 *   const cookie = await sessionCookieForUser(JOAO_APP_USER_ID)   // João autenticado
 *
 *   // A) sem justificativa -> 200 (PATCH completion) / ou 201 se cobrirem a rota de time-entries
 *   await request(app.server)
 *     .patch(`/conveyors/${conveyorId}/steps/${pinturaId}/completion`)
 *     .set('cookie', cookie)
 *     .send({ action: 'COMPLETE' })
 *     .expect(200)
 *
 *   // B) pendência própria, sem justificativa -> 422
 *   await request(app.server)
 *     .patch(`/conveyors/${conveyorId}/steps/${pinturaId}/completion`)
 *     .set('cookie', cookie)
 *     .send({ action: 'COMPLETE' })
 *     .expect(422)
 *
 * Obs.: a rota de conclusão devolve 200 (PATCH). O "201" do relatório é a criação de
 * time-entry (POST /conveyors/:id/steps/:stepId/time-entries) — cobrir também se o gate
 * de justificativa/awaiting precisar valer nesse fluxo além da conclusão.
 * -------------------------------------------------------------------------------------
 */
