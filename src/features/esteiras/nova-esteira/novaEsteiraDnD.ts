import type { DragEvent } from 'react'

export const NOVA_ESTEIRA_DRAG_MIME = 'application/x-sgp-nova-esteira'

export type NovaEsteiraCatalogDrag =
  | { t: 'matrix'; matrixId: string }
  | { t: 'task'; matrixItemId: string; taskId: string }

export type NovaEsteiraDraftDrag = { t: 'draft-option'; optionKey: string }

export type NovaEsteiraDragPayload =
  | NovaEsteiraCatalogDrag
  | NovaEsteiraDraftDrag

export function parseDragPayload(raw: string): NovaEsteiraDragPayload | null {
  try {
    const v = JSON.parse(raw) as NovaEsteiraDragPayload
    if (v.t === 'matrix' && typeof v.matrixId === 'string') return v
    if (
      v.t === 'task' &&
      typeof v.matrixItemId === 'string' &&
      typeof v.taskId === 'string'
    )
      return v
    if (v.t === 'draft-option' && typeof v.optionKey === 'string') return v
  } catch {
    /* ignore */
  }
  return null
}

export function setDragPayload(e: DragEvent, payload: NovaEsteiraDragPayload) {
  e.dataTransfer.setData(NOVA_ESTEIRA_DRAG_MIME, JSON.stringify(payload))
  e.dataTransfer.effectAllowed = 'copyMove'
}
