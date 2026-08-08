import { z } from 'zod'

/** Alinhado a `src/domain/argos/intent.ts` — manter sincronizado. */
export const ARGOS_INTENT_CONVEYOR_DRAFT_FROM_DOCUMENT =
  'conveyor_draft_from_document' as const

const priorityHintSchema = z.enum(['alta', 'media', 'baixa'])

export const conveyorDraftV1StepSchema = z.object({
  orderIndex: z.number().int(),
  title: z.string().min(1),
  plannedMinutes: z.number().nonnegative().optional(),
  confidence: z.number().min(0).max(1).optional(),
})

export const conveyorDraftV1AreaSchema = z.object({
  orderIndex: z.number().int(),
  title: z.string().min(1),
  steps: z.array(conveyorDraftV1StepSchema),
})

export const conveyorDraftV1OptionSchema = z.object({
  orderIndex: z.number().int(),
  title: z.string().min(1),
  areas: z.array(conveyorDraftV1AreaSchema),
})

/** Versão fixa do draft v1 — alinhada a `src/domain/argos/draft-v1.types.ts`. */
export const CONVEYOR_DRAFT_SCHEMA_VERSION_V1 = '1.0.0' as const
export const CONVEYOR_DRAFT_SCHEMA_VERSION_V11 = '1.1.0' as const

export const conveyorDraftV1Schema = z.object({
  schemaVersion: z.literal(CONVEYOR_DRAFT_SCHEMA_VERSION_V1),
  suggestedDados: z
    .object({
      title: z.string().optional(),
      clientName: z.string().optional(),
      vehicleDescription: z.string().optional(),
      modelVersion: z.string().optional(),
      licensePlate: z.string().optional(),
      notes: z.string().optional(),
      suggestedResponsibleCollaboratorId: z.string().optional(),
      estimatedDeadline: z.string().optional(),
      priorityHint: priorityHintSchema.optional(),
    })
    .passthrough(),
  options: z.array(conveyorDraftV1OptionSchema),
  extensions: z.record(z.unknown()).optional(),
})

export const argosSuggestedMatchActionSchema = z.enum([
  'REUSE_EXISTING',
  'REVIEW_SIMILAR',
  'CREATE_NEW',
  'IGNORE',
])

export const argosRedactionCategorySchema = z.enum([
  'cpf_cnpj',
  'rg_ie',
  'address',
  'phone',
  'email',
  'customer_name',
  'pricing',
  'payment_terms',
  'discount',
  'totals',
])

export const sourceDocumentSchema = z
  .object({
    provider: z.string().min(1),
    documentType: z.string().min(1),
    documentNumber: z.string().optional(),
    issuedAt: z.string().optional(),
    receivedAt: z.string().optional(),
    entryDate: z.string().optional(),
  })
  .passthrough()

export const operationalContextSchema = z
  .object({
    vehicle: z
      .object({
        model: z.string().optional(),
        year: z.number().int().optional(),
        color: z.string().optional(),
      })
      .optional(),
    maskedIdentifiers: z.record(z.unknown()).optional(),
  })
  .passthrough()

export const serviceItemSchema = z
  .object({
    id: z.string().optional(),
    description: z.string().min(1),
    confidence: z.number().min(0).max(1).optional(),
  })
  .passthrough()

export const partItemSchema = z
  .object({
    id: z.string().optional(),
    description: z.string().min(1),
    quantity: z.number().optional(),
    confidence: z.number().min(0).max(1).optional(),
  })
  .passthrough()

export const extractedItemsSchema = z.object({
  serviceItems: z.array(serviceItemSchema),
  partItems: z.array(partItemSchema),
  operationalNotes: z.array(z.string()),
})

export const redactionSchema = z.object({
  personalDataRemoved: z.boolean(),
  financialDataRemoved: z.boolean(),
  removedCategories: z.array(argosRedactionCategorySchema),
})

const matrixSubtreeTeamAssignmentSchema = z.object({
  teamId: z.string().uuid(),
  teamName: z.string().max(200).optional(),
})

const matrixSubtreeActivitySchema = z.object({
  matrixNodeId: z.string(),
  title: z.string(),
  orderIndex: z.number().int(),
  plannedMinutes: z.number().nonnegative(),
  defaultResponsibleId: z.string().optional(),
  defaultResponsibleName: z.string().optional(),
  teamId: z.string().optional(),
  teamName: z.string().optional(),
  teamAssignments: z.array(matrixSubtreeTeamAssignmentSchema).max(20).optional(),
})

const matrixSubtreeAreaSchema = z.object({
  matrixNodeId: z.string(),
  title: z.string(),
  orderIndex: z.number().int(),
  plannedMinutes: z.number().nonnegative().optional(),
  activities: z.array(matrixSubtreeActivitySchema).max(120),
})

const matrixSubtreeSchema = z.object({
  rootNodeId: z.string(),
  rootNodeType: z.enum(['TASK', 'SECTOR']),
  rootTitle: z.string(),
  totalAreas: z.number().int().nonnegative(),
  totalActivities: z.number().int().nonnegative(),
  totalPlannedMinutes: z.number().nonnegative(),
  subtreeTruncated: z.boolean().optional(),
  subtreeWarning: z.string().max(500).optional(),
  areas: z.array(matrixSubtreeAreaSchema).max(40),
})

const alternativeMatrixCandidateSchema = z.object({
  matrixNodeId: z.string(),
  nodeType: z.enum(['TASK', 'SECTOR', 'ACTIVITY']).optional(),
  kind: z.enum(['MATRIX_SUBTREE', 'MATRIX_ACTIVITY']).optional(),
  activity: z.string(),
  sector: z.string().optional(),
  step: z.string().optional(),
  plannedMinutes: z.number().nonnegative().optional(),
  confidence: z.number().min(0).max(1),
  matchReason: z.string(),
  matrixSubtree: matrixSubtreeSchema.optional(),
  teamId: z.string().optional(),
  teamName: z.string().optional(),
  collaboratorId: z.string().optional(),
  collaboratorName: z.string().optional(),
})

