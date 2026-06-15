import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { closePool, getPool } from '../plugins/db.js'
import {
  hasDatabaseConnectionInEnv,
  loadDotenvFiles,
  loadEnv,
} from '../config/env.js'
import { hashProductionPin } from '../modules/production/production-pin.crypto.js'
import { PRODUCTION_DEFAULT_INITIAL_PIN } from '../modules/production/production.schemas.js'
import {
  findProductionCredentialExists,
  insertProductionCredentialInitial,
  listActiveCollaboratorsForProductionPinSeed,
} from '../modules/production/production-collaborators.repository.js'
import { findProductionCredentialByCollaboratorId } from '../modules/production/production-auth.repository.js'

loadDotenvFiles()

const hasDb = hasDatabaseConnectionInEnv(process.env)

const SEED_COLLAB_NO_PIN_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const SEED_ROLE_ID = '22222222-2222-2222-2222-222222222222'
const SEED_SECTOR_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

describe.skipIf(!hasDb)('seed production pins (integração)', () => {
  let pool: ReturnType<typeof getPool>

  beforeAll(async () => {
    const env = loadEnv()
    pool = getPool(env)

    await pool.query(
      `
      INSERT INTO collaborators (
        id, code, full_name, email, sector_id, role_id, status, is_active
      ) VALUES (
        $1::uuid, 'COL-SEED-PIN', 'Colaborador Seed PIN', 'seed-pin@sgp.local',
        $2::uuid, $3::uuid, 'ACTIVE', true
      )
      ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        status = EXCLUDED.status,
        is_active = EXCLUDED.is_active,
        deleted_at = NULL
      `,
      [SEED_COLLAB_NO_PIN_ID, SEED_SECTOR_ID, SEED_ROLE_ID],
    )

    await pool.query(
      `DELETE FROM collaborator_production_credentials WHERE collaborator_id = $1::uuid`,
      [SEED_COLLAB_NO_PIN_ID],
    )
  })

  afterAll(async () => {
    await pool.query(
      `DELETE FROM collaborator_production_credentials WHERE collaborator_id = $1::uuid`,
      [SEED_COLLAB_NO_PIN_ID],
    )
    await closePool()
  })

  it('cria credencial para colaborador ativo sem credencial com must_change_pin', async () => {
    const existsBefore = await findProductionCredentialExists(
      pool,
      SEED_COLLAB_NO_PIN_ID,
    )
    expect(existsBefore).toBe(false)

    const pinHash = await hashProductionPin(PRODUCTION_DEFAULT_INITIAL_PIN)
    await insertProductionCredentialInitial(pool, {
      collaboratorId: SEED_COLLAB_NO_PIN_ID,
      pinHash,
      mustChangePin: true,
    })

    const cred = await findProductionCredentialByCollaboratorId(
      pool,
      SEED_COLLAB_NO_PIN_ID,
    )
    expect(cred?.enabled).toBe(true)
    expect(cred?.must_change_pin).toBe(true)
    expect(cred?.pin_hash).not.toBe(PRODUCTION_DEFAULT_INITIAL_PIN)
  })

  it('não sobrescreve credencial existente (simula skip do script)', async () => {
    const credBefore = await findProductionCredentialByCollaboratorId(
      pool,
      SEED_COLLAB_NO_PIN_ID,
    )
    expect(credBefore).not.toBeNull()

    const exists = await findProductionCredentialExists(pool, SEED_COLLAB_NO_PIN_ID)
    expect(exists).toBe(true)

    const active = await listActiveCollaboratorsForProductionPinSeed(pool)
    expect(active.some((c) => c.id === SEED_COLLAB_NO_PIN_ID)).toBe(true)

    const credAfter = await findProductionCredentialByCollaboratorId(
      pool,
      SEED_COLLAB_NO_PIN_ID,
    )
    expect(credAfter?.pin_hash).toBe(credBefore?.pin_hash)
  })
})
