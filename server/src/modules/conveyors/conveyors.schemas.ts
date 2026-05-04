import { z } from 'zod'

/** Alinhado a `NovaEsteiraNoOrigem` — minúsculas no JSON e na BD. */
export const sourceOriginNodeSchema = z.enum(['manual', 'reaproveitada', 'base'])

export const postConveyorStepAssigneeSchema = z
  .object({
    /** Retrocompat: ausente => COLLABORATOR. */
    type: z.enum(['COLLABORATOR', 'TEAM']).optional(),
    collaboratorId: z.string().uuid().optional(),
    teamId: z.string().uuid().optional(),
    isPrimary: z.boolean(),
    assignmentOrigin: z.enum(['manual', 'base', 'reaproveitada']).optional(),
    orderIndex: z.number().int().min(0).optional(),
  })
  .superRefine((a, ctx) => {
    const t = a.type ?? 'COLLABORATOR'
    if (t === 'COLLABORATOR') {
      if (!a.collaboratorId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'collaboratorId é obrigatório para assignee COLLABORATOR.',
          path: ['collaboratorId'],
        })
      }
      if (a.teamId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'teamId não é permitido para assignee COLLABORATOR.',
          path: ['teamId'],
        })
      }
      return
    }
    if (!a.teamId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'teamId é obrigatório para assignee TEAM.',
        path: ['teamId'],
      })
    }
    if (a.collaboratorId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'collaboratorId não é permitido para assignee TEAM.',
        path: ['collaboratorId'],
      })
    }
    if (a.isPrimary) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Assignee TEAM não pode ser principal.',
        path: ['isPrimary'],
      })
    }
  })

export const postConveyorStepSchema = z
  .object({
    titulo: z.string().min(1),
    orderIndex: z.number().int().min(1),
    plannedMinutes: z.number().int().min(0),
    sourceOrigin: sourceOriginNodeSchema,
    required: z.boolean().optional().default(true),
    assignees: z.array(postConveyorStepAssigneeSchema).optional().default([]),
  })
  .superRefine((step, ctx) => {
    const a = step.assignees
    if (a.length === 0) return
    const collaboratorRows = a.filter((x) => (x.type ?? 'COLLABORATOR') === 'COLLABORATOR')
    const prim = collaboratorRows.filter((x) => x.isPrimary)
    if (collaboratorRows.length > 0 && prim.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'Cada etapa com colaboradores deve ter exatamente um responsável principal.',
        path: ['assignees'],
      })
    }
    const collaboratorIds = collaboratorRows.map((x) => x.collaboratorId!).filter(Boolean)
    const ids = new Set(collaboratorIds)
    if (ids.size !== collaboratorIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Colaborador duplicado na etapa.',
        path: ['assignees'],
      })
    }
    const teamRows = a.filter((x) => x.type === 'TEAM')
    const teamIds = teamRows.map((x) => x.teamId!).filter(Boolean)
    if (new Set(teamIds).size !== teamIds.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Time duplicado na etapa.',
        path: ['assignees'],
      })
    }
  })

export const postConveyorAreaSchema = z.object({
  titulo: z.string().min(1),
  orderIndex: z.number().int().min(1),
  sourceOrigin: sourceOriginNodeSchema,
  steps: z.array(postConveyorStepSchema).min(1),
})

export const postConveyorOptionSchema = z.object({
  titulo: z.string().min(1),
  orderIndex: z.number().int().min(1),
  sourceOrigin: sourceOriginNodeSchema,
  areas: z.array(postConveyorAreaSchema).min(1),
})

export const postConveyorDadosSchema = z.object({
  nome: z.string().min(1),
  cliente: z.string().optional().default(''),
  veiculo: z.string().optional().default(''),
  modeloVersao: z.string().optional().default(''),
  placa: z.string().optional().default(''),
  observacoes: z.string().optional().default(''),
  responsavel: z.string().optional().default(''),
  prazoEstimado: z.string().optional().default(''),
  prioridade: z.union([z.enum(['alta', 'media', 'baixa']), z.literal('')]).optional(),
  colaboradorId: z.string().uuid().nullable().optional(),
})

const auditSafeStringSchema = z
  .string()
  .min(1)
  .max(500)
  .superRefine((value, ctx) => {
    const lowered = value.toLowerCase()
    const forbidden = [
      'cpf',
      'cnpj',
      'telefone',
      'email',
      'endereco',
      'cep',
      'chassi',
      'partitems',
      'candidatelines',
      'debug',
      'rawtext',
      'pagamento',
      'desconto',
      'troco',
      'recebido',
      'r$',
    ]
    if (forbidden.some((t) => lowered.includes(t))) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'documentReviewAudit contém conteúdo proibido.',
      })
    }
  })

const documentReviewAuditDecisionSchema = z
  .object({
    index: z.number().int().min(0),
    extractedServiceDescription: auditSafeStringSchema,
    finalDecision: z.enum([
      'ACCEPT_SUGGESTED',
      'SELECT_ALTERNATIVE',
      'CONFIRM_CREATE_NEW',
      'IGNORE_ITEM',
    ]),
    finalSourceOrigin: z.enum(['manual', 'reaproveitada', 'base']),
    matchedMatrixNodeId: z.string().nullable().optional(),
    selectedAlternativeMatrixNodeId: z.string().nullable().optional(),
    plannedMinutes: z.number().int().min(0).nullable().optional(),
    confidence: z.number().min(0).max(1).nullable().optional(),
    matchedMatrixNodeType: z.enum(['TASK', 'SECTOR', 'ACTIVITY']).nullable().optional(),
    reusedStructureKind: z.enum(['MATRIX_SUBTREE', 'MATRIX_ACTIVITY']).nullable().optional(),
    expandedSubtree: z.boolean().optional(),
    expandedAreasCount: z.number().int().min(0).nullable().optional(),
    expandedActivitiesCount: z.number().int().min(0).nullable().optional(),
    expandedPlannedMinutesTotal: z.number().int().min(0).nullable().optional(),
    subtreeMaterializationSkippedDuplicate: z.boolean().optional(),
  })
  .strict()

