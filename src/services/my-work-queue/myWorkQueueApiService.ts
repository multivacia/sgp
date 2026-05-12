import type {
  MyWorkQueueResponse,
  MyWorkQueueResult,
} from '../../domain/my-work-queue/my-work-queue.types'
import { requestJsonEnvelope } from '../../lib/api/client'

const BASE = '/api/v1'

export async function getMyWorkQueue(options?: {
  date?: string
  includePastDue?: boolean
}): Promise<MyWorkQueueResult> {
  const sp = new URLSearchParams()
  if (options?.date) sp.set('date', options.date)
  if (options?.includePastDue === false) sp.set('includePastDue', 'false')
  const qs = sp.toString()
  const path = qs ? `${BASE}/me/work-queue?${qs}` : `${BASE}/me/work-queue`
  const { data, meta } = await requestJsonEnvelope<MyWorkQueueResponse>('GET', path)
  return {
    data,
    collaboratorId: (meta.collaboratorId as string | null | undefined) ?? null,
    unavailableReason:
      (meta.unavailableReason as string | null | undefined) ?? null,
  }
}
