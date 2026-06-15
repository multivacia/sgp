import { z } from 'zod'
import { CONVEYOR_OPERATIONAL_STATUSES } from '../conveyors/conveyorOperationalStatus.js'

export const conveyorProgressQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  operationalStatus: z.enum(CONVEYOR_OPERATIONAL_STATUSES).optional(),
  timeEntryFrom: z.string().datetime({ offset: true }).optional(),
  timeEntryTo: z.string().datetime({ offset: true }).optional(),
  collaboratorId: z.string().uuid().optional(),
  onlyExceeded: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
})

export type ConveyorProgressQuery = z.infer<typeof conveyorProgressQuerySchema>
