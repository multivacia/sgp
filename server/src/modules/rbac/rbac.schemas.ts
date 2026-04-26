import { z } from 'zod'

export const putRolePermissionsBodySchema = z.object({
  permissionCodes: z.array(z.string().min(1).max(256)).default([]),
})

export type PutRolePermissionsBody = z.infer<typeof putRolePermissionsBodySchema>
