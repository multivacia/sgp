import pg from 'pg'
import type { Env } from '../config/env.js'

const { Pool } = pg

let pool: pg.Pool | undefined

export function getPool(env: Env): pg.Pool {
  if (!pool) {
    const opts: pg.PoolConfig = { ...env.pgPoolConfig }
    if (env.pgPoolMax != null) {
      opts.max = env.pgPoolMax
    }
    pool = new Pool(opts)
  }
  return pool
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = undefined
  }
}
