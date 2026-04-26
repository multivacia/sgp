import { describe, expect, it, vi } from 'vitest'
import { createSupportTicket } from './support.api'

const { requestJson } = vi.hoisted(() => ({ requestJson: vi.fn() }))

vi.mock('../../lib/api/client', () => ({
  requestJson,
}))

describe('support.api', () => {
  it('envia payload do chamado para endpoint correto', async () => {
    requestJson.mockResolvedValue({
      id: 'ticket-1',
      code: 'CHM-20260421-0001',
    })
    await createSupportTicket({
      category: 'OPERACAO',
      title: 'Assunto',
      description: 'Descricao',
      isBlocking: true,
      moduleName: 'operation-matrix',
      routePath: '/app/matrizes-operacao/nova',
      context: { screen: 'OperationMatrixNewPage' },
    })
    expect(requestJson).toHaveBeenCalledWith('POST', '/api/v1/support/tickets', {
      body: expect.objectContaining({
        category: 'OPERACAO',
        title: 'Assunto',
        description: 'Descricao',
        isBlocking: true,
      }),
    })
  })
})
