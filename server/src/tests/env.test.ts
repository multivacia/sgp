import { describe, expect, it } from 'vitest'
import {
  hasDatabaseConnectionInEnv,
  resolveAppVersionMetadata,
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

describe('resolveAppVersionMetadata', () => {
  it('prioriza APP_ENV e APP_VERSION sobre fallback do ambiente', () => {
    expect(
      resolveAppVersionMetadata(
        {
          APP_VERSION: '2.4.0',
          APP_RELEASE_NAME: 'release-2-4-0',
          APP_ENV: 'hml',
          GIT_SHA: 'abcdef123456',
          BUILD_TIME: '2026-07-09T22:37:00Z',
          NODE_ENV: 'production',
        } as NodeJS.ProcessEnv,
        'production',
      ),
    ).toEqual({
      product: 'SGP+',
      version: '2.4.0',
      releaseName: 'release-2-4-0',
      environment: 'homologation',
      commit: 'abcdef123456',
      buildTime: '2026-07-09T22:37:00Z',
    })
  })

  it('usa fallback seguro quando metadados não são informados', () => {
    const metadata = resolveAppVersionMetadata(
      {
        NODE_ENV: 'test',
      } as NodeJS.ProcessEnv,
      'test',
    )

    expect(metadata.product).toBe('SGP+')
    expect(metadata.version).toBe('1.9.0')
    expect(metadata.releaseName).toBe(
      'Dispensa de atividades, catálogo de motivos e melhorias operacionais',
    )
    expect(metadata.environment).toBe('development')
    expect(metadata.commit).toBe('local')
    expect(metadata.buildTime).toBeNull()
  })
})
