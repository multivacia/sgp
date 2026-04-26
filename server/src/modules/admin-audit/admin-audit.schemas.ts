import { z } from 'zod'
import type { AdminAuditEventType } from './admin-audit.types.js'
import { ADMIN_AUDIT_EVENT_TYPES } from './admin-audit.types.js'

const eventTypeZ = z.enum(
  ADMIN_AUDIT_EVENT_TYPES as unknown as [AdminAuditEventType, ...AdminAuditEventType[]],
)

export const listAdminAuditEventsQuerySchema = z
  .object({
    event_type: eventTypeZ.optional(),
    target_user_id: z.string().uuid().optional(),
    occurred_from: z.string().optional(),
    occurred_to: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(500).optional(),
    offset: z.coerce.number().int().min(0).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.occurred_from?.trim()) {
      const d = new Date(data.occurred_from)
      if (Number.isNaN(d.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['occurred_from'],
          message: 'occurred_from inválido.',
        })
      }
    }
    if (data.occurred_to?.trim()) {
      const d = new Date(data.occurred_to)
      if (Number.isNaN(d.getTime())) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['occurred_to'],
          message: 'occurred_to inválido.',
        })
      }
    }
  })
  .transform((d) => ({
    eventType: d.event_type,
    targetUserId: d.target_user_id,
    occurredFrom: d.occurred_from?.trim()
      ? new Date(d.occurred_from)
      : undefined,
    occurredTo: d.occurred_to?.trim() ? new Date(d.occurred_to) : undefined,
    limit: d.limit ?? 100,
    offset: d.offset ?? 0,
  }))
