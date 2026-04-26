import { requestJson } from '../../lib/api/client'
import type { SupportTicketCreateInput, SupportTicketCreateResult } from './support.types'

const BASE = '/api/v1/support/tickets'

export async function createSupportTicket(
  input: SupportTicketCreateInput,
): Promise<SupportTicketCreateResult> {
  return requestJson<SupportTicketCreateResult>('POST', BASE, { body: input })
}
