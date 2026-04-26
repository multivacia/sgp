import { z } from 'zod'

export const createSupportTicketBodySchema = z.object({
  category: z.string().trim().min(1).max(30),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(10000),
  isBlocking: z.boolean(),
  moduleName: z.string().trim().min(1).max(80).nullable().optional(),
  routePath: z.string().trim().min(1).max(255).nullable().optional(),
  context: z.record(z.unknown()).optional(),
  requestId: z.string().trim().min(1).max(100).nullable().optional(),
  correlationId: z.string().trim().min(1).max(100).nullable().optional(),
})

export const supportTicketIdParamSchema = z.string().uuid()

export const listMySupportTicketsQuerySchema = z
  .object({
    q: z.string().trim().max(200).optional(),
    status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']).optional(),
    category: z.string().trim().max(30).optional(),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    period: z.enum(['all', 'today', '7d', '30d']).optional().default('all'),
  })
  .transform((data) => ({
    q: data.q && data.q.length > 0 ? data.q : undefined,
    status: data.status,
    category: data.category && data.category.length > 0 ? data.category : undefined,
    severity: data.severity,
    period: data.period ?? 'all',
  }))

export type ListMySupportTicketsQuery = z.infer<typeof listMySupportTicketsQuerySchema>

export type CreateSupportTicketBody = z.infer<typeof createSupportTicketBodySchema>
