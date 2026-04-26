import { beforeEach, describe, expect, it, vi } from 'vitest'
import type pg from 'pg'
import type { Env } from '../config/env.js'
import { createSupportTicket } from '../modules/support/support.service.js'

const {
  createTicketRecord,
  insertNotificationAttempts,
  resolveRoutingPlan,
  dispatchNotifications,
} = vi.hoisted(() => ({
  createTicketRecord: vi.fn(),
  insertNotificationAttempts: vi.fn(),
  resolveRoutingPlan: vi.fn(),
  dispatchNotifications: vi.fn(),
}))

vi.mock('../modules/support/support.repository.js', () => ({
  createTicketRecord,
  insertNotificationAttempts,
}))

vi.mock('../modules/support/support.routing.js', () => ({
  resolveRoutingPlan,
}))

vi.mock('../modules/support/support.notifications.js', () => ({
  dispatchNotifications,
}))

const env = {
  supportTicketsEnabled: true,
  supportEmailEnabled: true,
  supportWhatsappEnabled: true,
} as Env

const pool = {} as pg.Pool

describe('support service orchestration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    createTicketRecord.mockResolvedValue({
      id: 'ticket-1',
      code: 'CHM-20260421-0001',
      status: 'OPEN',
      category: 'OPERACAO',
      severity: 'MEDIUM',
      title: 'Teste',
      description: 'Descricao',
      createdByUserId: 'user-1',
      createdByCollaboratorId: null,
      moduleName: 'shell',
      routePath: '/app/backlog',
      context: {},
      requestId: null,
      correlationId: null,
      createdAt: '2026-04-21T00:00:00.000Z',
      updatedAt: '2026-04-21T00:00:00.000Z',
    })
    resolveRoutingPlan.mockReturnValue({
      items: [
        { channel: 'EMAIL', destinations: ['suporte@empresa.com'] },
        { channel: 'WHATSAPP', destinations: [] },
      ],
    })
    dispatchNotifications.mockResolvedValue([
      {
        channel: 'EMAIL',
        destination: 'suporte@empresa.com',
        status: 'SENT',
      },
    ])
    insertNotificationAttempts.mockResolvedValue(undefined)
  })

  it('isBlocking=false gera severity MEDIUM e status OPEN', async () => {
    const out = await createSupportTicket(pool, env, 'user-1', {
      category: 'OPERACAO',
      title: 'Teste',
      description: 'Descricao',
      isBlocking: false,
    })
    expect(createTicketRecord).toHaveBeenCalledWith(
      pool,
      expect.objectContaining({ severity: 'MEDIUM' }),
    )
    expect(out.status).toBe('OPEN')
    expect(out.code).toContain('CHM-')
  })

  it('isBlocking=true gera severity HIGH e roteamento HIGH', async () => {
    await createSupportTicket(pool, env, 'user-1', {
      category: 'OPERACAO',
      title: 'Teste',
      description: 'Descricao',
      isBlocking: true,
    })
    expect(createTicketRecord).toHaveBeenCalledWith(
      pool,
      expect.objectContaining({ severity: 'HIGH' }),
    )
    expect(resolveRoutingPlan).toHaveBeenCalledWith(
      env,
      expect.objectContaining({ severity: 'HIGH' }),
    )
  })

  it('persiste ticket antes de notificação', async () => {
    await createSupportTicket(pool, env, 'user-1', {
      category: 'OPERACAO',
      title: 'Teste',
      description: 'Descricao',
      isBlocking: false,
    })
    expect(createTicketRecord.mock.invocationCallOrder[0]).toBeLessThan(
      dispatchNotifications.mock.invocationCallOrder[0],
    )
  })

  it('falha total de canais não invalida criação e grava tentativas', async () => {
    dispatchNotifications.mockResolvedValue([
      {
        channel: 'EMAIL',
        destination: 'suporte@empresa.com',
        status: 'FAILED',
        errorMessage: 'smtp down',
      },
      {
        channel: 'WHATSAPP',
        destination: '5511999999999',
        status: 'SKIPPED',
        errorMessage: 'disabled',
      },
    ])
    const out = await createSupportTicket(pool, env, 'user-1', {
      category: 'OPERACAO',
      title: 'Teste',
      description: 'Descricao',
      isBlocking: true,
    })
    expect(out.code).toBeTruthy()
    expect(out.notificationSummary.email).toBe('FAILED')
    expect(out.notificationSummary.whatsapp).toBe('SKIPPED')
    expect(insertNotificationAttempts).toHaveBeenCalledWith(
      pool,
      'ticket-1',
      expect.arrayContaining([
        expect.objectContaining({ channel: 'EMAIL', status: 'FAILED' }),
        expect.objectContaining({ channel: 'WHATSAPP', status: 'SKIPPED' }),
      ]),
    )
  })
})
