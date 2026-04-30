import { z } from 'zod'
import {
  conveyorOperationalEventSourceValues,
  conveyorOperationalEventTypeValues,
} from './conveyor-operational-events.types.js'

const emptyQueryToUndefined = (v: unknown): unknown =>
  v === '' || v === undefined ? undefined : v

export const conveyorOperationalEventTypeSchema = z.enum(
  conveyorOperationalEventTypeValues,
)
export const conveyorOperationalEventSourceSchema = z.enum(
  conveyorOperationalEventSourceValues,
)

export const createConveyorOperationalEventBodySchema = z.object({
  conveyorId: z.string().uuid(),
  nodeId: z.string().uuid().nullable().optional(),
  eventType: conveyorOperationalEventTypeSchema,
  previousValue: z.string().max(4000).nullable().optional(),
  newValue: z.string().max(4000).nullable().optional(),
  reason: z.string().min(1).max(120).nullable().optional(),
  source: conveyorOperationalEventSourceSchema,
  occurredAt: z.string().datetime({ offset: true }),
  metadataJson: z.record(z.string(), z.unknown()).nullable().optional(),
  idempotencyKey: z.string().min(1).max(180).nullable().optional(),
})

export const conveyorOperationalEventsByConveyorParamsSchema = z.object({
  id: z.string().uuid(),
})

export const listConveyorOperationalEventsQuerySchema = z.object({
  limit: z.preprocess(
    emptyQueryToUndefined,
    z.coerce.number().int().min(1).max(200).optional().default(50),
  ),
})

export type CreateConveyorOperationalEventBody = z.infer<
  typeof createConveyorOperationalEventBodySchema
>
export type ListConveyorOperationalEventsQuery = z.infer<
  typeof listConveyorOperationalEventsQuerySchema
>

