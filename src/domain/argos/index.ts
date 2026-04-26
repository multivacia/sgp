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
  type ConveyorDraftSchemaVersionV1,
  type ConveyorDraftV1,
  type ConveyorDraftV1Area,
  type ConveyorDraftV1Option,
  type ConveyorDraftV1Step,
  type ConveyorDraftV1SuggestedDados,
} from './draft-v1.types'

export type {
  ArgosIssue,
  ArgosIssueCategory,
  ArgosIssueCode,
} from './warnings-taxonomy.types'
