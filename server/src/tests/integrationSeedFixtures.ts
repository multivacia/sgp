import type pg from 'pg'
import { hashPassword } from '../shared/password/password.js'

export const MARIA_COLLABORATOR_ID = '3a5f3c72-2e75-4e0a-8f6e-6d4d086e5f1c'
export const MARIA_APP_USER_ID = '44444444-4444-4444-4444-444444444444'
export const MARIA_APP_USER_EMAIL = 'maria@exemplo.com'

/** Libera `collaborator_id` em todas as linhas de `app_users` (inclui arquivadas). */
export async function clearAppUserLinksForCollaborator(
  pool: pg.Pool,
  collaboratorId: string,
): Promise<void> {
  await pool.query(
    `UPDATE app_users SET collaborator_id = NULL WHERE collaborator_id = $1::uuid`,
    [collaboratorId],
  )
}

/** Vincula utilizador a colaborador respeitando `idx_app_users_collaborator_id_unique`. */
export async function linkAppUserToCollaborator(
  pool: pg.Pool,
  appUserId: string,
  collaboratorId: string,
): Promise<void> {
  await clearAppUserLinksForCollaborator(pool, collaboratorId)
  await pool.query(
    `UPDATE app_users SET collaborator_id = $1::uuid WHERE id = $2::uuid`,
    [collaboratorId, appUserId],
  )
}

export async function unlinkAppUserCollaborator(
  pool: pg.Pool,
  appUserId: string,
): Promise<void> {
  await pool.query(
    `UPDATE app_users SET collaborator_id = NULL WHERE id = $1::uuid`,
    [appUserId],
  )
}

/**
 * Garante dados mínimos alinhados a `seeds/0001_seed_base.sql` para testes de integração.
 * Evita dependência frágil de “seed já aplicado manualmente” em CI ou bases locais.
 */
export async function ensureMariaCollaboratorSeedForIntegration(
  pool: pg.Pool,
): Promise<void> {
  await pool.query(`
    INSERT INTO app_roles (id, code, name) VALUES
      ('11111111-1111-1111-1111-111111111111', 'ADMIN', 'Administrador'),
      ('22222222-2222-2222-2222-222222222222', 'COLABORADOR', 'Colaborador'),
      ('33333333-3333-3333-3333-333333333333', 'GESTOR', 'Gestor operacional')
    ON CONFLICT (code) DO NOTHING
  `)

  await pool.query(`
    INSERT INTO sectors (id, name) VALUES
      ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Tapeçaria'),
      ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Costura'),
      ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Acabamento')
    ON CONFLICT (id) DO NOTHING
  `)

  await pool.query(
    `
    UPDATE collaborators
    SET code = 'COL-LEG-' || substring(replace(id::text, '-', ''), 1, 12)
    WHERE code = 'COL-001'
      AND id <> '3a5f3c72-2e75-4e0a-8f6e-6d4d086e5f1c'::uuid
      AND deleted_at IS NULL
    `,
  )

  await pool.query(
    `
    INSERT INTO collaborators (
      id,
      code,
      full_name,
      email,
      phone,
      job_title,
      avatar_url,
      sector_id,
      role_id,
      status,
      is_active
    ) VALUES (
      '3a5f3c72-2e75-4e0a-8f6e-6d4d086e5f1c',
      'COL-001',
      'Maria Silva',
      'maria@exemplo.com',
      '11999999999',
      'Costureira',
      'https://api.dicebear.com/7.x/avataaars/svg?seed=maria-colab',
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
      '22222222-2222-2222-2222-222222222222'::uuid,
      'ACTIVE',
      true
    )
    ON CONFLICT (id) DO UPDATE SET
      deleted_at = NULL,
      is_active = true,
      status = 'ACTIVE',
      full_name = EXCLUDED.full_name,
      email = EXCLUDED.email,
      sector_id = EXCLUDED.sector_id,
      role_id = EXCLUDED.role_id,
      code = EXCLUDED.code
    `,
  )

  await clearAppUserLinksForCollaborator(pool, MARIA_COLLABORATOR_ID)

  const hash = await hashPassword('IntegrationSeedMaria1!')
  await pool.query(
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
      $1::uuid,
      $2,
      $3,
      true,
      '22222222-2222-2222-2222-222222222222'::uuid,
      $4::uuid,
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
    [MARIA_APP_USER_ID, MARIA_APP_USER_EMAIL, hash, MARIA_COLLABORATOR_ID],
  )
}
