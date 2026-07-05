import type { Modifier } from '@dnd-kit/core'

/**
 * Equivalente ao `snapCenterToCursor` de @dnd-kit/modifiers (pacote NÃO instalado neste repo).
 * Chamado a cada frame de drag pelo DragOverlay; `transform.x/y` chega atualizado pelo dnd-kit.
 * `activatorEvent` + `draggingNodeRect` definem offset fixo do ponto de grab ao centro do card.
 */
export const snapCenterToCursor: Modifier = ({ activatorEvent, draggingNodeRect, transform }) => {
  if (!draggingNodeRect || !activatorEvent || !('clientX' in activatorEvent)) {
    return transform
  }
  const x = activatorEvent.clientX
  const y = activatorEvent.clientY
  return {
    ...transform,
    x: transform.x + x - draggingNodeRect.left - draggingNodeRect.width / 2,
    y: transform.y + y - draggingNodeRect.top - draggingNodeRect.height / 2,
  }
}
