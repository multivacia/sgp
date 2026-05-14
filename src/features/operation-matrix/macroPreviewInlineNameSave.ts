import {
  normalizePreviewStructureNodeName,
  previewStructureNodeNameIsValid,
} from './operationMatrixPreviewEdits'

export type InlineNameSaveAttempt =
  | { ok: true }
  | { ok: false; message: string; nodeId: string }

export type InlineNameSaveHandler = {
  nodeId: string
  tryCommitForSave: () => InlineNameSaveAttempt
  focusInvalidDraft: () => void
}

export type InlineNameSaveRegistry = {
  register: (handler: InlineNameSaveHandler) => () => void
  commitAllForSave: () => InlineNameSaveAttempt
}

export function evaluateInlineNameSaveDraft(
  draft: string,
  committedName: string,
): InlineNameSaveAttempt {
  if (!previewStructureNodeNameIsValid(draft)) {
    return { ok: false, message: 'Informe um nome.', nodeId: '' }
  }
  const normalized = normalizePreviewStructureNodeName(draft)
  if (normalized === normalizePreviewStructureNodeName(committedName)) {
    return { ok: true }
  }
  return { ok: true }
}

export function createInlineNameSaveRegistry(): InlineNameSaveRegistry {
  const handlers = new Map<string, InlineNameSaveHandler>()

  return {
    register(handler) {
      handlers.set(handler.nodeId, handler)
      return () => {
        const current = handlers.get(handler.nodeId)
        if (current === handler) handlers.delete(handler.nodeId)
      }
    },
    commitAllForSave() {
      for (const handler of handlers.values()) {
        const result = handler.tryCommitForSave()
        if (!result.ok) {
          handler.focusInvalidDraft()
          return result
        }
      }
      return { ok: true }
    },
  }
}
