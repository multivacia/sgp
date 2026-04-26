import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'
import { loadEnv } from '../config/env.js'
import { hashPassword } from '../shared/password/password.js'

const { Client } = pg

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function main() {
  const env = loadEnv()
  const client = new Client(env.pgPoolConfig)
  const seedPath = path.join(__dirname, '../../seeds/0001_seed_base.sql')
  const sql = await readFile(seedPath, 'utf8')

  await client.connect()
  try {
    await client.query(sql)

    const adminRole = await client.query<{ id: string }>(
      `SELECT id
       FROM app_roles
       WHERE code = 'ADMIN'
       LIMIT 1`,
    )
    if (!adminRole.rows[0]) {
      throw new Error(
        "Seed abortado: role sistêmico 'ADMIN' não encontrado em app_roles.",
      )
    }

    const adminHash = await hashPassword('12345678')
    await client.query(
      `
      INSERT INTO app_users (
        id,
        email,
        password_hash,
        is_active,
        role_id,
        collaborator_id,
        avatar_url,
        password_changed_at,
        must_change_password,
        deleted_at
      )
      VALUES (
        '11111111-aaaa-4444-bbbb-999999999999'::uuid,
        $1,
        $2,
        true,
        $3::uuid,
        NULL,
        NULL,
        now(),
        true,
        NULL
      )
      ON CONFLICT (email) DO UPDATE SET
        password_hash = EXCLUDED.password_hash,
        is_active = EXCLUDED.is_active,
        role_id = EXCLUDED.role_id,
        collaborator_id = EXCLUDED.collaborator_id,
        avatar_url = EXCLUDED.avatar_url,
        password_changed_at = COALESCE(app_users.password_changed_at, EXCLUDED.password_changed_at),
        must_change_password = EXCLUDED.must_change_password,
        deleted_at = EXCLUDED.deleted_at
      `,
      ['admin@multivacia.com', adminHash, adminRole.rows[0].id],
    )

    const demoPassword = process.env.SEED_DEMO_PASSWORD ?? 'SenhaSegura123'
    const hash = await hashPassword(demoPassword)
    await client.query(
      `
      INSERT INTO app_users (
        id,
        email,
        password_hash,
        is_active,
        role_id,
        collaborator_id,
        avatar_url,
        password_changed_at,
        must_change_password,
        deleted_at
      )
      VALUES (
        '44444444-4444-4444-4444-444444444444'::uuid,
        $1,
        $2,
        true,
        '22222222-2222-2222-2222-222222222222'::uuid,
        '3a5f3c72-2e75-4e0a-8f6e-6d4d086e5f1c'::uuid,
        'https://api.dicebear.com/7.x/avataaars/svg?seed=maria',
        now(),
        false,
        NULL
      )
      ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        password_hash = EXCLUDED.password_hash,
        is_active = EXCLUDED.is_active,
        role_id = EXCLUDED.role_id,
        collaborator_id = EXCLUDED.collaborator_id,
        avatar_url = EXCLUDED.avatar_url,
        password_changed_at = COALESCE(app_users.password_changed_at, EXCLUDED.password_changed_at),
        must_change_password = EXCLUDED.must_change_password,
        deleted_at = EXCLUDED.deleted_at
      `,
      ['maria@exemplo.com', hash],
    )

    console.log('Seed concluído.')
    console.log(
      'Conta administrativa: admin@multivacia.com — senha temporária: 12345678 (troca obrigatória no primeiro acesso).',
    )
    console.log(
      'Conta de acesso: maria@exemplo.com — defina SEED_DEMO_PASSWORD no ambiente para a senha (ver .env.example).',
    )
  } finally {
    await client.end()
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
