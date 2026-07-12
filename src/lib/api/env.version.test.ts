import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  getAppEnvironmentLabel,
  resolveFrontendVersionMetadata,
} from './env'

type TestGlobal = typeof globalThis & {
  __SGP_APP_BASE_METADATA__?: {
    product: string
    version: string
    releaseName: string
  }
}

describe('frontend version metadata', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    ;(globalThis as TestGlobal).__SGP_APP_BASE_METADATA__ = undefined
  })

  it('usa app-version.json como base segura', () => {
    ;(globalThis as TestGlobal).__SGP_APP_BASE_METADATA__ = {
      product: 'SGP+',
      version: '1.8.4',
      releaseName: 'Aviso de inatividade da sessão administrativa',
    }
    const metadata = resolveFrontendVersionMetadata()

    expect(metadata.product).toBe('SGP+')
    expect(metadata.version).toBe('1.8.4')
    expect(metadata.releaseName).toBe('Aviso de inatividade da sessão administrativa')
    expect(metadata.environment).toBe('development')
    expect(metadata.commitSha).toBe('local')
    expect(metadata.buildTime).toBeNull()
  })

  it('prioriza overrides Vite para ambiente e build metadata', () => {
    ;(globalThis as TestGlobal).__SGP_APP_BASE_METADATA__ = {
      product: 'SGP+',
      version: '1.8.4',
      releaseName: 'Aviso de inatividade da sessão administrativa',
    }
    vi.stubEnv('VITE_APP_VERSION', '1.8.4-rc.1')
    vi.stubEnv('VITE_APP_RELEASE_NAME', 'rc-kiosk-contrast')
    vi.stubEnv('VITE_APP_ENV', 'homologation')
    vi.stubEnv('VITE_GIT_SHA', 'fedcba987654')
    vi.stubEnv('VITE_BUILD_TIME', '2026-07-09T22:37:00Z')

    expect(resolveFrontendVersionMetadata()).toEqual({
      product: 'SGP+',
      version: '1.8.4-rc.1',
      releaseName: 'rc-kiosk-contrast',
      environment: 'homologation',
      environmentLabel: 'Homologação',
      commitSha: 'fedcba987654',
      buildTime: '2026-07-09T22:37:00Z',
    })
  })

  it('mapeia ambiente desconhecido para label PT-BR segura', () => {
    expect(getAppEnvironmentLabel('qa')).toBe('Desconhecido')
  })
})
