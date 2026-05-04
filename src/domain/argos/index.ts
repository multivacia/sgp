/**
 * Contrato ARGOS ↔ SGP+ — «Nova Esteira por Documento» (Release 3).
 * Isolado de rotas, UI e do POST /api/v1/conveyors existente.
 */

export {
  ARGOS_INTENT_CONVEYOR_DRAFT_FROM_DOCUMENT,
  type ArgosIntentId,
} from './intent'

export type {
  ArgosCaller,
  ArgosIngestMetadata,
  ArgosIngestPolicy,
  ArgosDocumentIngestEnvelope,
} from './ingest-request.types'

export type {
  ArgosDocumentDescriptor,
  ArgosExtractedFact,
  ArgosConfidenceSummary,
  ArgosDocumentIngestResult,
  ArgosIngestStatus,
  ArgosSpecialistRef,
  ArgosStrategyRef,
} from './ingest-response.types'

export {
  CONVEYOR_DRAFT_SCHEMA_VERSION_V1,
  CONVEYOR_DRAFT_SCHEMA_VERSION_V11,
  type ConveyorDraftSchemaVersionV1,
  type ConveyorDraftSchemaVersionV11,
  type ConveyorDraft,
  type ConveyorDraftV1,
  type ConveyorDraftV11,
  type ConveyorDraftV1Area,
  type ConveyorDraftV1Option,
  type ConveyorDraftV1Step,
  type ConveyorDraftV1SuggestedDados,
  type ArgosSuggestedMatchAction,
  type ArgosRedactionCategoryV11,
  type ArgosSourceDocumentV11,
  type ArgosOperationalContextV11,
  type ArgosServiceItemV11,
  type ArgosPartItemV11,
  type ArgosExtractedItemsV11,
  type ArgosRedactionV11,
  type ArgosAlternativeMatrixCandidateV11,
  type ArgosMatchingPlanItemV11,
  type ArgosMatrixSubtreeActivityV11,
  type ArgosMatrixSubtreeAreaV11,
  type ArgosMatrixSubtreeV11,
} from './draft-v1.types'

export type {
  ArgosIssue,
  ArgosIssueCategory,
  ArgosIssueCode,
} from './warnings-taxonomy.types'