export const matchingPlanItemSchema = z
  .object({
    extractedServiceDescription: z.string().min(1),
    suggestedAction: argosSuggestedMatchActionSchema,
    confidence: z.number().min(0).max(1).optional(),
    matchReason: z.string().optional(),
    matchedMatrixNodeId: z.string().optional(),
    matchedMatrixNodeType: z.enum(['TASK', 'SECTOR', 'ACTIVITY']).optional(),
    matchedConveyorNodeId: z.string().optional(),
    alternativeCandidates: z.array(alternativeMatrixCandidateSchema).max(3).optional(),
    reusedStructure: z
      .object({
        option: z.string().optional(),
        area: z.string().optional(),
        step: z.string().optional(),
        sector: z.string().optional(),
        activity: z.string().optional(),
        plannedMinutes: z.number().nonnegative().optional(),
        teamId: z.string().optional(),
        teamName: z.string().optional(),
        collaboratorId: z.string().optional(),
        collaboratorName: z.string().optional(),
        isPrimary: z.boolean().optional(),
        kind: z.enum(['MATRIX_SUBTREE', 'MATRIX_ACTIVITY']).optional(),
      })
      .optional(),
    subtreeSummary: z
      .object({
        rootNodeType: z.enum(['TASK', 'SECTOR', 'ACTIVITY']),
        totalAreas: z.number().int().nonnegative(),
        totalActivities: z.number().int().nonnegative(),
        totalPlannedMinutes: z.number().nonnegative(),
        previewActivities: z.array(z.string()).max(5).optional(),
      })
      .optional(),
    matrixSubtree: matrixSubtreeSchema.optional(),
  })
  .passthrough()

export const conveyorDraftV11Schema = z.object({
  schemaVersion: z.literal(CONVEYOR_DRAFT_SCHEMA_VERSION_V11),
  suggestedDados: z
    .object({
      title: z.string().optional(),
      clientName: z.string().optional(),
      vehicleDescription: z.string().optional(),
      modelVersion: z.string().optional(),
      licensePlate: z.string().optional(),
      notes: z.string().optional(),
      suggestedResponsibleCollaboratorId: z.string().optional(),
      estimatedDeadline: z.string().optional(),
      priorityHint: priorityHintSchema.optional(),
    })
    .passthrough(),
  options: z.array(conveyorDraftV1OptionSchema),
  warnings: z
    .array(
      z
        .object({
          category: z.string().min(1),
          code: z.string().min(1),
          message: z.string().optional(),
          fieldPath: z.string().optional(),
          confidence: z.number().optional(),
        })
        .passthrough(),
    )
    .default([]),
  humanReviewRequired: z.literal(true),
  extensions: z.record(z.unknown()).optional(),
})

export const argosDocumentIngestEnvelopeSchema = z.object({
  caller: z.object({
    systemId: z.string().min(1),
  }),
  policy: z
    .object({
      maxFileBytes: z.number().optional(),
      allowedMimeTypes: z.array(z.string()).optional(),
    })
    .passthrough(),
  intent: z.literal(ARGOS_INTENT_CONVEYOR_DRAFT_FROM_DOCUMENT),
  metadata: z
    .object({
      correlationId: z.string().optional(),
      locale: z.string().optional(),
    })
    .passthrough()
    .optional(),
})

export const argosIssueSchema = z
  .object({
    category: z.enum([
      'fatal_error',
      'revisable_warning',
      'missing_field',
      'low_confidence_field',
    ]),
    code: z.string().min(1),
    message: z.string().optional(),
    fieldPath: z.string().optional(),
    confidence: z.number().optional(),
  })
  .passthrough()

export const argosDocumentDescriptorSchema = z
  .object({
    fileName: z.string().optional(),
    mimeType: z.string().optional(),
    pageCount: z.number().optional(),
    contentSha256: z.string().optional(),
  })
  .passthrough()

export const argosExtractedFactSchema = z
  .object({
    key: z.string().min(1),
    value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
    confidence: z.number().optional(),
    sourcePage: z.number().optional(),
    sourceSnippet: z.string().optional(),
  })
  .passthrough()

export const argosConfidenceSummarySchema = z
  .object({
    overall: z.number(),
    byField: z.record(z.number()).optional(),
  })
  .passthrough()

export const argosDocumentIngestResultSchema = z.object({
  requestId: z.string().min(1),
  correlationId: z.string().min(1),
  status: z.enum(['completed', 'partial', 'failed']),
  specialist: z.string().min(1),
  strategy: z.string().min(1),
  document: argosDocumentDescriptorSchema,
  sourceDocument: sourceDocumentSchema.optional(),
  operationalContext: operationalContextSchema.optional(),
  extractedFacts: z.array(argosExtractedFactSchema),
  extractedItems: extractedItemsSchema.optional(),
  redaction: redactionSchema.optional(),
  matchingPlan: z.array(matchingPlanItemSchema).optional(),
  draft: z.union([conveyorDraftV1Schema, conveyorDraftV11Schema]).nullable(),
  warnings: z.array(argosIssueSchema),
  confidence: argosConfidenceSummarySchema.nullable(),
})

export type ArgosDocumentIngestEnvelope = z.infer<
  typeof argosDocumentIngestEnvelopeSchema
>
export type ArgosDocumentIngestResult = z.infer<
  typeof argosDocumentIngestResultSchema
>
