import type { Modifier } from '@dnd-kit/core'
import { describe, expect, it } from 'vitest'
import { snapCenterToCursor } from './weeklyAgendaDragModifiers'

type ModifierArgs = Parameters<Modifier>[0]

function createModifierArgs(
  partial: Pick<ModifierArgs, 'activatorEvent' | 'draggingNodeRect' | 'transform'>,
): ModifierArgs {
  return {
    activatorEvent: partial.activatorEvent,
    draggingNodeRect: partial.draggingNodeRect,
    transform: partial.transform,
    active: null,
    activeNodeRect: null,
    containerNodeRect: null,
    over: null,
    overlayNodeRect: null,
    scrollableAncestors: [],
    scrollableAncestorRects: [],
    windowRect: null,
  }
}

describe('snapCenterToCursor', () => {
  const rect = {
    top: 100,
    left: 200,
    width: 100,
    height: 50,
    bottom: 150,
    right: 300,
    x: 200,
    y: 100,
    toJSON: () => ({}),
  } as DOMRect

  const activator = { clientX: 250, clientY: 125 } as PointerEvent

  it('combina offset fixo do grab com transform.x/y vivo a cada chamada', () => {
    const base = snapCenterToCursor(
      createModifierArgs({
        activatorEvent: activator,
        draggingNodeRect: rect,
        transform: { x: 0, y: 0, scaleX: 1, scaleY: 1 },
      }),
    )
    const moved = snapCenterToCursor(
      createModifierArgs({
        activatorEvent: activator,
        draggingNodeRect: rect,
        transform: { x: 80, y: 120, scaleX: 1, scaleY: 1 },
      }),
    )
    expect(moved.x).toBe(base.x + 80)
    expect(moved.y).toBe(base.y + 120)
  })
})
