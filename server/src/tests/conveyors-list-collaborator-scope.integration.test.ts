import { randomUUID } from 'node:crypto'
import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import { createLogger } from '../plugins/logger.js'
import { closePool, getPool } from '../plugins/db.js'
import {
  hasDatabaseConnectionInEnv,
  loadDotenvFiles,
  loadEnv,
} from '../config/env.js'
import { serviceCreateConveyor } from '../modules/conveyors/conveyors.service.js'
import type { PostConveyorBody } from '../modules/conveyors/conveyors.schemas.js'
import { serviceCreateConveyorNodeAssignee } from '../modules/conveyors/conveyorAssignments.service.js'
import { hashPassword } from '../shared/password/password.js'
import { sessionCookieForUser } from './sessionTestCookie.js'
import { ensureMariaCollaboratorSeedForIntegration } from './integrationSeedFixtures.js'

/**
 * Painel Operacional (`GET /api/v1/conveyors`): escopo por colaborador.
 * - COLABORADOR: só esteiras com atividade (STEP ativo) alocada diretamente ao colaborador da conta.
 * - GESTOR/ADMIN: lista global (comportamento anterior).
 */

loadDotenvFiles()

const hasDb = hasDatabaseConnectionInEnv(process.env)

type ListItem = { id: string; code: string | null; priority: string }

function conveyorBody(nome: string, stepCount: number, prioridade: 'alta' | 'media' | 'baixa'): PostConveyorBody {
  return {
    dados: {
      nome,
      cliente: 'Cliente escopo',
      veiculo: 'V',
      modeloVersao: '',
      placa: '',
      observacoes: '',
      responsavel: '',
      prazoEstimado: '',
      prioridade,
      colaboradorId: null,
    },
    originType: 'MANUAL',
    baseId: null,
    baseCode: null,
    baseName: null,
    baseVersion: null,
    options: [
      {
        titulo: 'Opção A',
        orderIndex: 1,
        sourceOrigin: 'manual',
        areas: [
          {
            titulo: 'Área 1',
            orderIndex: 1,
            sourceOrigin: 'manual',
            steps: Array.from({ length: stepCount }, (_, i) => ({
              titulo: `Etapa ${i + 1}`,
              orderIndex: i + 1,
              plannedMinutes: 30,
              sourceOrigin: 'manual' as const,
              required: true,
            })),
          },
        ],
      },
    ],
  }
}

