import type pg from 'pg'

export type SectorRow = {
  id: string
  name: string
}

export async function listSectors(pool: pg.Pool): Promise<SectorRow[]> {
  const r = await pool.query<SectorRow>(
    `SELECT id, name FROM sectors WHERE is_active = true ORDER BY name ASC`,
  )
  return r.rows
}
