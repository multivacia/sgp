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
  extractedFacts: z.array(argosExtractedFactSchema),
  draft: conveyorDraftV1Schema.nullable(),
  warnings: z.array(argosIssueSchema),
  confidence: argosConfidenceSummarySchema.nullable(),
})

export type ArgosDocumentIngestEnvelope = z.infer<
  typeof argosDocumentIngestEnvelopeSchema
>
export type ArgosDocumentIngestResult = z.infer<
  typeof argosDocumentIngestResultSchema
>
