import { z } from 'zod'

const nodeTypes = z.enum(['ITEM', 'TASK', 'SECTOR', 'ACTIVITY'])

export const listMatrixItemsQuerySchema = z
  .object({
    search: z.string().optional(),
    is_active: z.string().optional(),
  })
  .transform((data) => {
    const search =
      data.search?.trim() === '' || data.search === undefined
        ? undefined
        : data.search.trim()
    const raw = data.is_active?.trim().toLowerCase()
    let is_active: boolean | undefined
    if (raw === 'true' || raw === '1') is_active = true
    else if (raw === 'false' || raw === '0') is_active = false
    return { search, is_active }
  })

export const createMatrixNodeBodySchema = z
  .object({
    nodeType: nodeTypes,
    parentId: z.string().uuid().nullable().optional(),
    name: z.string().min(1),
    code: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    orderIndex: z.number().int().optional(),
    isActive: z.boolean().optional(),
    plannedMinutes: z.number().int().nullable().optional(),
    defaultResponsibleId: z.string().uuid().nullable().optional(),
    teamIds: z.array(z.string().uuid()).optional(),
    required: z.boolean().optional(),
    sourceKey: z.string().nullable().optional(),
    metadataJson: z.unknown().optional(),
  })
  .superRefine((data, ctx) => {
    const isActivity = data.nodeType === 'ACTIVITY'
    if (!isActivity) {
      if (data.plannedMinutes !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['plannedMinutes'],
          message:
            'planned_minutes só é aceito para nós do tipo ACTIVITY.',
        })
      }
      if (data.defaultResponsibleId !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['defaultResponsibleId'],
          message:
            'default_responsible_id só é aceito para nós do tipo ACTIVITY.',
        })
      }
      if (data.teamIds !== undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['teamIds'],
          message: 'teamIds só é aceito para nós do tipo ACTIVITY.',
        })
      }
    }
    if (data.nodeType === 'ITEM' && data.parentId != null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['parentId'],
        message: 'ITEM deve ser raiz (parentId nulo).',
      })
    }
    if (data.nodeType !== 'ITEM' && (data.parentId == null || data.parentId === '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['parentId'],
        message: 'parentId é obrigatório para este tipo de nó.',
      })
    }
  })

export const patchMatrixNodeBodySchema = z
  .object({
    name: z.string().min(1).optional(),
    code: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    orderIndex: z.number().int().optional(),
    isActive: z.boolean().optional(),
    plannedMinutes: z.number().int().nullable().optional(),
    defaultResponsibleId: z.string().uuid().nullable().optional(),
    teamIds: z.array(z.string().uuid()).optional(),
    required: z.boolean().optional(),
    sourceKey: z.string().nullable().optional(),
    metadataJson: z.unknown().optional(),
  })
  .strict()

export const reorderBodySchema = z.object({
  direction: z.enum(['up', 'down']),
})

export type CreateMatrixNodeBody = z.infer<typeof createMatrixNodeBodySchema>
export type PatchMatrixNodeBody = z.infer<typeof patchMatrixNodeBodySchema>
export type ReorderBody = z.infer<typeof reorderBodySchema>

export const uuidParamSchema = z.string().uuid()