const documentReviewAuditSchema = z
  .object({
    schemaVersion: z.literal('r6_document_review_audit_v1'),
    source: z
      .object({
        provider: z.string().min(1),
        documentType: z.string().min(1),
        documentNumber: z
          .string()
          .max(500)
          .superRefine((value, ctx) => {
            const lowered = value.toLowerCase()
            const forbidden = [
              'cpf',
              'cnpj',
              'telefone',
              'email',
              'endereco',
              'cep',
              'chassi',
              'partitems',
              'candidatelines',
              'debug',
              'rawtext',
              'pagamento',
              'desconto',
              'troco',
              'recebido',
              'r$',
            ]
            if (forbidden.some((t) => lowered.includes(t))) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'documentReviewAudit contém conteúdo proibido.',
              })
            }
          })
          .optional(),
        requestId: z.string().min(1),
        correlationId: z.string().min(1),
      })
      .strict(),
    summary: z
      .object({
        totalServiceItems: z.number().int().min(0),
        reusedCount: z.number().int().min(0),
        acceptedSimilarCount: z.number().int().min(0),
        selectedAlternativeCount: z.number().int().min(0),
        createNewConfirmedCount: z.number().int().min(0),
        ignoredCount: z.number().int().min(0),
        expandedSubtreeDecisionsCount: z.number().int().min(0).optional(),
        uniqueSubtreeRootsMaterialized: z.number().int().min(0).optional(),
      })
      .strict(),
    decisions: z.array(documentReviewAuditDecisionSchema).max(500),
  })
  .strict()

const postConveyorMetadataSchema = z
  .object({
    documentReviewAudit: documentReviewAuditSchema.optional(),
  })
  .strict()

export const postConveyorBodySchema = z.object({
  dados: postConveyorDadosSchema,
  originType: z.enum(['MANUAL', 'BASE', 'HYBRID']),
  baseId: z.string().nullable().optional(),
  baseCode: z.string().nullable().optional(),
  baseName: z.string().nullable().optional(),
  baseVersion: z.number().int().positive().nullable().optional(),
  /** Item raiz da matriz operacional (auditoria / rastreio). */
  matrixRootItemId: z.string().uuid().nullable().optional(),
  metadata: postConveyorMetadataSchema.optional(),
  options: z.array(postConveyorOptionSchema).min(1),
})

export type PostConveyorBody = z.infer<typeof postConveyorBodySchema>

/** PATCH /api/v1/conveyors/:id — pelo menos um campo. */
export const patchConveyorDadosBodySchema = postConveyorDadosSchema
  .partial()
  .superRefine((data, ctx) => {
    const keys = Object.keys(data).filter((k) => data[k as keyof typeof data] !== undefined)
    if (keys.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Envie pelo menos um campo para atualizar.',
      })
    }
  })

export type PatchConveyorDadosBody = z.infer<typeof patchConveyorDadosBodySchema>

/** PATCH /api/v1/conveyors/:id/structure — substitui árvore (regras no serviço). */
export const patchConveyorStructureBodySchema = z.object({
  originType: z.enum(['MANUAL', 'BASE', 'HYBRID']),
  baseId: z.string().nullable().optional(),
  baseCode: z.string().nullable().optional(),
  baseName: z.string().nullable().optional(),
  baseVersion: z.number().int().positive().nullable().optional(),
  matrixRootItemId: z.string().uuid().nullable().optional(),
  options: z.array(postConveyorOptionSchema).min(1),
})

export type PatchConveyorStructureBody = z.infer<
  typeof patchConveyorStructureBodySchema
>

const emptyQueryToUndef = (v: unknown): unknown =>
  v === '' || v === undefined ? undefined : v

export const conveyorOperationalStatusQueryEnum = z.enum([
  'NO_BACKLOG',
  'EM_REVISAO',
  'PRONTA_LIBERAR',
  'EM_PRODUCAO',
  'CONCLUIDA',
])

/** Query string do GET /conveyors — valores vazios ignorados. */
export const getConveyorsQuerySchema = z.object({
  q: z.preprocess(emptyQueryToUndef, z.string().min(1).optional()),
  priority: z.preprocess(
    emptyQueryToUndef,
    z.enum(['alta', 'media', 'baixa']).optional(),
  ),
  responsible: z.preprocess(emptyQueryToUndef, z.string().min(1).optional()),
  operationalStatus: z.preprocess(
    emptyQueryToUndef,
    conveyorOperationalStatusQueryEnum.optional(),
  ),
})

export type GetConveyorsQuery = z.infer<typeof getConveyorsQuerySchema>

export const conveyorIdParamSchema = z.string().uuid()

export const patchConveyorStatusBodySchema = z.object({
  operationalStatus: conveyorOperationalStatusQueryEnum,
})

export type PatchConveyorStatusBody = z.infer<typeof patchConveyorStatusBodySchema>