describe.skipIf(!hasDb)('GET /api/v1/conveyors — escopo do Painel Operacional por colaborador (integração)', () => {
  let app: ReturnType<typeof createApp>
  let pool: ReturnType<typeof getPool>

  const runTag = randomUUID().slice(0, 8)

  // Colaboradores
  const collabEdnaId = randomUUID()
  const collabOtherId = randomUUID()

  // Contas
  const ednaUser = { id: randomUUID(), email: `edna-scope-${runTag}@sgp-test.local` }
  const unlinkedCollabUser = { id: randomUUID(), email: `colab-sem-vinculo-${runTag}@sgp-test.local` }
  const gestorUser = { id: randomUUID(), email: `gestor-scope-${runTag}@sgp-test.local` }
  const adminUser = { id: randomUUID(), email: `admin-scope-${runTag}@sgp-test.local` }

  // Esteiras
  let osDirect = '' // alocação direta da Edna em 1 atividade (prioridade alta)
  let os7070 = '' // somente outro colaborador alocado (prioridade alta)
  let osTwoSteps = '' // Edna alocada em 2 atividades (prioridade baixa)
  let osTeamOnly = '' // somente alocação por equipe da qual a Edna é membro
  let osDeletedAssignment = '' // alocação da Edna removida (deleted_at)
  let osInactiveStep = '' // Edna alocada em atividade inativa
  let osNoAssignment = '' // nenhuma alocação

  async function roleIdByCode(code: string): Promise<string> {
    const r = await pool.query<{ id: string }>(
      `SELECT id::text AS id FROM app_roles WHERE code = $1`,
      [code],
    )
    const id = r.rows[0]?.id
    if (!id) throw new Error(`perfil ${code} não encontrado`)
    return id
  }

  async function insertCollaborator(id: string, name: string, roleId: string): Promise<void> {
    await pool.query(
      `INSERT INTO collaborators (id, code, full_name, role_id, status, is_active)
       VALUES ($1::uuid, $2, $3, $4::uuid, 'ACTIVE', true)`,
      [id, `SCOPE-${id.slice(0, 12)}`, name, roleId],
    )
  }

  async function insertAppUser(
    user: { id: string; email: string },
    roleId: string,
    collaboratorId: string | null,
  ): Promise<void> {
    const hash = await hashPassword('ScopeTestUser1!')
    await pool.query(
      `INSERT INTO app_users (
         id, email, password_hash, is_active, role_id, collaborator_id,
         must_change_password, password_changed_at
       ) VALUES ($1::uuid, $2, $3, true, $4::uuid, $5::uuid, false, now())`,
      [user.id, user.email, hash, roleId, collaboratorId],
    )
  }

  async function stepIds(conveyorId: string): Promise<string[]> {
    const r = await pool.query<{ id: string }>(
      `SELECT id::text AS id FROM conveyor_nodes
       WHERE conveyor_id = $1::uuid AND node_type = 'STEP' AND deleted_at IS NULL
       ORDER BY order_index, id`,
      [conveyorId],
    )
    return r.rows.map((x) => x.id)
  }

  async function createConveyor(
    label: string,
    stepCount: number,
    prioridade: 'alta' | 'media' | 'baixa',
    code: string,
  ): Promise<string> {
    const created = await serviceCreateConveyor(
      pool,
      conveyorBody(`Escopo ${label} ${runTag}`, stepCount, prioridade),
    )
    await pool.query(`UPDATE conveyors SET code = $1 WHERE id = $2::uuid`, [code, created.id])
    return created.id
  }

  async function assignCollaborator(conveyorId: string, stepId: string, collaboratorId: string): Promise<string> {
    const a = await serviceCreateConveyorNodeAssignee(pool, {
      conveyorId,
      conveyorNodeId: stepId,
      type: 'COLLABORATOR',
      collaboratorId,
      isPrimary: false,
    })
    return a.id
  }

  async function listAs(
    user: { id: string; email: string },
    query: Record<string, string> = {},
  ): Promise<{ status: number; items: ListItem[] }> {
    const res = await request(app)
      .get('/api/v1/conveyors')
      .query(query)
      .set('Cookie', await sessionCookieForUser(pool, user.id, user.email))
    return { status: res.status, items: (res.body?.data ?? []) as ListItem[] }
  }

  function ids(items: ListItem[]): string[] {
    return items.map((i) => i.id)
  }

  beforeAll(async () => {
    const env = loadEnv()
    pool = getPool(env)
    app = createApp(pool, createLogger('silent'), env)
    await ensureMariaCollaboratorSeedForIntegration(pool)

    const colabRoleId = await roleIdByCode('COLABORADOR')
    const gestorRoleId = await roleIdByCode('GESTOR')
    const adminRoleId = await roleIdByCode('ADMIN')

    await insertCollaborator(collabEdnaId, `Edna Escopo ${runTag}`, colabRoleId)
    await insertCollaborator(collabOtherId, `Outro Escopo ${runTag}`, colabRoleId)

    await insertAppUser(ednaUser, colabRoleId, collabEdnaId)
    await insertAppUser(unlinkedCollabUser, colabRoleId, null)
    await insertAppUser(gestorUser, gestorRoleId, null)
    await insertAppUser(adminUser, adminRoleId, null)

    // 1) Alocação direta da Edna em uma atividade
    osDirect = await createConveyor('direta', 2, 'alta', `SCOPE-D-${runTag}`)
    const directSteps = await stepIds(osDirect)
    await assignCollaborator(osDirect, directSteps[0]!, collabEdnaId)
    await assignCollaborator(osDirect, directSteps[1]!, collabOtherId)

    // 2) OS 7070: somente outro colaborador alocado
    os7070 = await createConveyor('7070', 1, 'alta', '7070')
    const steps7070 = await stepIds(os7070)
    await assignCollaborator(os7070, steps7070[0]!, collabOtherId)

    // 3) Mesma OS com duas atividades da Edna
    osTwoSteps = await createConveyor('duas-atividades', 2, 'baixa', `SCOPE-2-${runTag}`)
    const twoSteps = await stepIds(osTwoSteps)
    await assignCollaborator(osTwoSteps, twoSteps[0]!, collabEdnaId)
    await assignCollaborator(osTwoSteps, twoSteps[1]!, collabEdnaId)

    // 4) Somente alocação por equipe (Edna é membro da equipe)
    const teamId = randomUUID()
    await pool.query(`INSERT INTO teams (id, name, is_active) VALUES ($1::uuid, $2, true)`, [
      teamId,
      `Equipe escopo ${runTag}`,
    ])
    await pool.query(
      `INSERT INTO team_members (team_id, collaborator_id, is_primary, is_active)
       VALUES ($1::uuid, $2::uuid, false, true)`,
      [teamId, collabEdnaId],
    )
    osTeamOnly = await createConveyor('equipe', 1, 'alta', `SCOPE-T-${runTag}`)
    const teamSteps = await stepIds(osTeamOnly)
    await serviceCreateConveyorNodeAssignee(pool, {
      conveyorId: osTeamOnly,
      conveyorNodeId: teamSteps[0]!,
      type: 'TEAM',
      teamId,
      isPrimary: false,
    })

    // Alocação removida (soft delete) não conta
    osDeletedAssignment = await createConveyor('alocacao-removida', 1, 'alta', `SCOPE-R-${runTag}`)
    const delSteps = await stepIds(osDeletedAssignment)
    const delAssigneeId = await assignCollaborator(osDeletedAssignment, delSteps[0]!, collabEdnaId)
    await pool.query(
      `UPDATE conveyor_node_assignees SET deleted_at = now() WHERE id = $1::uuid`,
      [delAssigneeId],
    )

    // Atividade inativa não conta
    osInactiveStep = await createConveyor('atividade-inativa', 1, 'alta', `SCOPE-I-${runTag}`)
    const inactiveSteps = await stepIds(osInactiveStep)
    await assignCollaborator(osInactiveStep, inactiveSteps[0]!, collabEdnaId)
    await pool.query(`UPDATE conveyor_nodes SET is_active = FALSE WHERE id = $1::uuid`, [
      inactiveSteps[0]!,
    ])

    // Sem nenhuma alocação
    osNoAssignment = await createConveyor('sem-alocacao', 1, 'media', `SCOPE-N-${runTag}`)
  })

  afterAll(async () => {
    await closePool()
  })

  it('colaborador com alocação direta em uma atividade vê a OS', async () => {
    const { status, items } = await listAs(ednaUser)
    expect(status).toBe(200)
    expect(ids(items)).toContain(osDirect)
  })

  it('colaborador sem alocação direta na OS 7070 não vê a OS 7070', async () => {
    const { status, items } = await listAs(ednaUser)
    expect(status).toBe(200)
    expect(ids(items)).not.toContain(os7070)
    expect(items.some((i) => i.code === '7070')).toBe(false)
  })

  it('OS com duas atividades do colaborador aparece uma única vez', async () => {
    const { items } = await listAs(ednaUser)
    expect(ids(items).filter((id) => id === osTwoSteps)).toHaveLength(1)
  })

  it('alocação apenas por equipe não torna a OS visível', async () => {
    const { items } = await listAs(ednaUser)
    expect(ids(items)).not.toContain(osTeamOnly)
  })

  it('alocação removida e atividade inativa não tornam a OS visível', async () => {
    const { items } = await listAs(ednaUser)
    expect(ids(items)).not.toContain(osDeletedAssignment)
    expect(ids(items)).not.toContain(osInactiveStep)
    expect(ids(items)).not.toContain(osNoAssignment)
  })

  it('colaborador vê exatamente as OSs com alocação direta (conjunto fechado)', async () => {
    const { items } = await listAs(ednaUser)
    expect(new Set(ids(items))).toEqual(new Set([osDirect, osTwoSteps]))
    expect(items).toHaveLength(2)
  })

  it('conta COLABORADOR sem collaborator_id recebe 200 e lista vazia (sem fallback global)', async () => {
    const { status, items } = await listAs(unlinkedCollabUser)
    expect(status).toBe(200)
    expect(items).toEqual([])
  })

  it('gestor continua recebendo todas as OSs, inclusive sem alocação para ele', async () => {
    const { status, items } = await listAs(gestorUser)
    expect(status).toBe(200)
    const got = ids(items)
    for (const id of [
      osDirect,
      os7070,
      osTwoSteps,
      osTeamOnly,
      osDeletedAssignment,
      osInactiveStep,
      osNoAssignment,
    ]) {
      expect(got).toContain(id)
    }
  })

  it('admin continua recebendo todas as OSs, inclusive sem alocação para ele', async () => {
    const { status, items } = await listAs(adminUser)
    expect(status).toBe(200)
    const got = ids(items)
    for (const id of [
      osDirect,
      os7070,
      osTwoSteps,
      osTeamOnly,
      osDeletedAssignment,
      osInactiveStep,
      osNoAssignment,
    ]) {
      expect(got).toContain(id)
    }
  })

  it('filtro de prioridade é aplicado dentro do escopo do colaborador', async () => {
    const alta = await listAs(ednaUser, { priority: 'alta' })
    expect(alta.status).toBe(200)
    // osDirect (alta) entra; os7070/osTeamOnly (alta) continuam fora; osTwoSteps (baixa) sai pelo filtro.
    expect(ids(alta.items)).toEqual([osDirect])

    const baixa = await listAs(ednaUser, { priority: 'baixa' })
    expect(ids(baixa.items)).toEqual([osTwoSteps])
  })

  it('filtro de texto (q) é aplicado dentro do escopo do colaborador', async () => {
    const r = await listAs(ednaUser, { q: '7070' })
    expect(r.status).toBe(200)
    expect(ids(r.items)).not.toContain(os7070)
    const own = await listAs(ednaUser, { q: `duas-atividades ${runTag}` })
    expect(ids(own.items)).toEqual([osTwoSteps])
  })

  it('parâmetro collaboratorId enviado pelo cliente é ignorado', async () => {
    const colab = await listAs(ednaUser, { collaboratorId: collabOtherId })
    expect(new Set(ids(colab.items))).toEqual(new Set([osDirect, osTwoSteps]))

    const gestor = await listAs(gestorUser, { collaboratorId: collabEdnaId })
    expect(ids(gestor.items)).toContain(os7070)
    expect(ids(gestor.items)).toContain(osNoAssignment)
  })
})
