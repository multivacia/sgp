import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Env } from '../config/env.js'
import {
  buildSupportEmailSubject,
  dispatchNotifications,
} from '../modules/support/support.notifications.js'
import type { PersistedSupportTicket } from '../modules/support/support.types.js'

const { createTransport } = vi.hoisted(() => ({
  createTransport: vi.fn(),
}))

vi.mock('nodemailer', () => ({
  default: {
    createTransport,
  },
}))

function baseEnv(over: Partial<Env> = {}): Env {
  return {
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
    argosIngestTimeoutMs: 120_000,
    documentDraftMaxFileBytes: 15 * 1024 * 1024,
    argosRemoteRequired: false,
    argosUseMinimalStub: false,
    supportTicketsEnabled: true,
    supportEmailSubjectPrefix: '[SGP]',
    smtpPort: 587,
    smtpSecure: false,
    smtpRequireTls: true,
    supportEmailEnabled: false,
    supportWhatsappEnabled: false,
    ...over,
  }
}

const ticket: PersistedSupportTicket = {
  id: 't1',
  code: 'CHM-20260422-0001',
  status: 'OPEN',
  category: 'OPERACAO',
  severity: 'HIGH',
  title: 'Assunto teste',
  description: 'Corpo da descrição',
  createdByUserId: '44444444-4444-4444-4444-444444444444',
  createdByCollaboratorId: null,
  moduleName: 'shell',
  routePath: '/app/backlog',
  context: {},
  requestId: null,
  correlationId: null,
  createdAt: '2026-04-22T12:00:00.000Z',
}

describe('support notifications (email)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('SUPPORT_EMAIL_ENABLED=0 → EMAIL SKIPPED', async () => {
    const env = baseEnv({ supportEmailEnabled: false })
    const results = await dispatchNotifications(
      env,
      [{ channel: 'EMAIL', destination: 'a@b.com' }],
      ticket,
    )
    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      channel: 'EMAIL',
      destination: 'a@b.com',
      status: 'SKIPPED',
    })
    expect(createTransport).not.toHaveBeenCalled()
  })

  it('SMTP sucesso → SENT', async () => {
    const sendMail = vi.fn().mockResolvedValue({ messageId: '<msg-1@host>' })
    createTransport.mockReturnValue({ sendMail })

    const env = baseEnv({
      supportEmailEnabled: true,
      supportEmailFrom: 'sgp@test.local',
      smtpHost: 'smtp.test.local',
      smtpUser: 'u',
      smtpPass: 'p',
    })

    const results = await dispatchNotifications(
      env,
      [{ channel: 'EMAIL', destination: 'dest@test.local' }],
      ticket,
    )

    expect(results[0]?.status).toBe('SENT')
    expect(results[0]?.providerMessageId).toBe('msg-1@host')
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 'sgp@test.local',
        to: 'dest@test.local',
        subject: expect.stringContaining('[CHM-20260422-0001]'),
        text: expect.stringContaining('Protocolo: CHM-20260422-0001'),
      }),
    )
  })

  it('SMTP falha → FAILED', async () => {
    const sendMail = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'))
    createTransport.mockReturnValue({ sendMail })

    const env = baseEnv({
      supportEmailEnabled: true,
      supportEmailFrom: 'sgp@test.local',
      smtpHost: 'smtp.test.local',
    })

    const results = await dispatchNotifications(
      env,
      [{ channel: 'EMAIL', destination: 'dest@test.local' }],
      ticket,
    )

    expect(results[0]?.status).toBe('FAILED')
    expect(results[0]?.errorMessage).toContain('ECONNREFUSED')
  })

  it('assunto segue prefixo + protocolo + severidade', () => {
    const subject = buildSupportEmailSubject(
      baseEnv({ supportEmailSubjectPrefix: '[SGP]' }),
      'CHM-X',
      'MEDIUM',
      'CAT',
      'Título',
    )
    expect(subject).toBe('[SGP][CHM-X][MEDIUM] CAT - Título')
  })
})
