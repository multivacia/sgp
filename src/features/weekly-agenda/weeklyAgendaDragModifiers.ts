import type { Modifier } from '@dnd-kit/core'

type ClientPointEvent = Event & { clientX: number; clientY: number }

function hasClientPoint(event: Event | null): event is ClientPointEvent {
  return (
    !!event &&
    'clientX' in event &&
    'clientY' in event &&
    typeof event.clientX === 'number' &&
    typeof event.clientY === 'number'
  )
}

/**
 * Equivalente ao `snapCenterToCursor` de @dnd-kit/modifiers (pacote NÃO instalado neste repo).
 * Chamado a cada frame de drag pelo DragOverlay; `transform.x/y` chega atualizado pelo dnd-kit.
 * `activatorEvent` + `draggingNodeRect` definem offset fixo do ponto de grab ao centro do card.
 */
export const snapCenterToCursor: Modifier = ({ activatorEvent, draggingNodeRect, transform }) => {
  if (!draggingNodeRect || !hasClientPoint(activatorEvent)) {
    return transform
  }
  const { clientX, clientY } = activatorEvent
  return {
    ...transform,
    x: transform.x + clientX - draggingNodeRect.left - draggingNodeRect.width / 2,
    y: transform.y + clientY - draggingNodeRect.top - draggingNodeRect.height / 2,
  }
}
