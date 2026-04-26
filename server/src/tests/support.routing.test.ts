import { describe, expect, it } from 'vitest'
import type { Env } from '../config/env.js'
import { resolveRoutingPlan } from '../modules/support/support.routing.js'

const baseEnv: Env = {
  nodeEnv: 'test',
  port: 4000,
  pgPoolConfig: { connectionString: 'postgres://localhost/test' },
  corsOrigin: '*',
  logLevel: 'error',
  jwtSecret: 'test-jwt-secret-minimum-16-chars',
  jwtExpiresDays: 7,
  authCookieName: 'sgp_auth',
  loginMaxFailedAttempts: 5,
  loginLockoutMinutes: 15,
  argosPolicyMode: 'balanced',
  argosIngestTimeoutMs: 120000,
  documentDraftMaxFileBytes: 15 * 1024 * 1024,
  argosRemoteRequired: false,
  argosUseMinimalStub: false,
  supportTicketsEnabled: true,
  supportEmailEnabled: true,
  supportWhatsappEnabled: true,
  supportEmailSubjectPrefix: '[SGP]',
  smtpPort: 587,
  smtpSecure: false,
  smtpRequireTls: true,
}

describe('support routing', () => {
  it('MEDIUM resolve somente EMAIL por configuração', () => {
    const plan = resolveRoutingPlan(
      {
        ...baseEnv,
        supportRoutingMediumEmail: 'suporte@empresa.com',
      },
      { severity: 'MEDIUM', category: 'OPERACAO' },
    )
    expect(plan.items.find((i) => i.channel === 'EMAIL')?.destinations).toEqual([
      'suporte@empresa.com',
    ])
    expect(plan.items.find((i) => i.channel === 'WHATSAPP')?.destinations).toEqual([])
  })

  it('HIGH resolve EMAIL + WHATSAPP', () => {
    const plan = resolveRoutingPlan(
      {
        ...baseEnv,
        supportRoutingHighEmail: 'suporte@empresa.com,gestao@empresa.com',
        supportRoutingHighWhatsapp: '5511999999999',
      },
      { severity: 'HIGH', category: 'ERRO' },
    )
    expect(plan.items.find((i) => i.channel === 'EMAIL')?.destinations).toEqual([
      'suporte@empresa.com',
      'gestao@empresa.com',
    ])
    expect(plan.items.find((i) => i.channel === 'WHATSAPP')?.destinations).toEqual([
      '5511999999999',
    ])
  })
})
