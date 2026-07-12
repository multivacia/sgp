import { loadDotenvFiles, loadEnv } from '../config/env.js'
import { getPool } from '../plugins/db.js'
import { signSessionToken } from '../modules/auth/auth.jwt.js'
import { buildSessionIdlePolicy } from '../modules/auth/session-idle-policy.service.js'
import { resetSystemSettingsCacheForTests } from '../modules/system-settings/system-settings.service.js'

loadDotenvFiles()

function readArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag)
  if (idx < 0) return undefined
  return process.argv[idx + 1]
}

async function upsertSetting(
  pool: ReturnType<typeof getPool>,
  key: string,
  value: string,
) {
  await pool.query(
    `
    INSERT INTO system_settings (setting_key, setting_value, value_type, description, is_active)
    VALUES ($1, $2, 'INTEGER', 'homolog temp', true)
    ON CONFLICT (setting_key) DO UPDATE SET
      setting_value = EXCLUDED.setting_value,
      updated_at = now(),
      is_active = true
    `,
    [key, value],
  )
}

async function main() {
  const env = loadEnv()
  const pool = getPool(env)
  const timeoutMinutes = Number(readArg('--timeout') ?? '30')
  const warningMinutes = Number(readArg('--warning') ?? '5')
  const idleElapsedMs = Number(readArg('--idle-elapsed-ms') ?? '0')
  const restoreDefaults = process.argv.includes('--restore-defaults')

  const keys = [
    'SESSION_IDLE_TIMEOUT_MINUTES',
    'SESSION_IDLE_WARNING_MINUTES',
  ] as const

  if (restoreDefaults) {
    await upsertSetting(pool, keys[0], '30')
    await upsertSetting(pool, keys[1], '5')
  } else {
    await upsertSetting(pool, keys[0], String(timeoutMinutes))
    await upsertSetting(pool, keys[1], String(warningMinutes))
  }
  resetSystemSettingsCacheForTests()

  const email = 'diego@bravo.com.br'
  const userRow = await pool.query<{ id: string }>(
    `SELECT id FROM app_users WHERE lower(btrim(email::text)) = lower(btrim($1::text)) AND deleted_at IS NULL LIMIT 1`,
    [email],
  )
  const userId = userRow.rows[0]?.id
  if (!userId) {
    throw new Error(`Usuário ${email} não encontrado para homologação`)
  }
  const stamp = await pool.query<{ t: Date | null }>(
    `SELECT password_changed_at AS t FROM app_users WHERE id = $1::uuid`,
    [userId],
  )
  const pwdStampMs = stamp.rows[0]?.t ? stamp.rows[0].t.getTime() : 0
  const nowMs = Date.now()
  const lastActivityAtMs = Math.max(0, nowMs - idleElapsedMs)
  const activity = {
    authenticatedAtMs: nowMs - 10 * 60_000,
    lastActivityAtMs,
  }
  const token = signSessionToken(userId, email, pwdStampMs, activity, env)
  const sessionIdle = await buildSessionIdlePolicy(pool, activity)

  console.log(
    'SESSION_PREP:' +
      JSON.stringify({
        cookie: { name: env.authCookieName, value: token },
        sessionIdle,
        settings: {
          timeoutMinutes: restoreDefaults ? 30 : timeoutMinutes,
          warningMinutes: restoreDefaults ? 5 : warningMinutes,
        },
        restoredDefaults: restoreDefaults,
      }),
  )

  await pool.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
