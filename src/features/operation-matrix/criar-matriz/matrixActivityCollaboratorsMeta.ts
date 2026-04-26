/**
 * Metadados versionados em `metadata_json` de nós ACTIVITY da matriz.
 * Apoios = colaboradores que não são o principal (`default_responsible_id`).
 */
export const MATRIX_ACTIVITY_COLLABORATORS_V1_KEY =
  'sgp.matrixActivityCollaborators.v1' as const

export type MatrixActivityCollaboratorsV1 = {
  supportIds: string[]
}

export function parseMatrixActivitySupportIds(metadataJson: unknown): string[] {
  if (!metadataJson || typeof metadataJson !== 'object') return []
  const raw = (metadataJson as Record<string, unknown>)[
    MATRIX_ACTIVITY_COLLABORATORS_V1_KEY
  ]
  if (!raw || typeof raw !== 'object') return []
  const supportIds = (raw as { supportIds?: unknown }).supportIds
  if (!Array.isArray(supportIds)) return []
  return supportIds.filter((x): x is string => typeof x === 'string')
}

export function buildMatrixActivityMetadataJson(
  supportIds: string[],
): unknown | undefined {
  const unique = [...new Set(supportIds.map((id) => id.trim()).filter(Boolean))]
  if (unique.length === 0) return undefined
  return {
    [MATRIX_ACTIVITY_COLLABORATORS_V1_KEY]: {
      supportIds: unique,
    } satisfies MatrixActivityCollaboratorsV1,
  }
}
