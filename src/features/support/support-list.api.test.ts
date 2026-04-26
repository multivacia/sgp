import { describe, expect, it, vi } from 'vitest'
import { getSupportTicket, listSupportTickets } from './support-list.api'

const { requestJson } = vi.hoisted(() => ({ requestJson: vi.fn() }))

vi.mock('../../lib/api/client', () => ({
  requestJson,
}))

describe('support-list.api', () => {
  it('lista chamados com query string correta', async () => {
    requestJson.mockResolvedValue({ items: [], total: 0 })
    await listSupportTickets({ q: 'CHM', status: 'OPEN', period: '7d' })
    expect(requestJson).toHaveBeenCalledWith(
      'GET',
      '/api/v1/support/tickets?q=CHM&status=OPEN&period=7d',
    )
  })

  it('omite period=all da query', async () => {
    requestJson.mockResolvedValue({ items: [], total: 0 })
    await listSupportTickets({ period: 'all' })
    expect(requestJson).toHaveBeenCalledWith('GET', '/api/v1/support/tickets')
  })

  it('GET detalhe por id', async () => {
    requestJson.mockResolvedValue({ id: 'x', code: 'CHM-1' })
    await getSupportTicket('550e8400-e29b-41d4-a716-446655440000')
    expect(requestJson).toHaveBeenCalledWith(
      'GET',
      '/api/v1/support/tickets/550e8400-e29b-41d4-a716-446655440000',
    )
  })
})
