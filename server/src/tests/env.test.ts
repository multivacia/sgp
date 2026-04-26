import { describe, expect, it } from 'vitest'
import {
  hasDatabaseConnectionInEnv,
  resolvePgPoolConfig,
} from '../config/env.js'

describe('resolvePgPoolConfig', () => {
  it('Modo A: DATABASE_URL tem prioridade sobre PG*', () => {
    expect(
      resolvePgPoolConfig({
        DATABASE_URL: 'postgres://u:p@localhost:5432/db',
        PGHOST: 'other-host',
        PGPORT: '5433',
        PGDATABASE: 'x',
        PGUSER: 'x',
        PGPASSWORD: 'x',
      } as NodeJS.ProcessEnv),
    ).toEqual({ connectionString: 'postgres://u:p@localhost:5432/db' })
  })

  it('Modo B: retorna campos estruturados', () => {
    expect(
      resolvePgPoolConfig({
        DATABASE_URL: '',
        PGHOST: 'localhost',
        PGPORT: '5432',
        PGDATABASE: 'sgp',
        PGUSER: 'postgres',
        PGPASSWORD: 'secret',
      } as NodeJS.ProcessEnv),
    ).toEqual({
      host: 'localhost',
      port: 5432,
      database: 'sgp',
      user: 'postgres',
      password: 'secret',
    })
  })

  it('Modo B: falha se faltar variável obrigatória', () => {
    expect(() =>
      resolvePgPoolConfig({
        PGHOST: 'localhost',
        PGPORT: '5432',
      } as NodeJS.ProcessEnv),
    ).toThrow(/PGDATABASE|PGUSER|PGPASSWORD/)
  })
})

describe('hasDatabaseConnectionInEnv', () => {
  it('true com DATABASE_URL', () => {
    expect(hasDatabaseConnectionInEnv({ DATABASE_URL: 'postgres://x' } as NodeJS.ProcessEnv)).toBe(
      true,
    )
  })

  it('true com PG* completos', () => {
    expect(
      hasDatabaseConnectionInEnv({
        PGHOST: 'localhost',
        PGPORT: '5432',
        PGDATABASE: 'sgp',
        PGUSER: 'postgres',
        PGPASSWORD: 'x',
      } as NodeJS.ProcessEnv),
    ).toBe(true)
  })

  it('false sem Modo A nem Modo B completo', () => {
    expect(hasDatabaseConnectionInEnv({ PGHOST: 'localhost' } as NodeJS.ProcessEnv)).toBe(false)
  })
})
