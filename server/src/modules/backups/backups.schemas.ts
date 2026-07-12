import { z } from 'zod'

export const backupIdParamSchema = z.object({
  id: z.string().uuid(),
})

export const walIdParamSchema = z.object({
  id: z.string().uuid(),
})
