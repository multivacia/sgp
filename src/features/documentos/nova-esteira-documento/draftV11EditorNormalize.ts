import type { ConveyorDraft } from '../../../domain/argos/draft-v1.types'
import type { ArgosDocumentIngestResult } from '../../../domain/argos/ingest-response.types'
import {
  containsForbiddenOperationalContent,
  conveyorDraftContainsForbiddenContent,
} from '../../../domain/argos/operationalContentGuard'

export const editableDraftContainsForbiddenOperationalContent =
  conveyorDraftContainsForbiddenContent

/** Texto legado de rascunhos antigos (gateway / R3) que não deve permanecer nas observações 1.1.0. */
const LEGACY_NOTES_SNIPPET =
  /Draft consolidado com base na interpretação intermediária disponível[\s\S]*?Release 3\)?\.?/i

export function stripLegacyDraftNotesText(notes: string | undefined): string | undefined {
  if (!notes) return undefined
  const cleaned = notes.replace(LEGACY_NOTES_SNIPPET, '').trim()
  return cleaned || undefined
}

/**
 * Estrutura editável alinhada a `extractedItems.serviceItems` (R6) — ignora lixo eventual em `draft.options`.
 */
export function buildEditableDraftOptionsFromV11ServiceItems(
  ingest: ArgosDocumentIngestResult,
): ConveyorDraft['options'] {
  const items = ingest.extractedItems?.serviceItems ?? []
  const safeItems = items.filter((item) => !containsForbiddenOperationalContent(item.description))
  if (safeItems.length === 0) return []
  const steps = safeItems.map((item, idx) => ({
    orderIndex: idx + 1,
    title: item.description.slice(0, 500),
    plannedMinutes: undefined as number | undefined,
    confidence: item.confidence,
  }))
  return [
    {
      orderIndex: 1,
      title: 'Itens inferidos do documento',
      areas: [
        {
          orderIndex: 1,
          title: 'Serviço',
          steps,
        },
      ],
    },
  ]
}

/**
 * Para `schemaVersion` 1.1.0, o formulário de edição deve refletir apenas dados operacionais estruturados,
 * não metadados de PDF nem respostas remotas legadas.
 */
export function normalizeV11DraftForEditing(
  ingest: ArgosDocumentIngestResult,
  draft: ConveyorDraft,
): ConveyorDraft {
  if (draft.schemaVersion !== '1.1.0') return draft
  const next = JSON.parse(JSON.stringify(draft)) as ConveyorDraft
  next.options = buildEditableDraftOptionsFromV11ServiceItems(ingest)

  const isBravo = ingest.sourceDocument?.provider === 'BRAVO'
  const opJoined = isBravo
    ? undefined
    : ingest.extractedItems?.operationalNotes
        ?.filter((s) => typeof s === 'string' && s.trim().length > 0)
        .filter((s) => !containsForbiddenOperationalContent(s))
        .join('\n')
        .trim()
        .slice(0, 8000)
  const stripped = stripLegacyDraftNotesText(next.suggestedDados?.notes)
  const notesRaw = isBravo
    ? undefined
    : opJoined && opJoined.length > 0
      ? opJoined
      : stripped ?? next.suggestedDados?.notes
  const notes = isBravo
    ? undefined
    : notesRaw
        ?.split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0 && !containsForbiddenOperationalContent(l))
        .join('\n')
        .trim()
        .slice(0, 8000) ?? undefined

  const fileStem = ingest.document?.fileName?.replace(/\.[^.]+$/, '')
  const titleIn = next.suggestedDados?.title
  const bravoPlainOsTitle =
    isBravo &&
    titleIn?.trim() &&
    /^\d{3,8}$/.test(titleIn.trim())
  const titleSafe =
    titleIn && (bravoPlainOsTitle || !containsForbiddenOperationalContent(titleIn))
      ? titleIn
      : fileStem ?? titleIn ?? 'Esteira'

  next.suggestedDados = {
    ...next.suggestedDados,
    notes,
    title: titleSafe,
  }
  return next
}
