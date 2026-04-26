import { z } from 'zod'

export const uuidParamSchema = z.string().uuid()

const nameSchema = z
  .string()
  .transform((s) => s.trim())
  .pipe(z.string().min(1, { message: 'Nome é obrigatório.' }).max(256, { message: 'Nome demasiado longo.' }))

const roleNameSchema = z
  .string()
  .transform((s) => s.trim())
  .pipe(z.string().min(1, { message: 'Nome é obrigatório.' }).max(128, { message: 'Nome demasiado longo.' }))

export const createSectorBodySchema = z.object({
  name: nameSchema,
})

export const patchSectorBodySchema = z.object({
  name: nameSchema.optional(),
  isActive: z.boolean().optional(),
})

export const createCollaboratorRoleBodySchema = z.object({
  name: roleNameSchema,
  /** Opcional; se omitido ou vazio, o servidor gera código único `OPF_*`. */
  code: z.preprocess(
    (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
    z.string().min(2).max(32).optional(),
  ),
})

export const patchCollaboratorRoleBodySchema = z.object({
  name: roleNameSchema.optional(),
  code: z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(2).max(32))
    .optional(),
  isActive: z.boolean().optional(),
})

export type CreateSectorBody = z.infer<typeof createSectorBodySchema>
export type PatchSectorBody = z.infer<typeof patchSectorBodySchema>
export type CreateCollaboratorRoleBody = z.infer<typeof createCollaboratorRoleBodySchema>
export type PatchCollaboratorRoleBody = z.infer<typeof patchCollaboratorRoleBodySchema>
