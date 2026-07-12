import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import pg from 'pg'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../server/.env') })

const pool = new pg.Pool({
  host: process.env.PGHOST,
  port: Number(process.env.PGPORT || 5432),
  database: process.env.PGDATABASE,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
})

const users = await pool.query(`
  SELECT email, is_active, must_change_password, role_id
  FROM app_users
  WHERE deleted_at IS NULL
  ORDER BY email
  LIMIT 15
`)
console.log('USERS', JSON.stringify(users.rows, null, 2))

const settings = await pool.query(`
  SELECT key, value
  FROM system_settings
  WHERE key LIKE 'SESSION_IDLE%'
`)
console.log('SETTINGS', JSON.stringify(settings.rows, null, 2))

const perms = await pool.query(`
  SELECT ar.code AS role_code, ap.code AS permission
  FROM app_role_permissions arp
  JOIN app_roles ar ON ar.id = arp.role_id
  JOIN app_permissions ap ON ap.id = arp.permission_id
  WHERE ap.code LIKE 'system.settings%'
  ORDER BY ar.code, ap.code
`)
console.log('SYSTEM_SETTINGS_PERMS', JSON.stringify(perms.rows, null, 2))

await pool.end()
