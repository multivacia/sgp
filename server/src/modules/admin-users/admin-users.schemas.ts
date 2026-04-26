import { z } from 'zod'

export const uuidParamSchema = z.string().uuid()

const minPasswordLen = 8

function refineAvatarUrl(
  path: 'avatarUrl',
  val: string | null | undefined,
  ctx: z.RefinementCtx,
) {
  if (val == null) return
  const s = String(val).trim()
  if (!s) return
  try {
    const u = new URL(s)
    if (u.protocol !== 'http:' && u.protocol !== 'https:') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [path],
        message: 'URL do avatar deve usar http:// ou https://.',
      })
    }
  } catch {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [path],
      message: 'URL do avatar inválida.',
    })
  }
}

export const listAdminUsersQuerySchema = z
  .object({
    search: z.string().optional(),
    role_id: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(500).optional(),
    offset: z.coerce.number().int().min(0).optional(),
  })
  .superRefine((data, ctx) => {
    const r = data.role_id?.trim()
    if (r && !z.string().uuid().safeParse(r).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['role_id'],
        message: 'role_id deve ser um UUID válido.',
      })
    }
  })
  .transform((d) => ({
    search: d.search?.trim() || undefined,
    roleId: d.role_id?.trim() || undefined,
    limit: d.limit ?? 100,
    offset: d.offset ?? 0,
  }))

export const createAdminUserBodySchema = z
  .object({
    email: z.string().trim().email('E-mail inválido.'),
    roleId: z.string().uuid('Papel inválido.'),
    collaboratorId: z.union([z.string().uuid(), z.null()]).optional(),
    avatarUrl: z.union([z.string().max(2048), z.literal(''), z.null()]).optional(),
    password: z
      .string()
      .min(minPasswordLen, `A senha deve ter pelo menos ${minPasswordLen} caracteres.`),
    mustChangePassword: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    refineAvatarUrl('avatarUrl', data.avatarUrl as string | null | undefined, ctx)
  })

const patchPasswordField = z.preprocess((v) => {
  if (typeof v !== 'string') return undefined
  const t = v.trim()
  return t === '' ? undefined : t
}, z.string().min(minPasswordLen, `A senha deve ter pelo menos ${minPasswordLen} caracteres.`).optional())

export const patchAdminUserBodySchema = z
  .object({
    email: z.string().trim().email('E-mail inválido.').optional(),
    roleId: z.union([z.string().uuid(), z.null()]).optional(),
    collaboratorId: z.union([z.string().uuid(), z.null()]).optional(),
    avatarUrl: z.union([z.string().max(2048), z.literal(''), z.null()]).optional(),
    isActive: z.boolean().optional(),
    mustChangePassword: z.boolean().optional(),
    password: patchPasswordField,
  })
  .superRefine((data, ctx) => {
    refineAvatarUrl('avatarUrl', data.avatarUrl as string | null | undefined, ctx)
  })
  .refine((o) => Object.keys(o).length > 0, {
    message: 'Informe pelo menos um campo para atualizar.',
  })

export const eligibleCollaboratorsQuerySchema = z
  .object({
    excludeUserId: z.string().uuid().optional(),
  })
  .transform((d) => ({
    excludeUserId: d.excludeUserId ?? null,
  }))

export type CreateAdminUserBody = z.infer<typeof createAdminUserBodySchema>
export type PatchAdminUserBody = z.infer<typeof patchAdminUserBodySchema>
