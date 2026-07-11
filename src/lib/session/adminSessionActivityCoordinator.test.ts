/** @vitest-environment jsdom */

import { StrictMode, createElement, type ReactNode } from 'react'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ADMIN_SESSION_ACTIVITY_EVENTS,
  useAdministrativeSessionActivityCoordinator,
} from './adminSessionActivityCoordinator'

type HarnessOptions = {
  enabled?: boolean
  navigationKey?: string
  onLocalActivity?: (occurredAt: number) => void
}

function strictWrapper({ children }: { children: ReactNode }) {
  return createElement(StrictMode, null, children)
}

function useHarness({
  enabled = true,
  navigationKey = '/app/backlog',
  onLocalActivity = () => {},
}: HarnessOptions) {
  useAdministrativeSessionActivityCoordinator({
    enabled,
    navigationKey,
    onLocalActivity,
  })
}

describe('useAdministrativeSessionActivityCoordinator', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-11T19:25:00.000Z'))
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('registra listeners uma única vez e remove no unmount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')

    const { unmount } = renderHook(() => useHarness({}))

    for (const eventName of ADMIN_SESSION_ACTIVITY_EVENTS) {
      expect(
        addSpy.mock.calls.filter(([name]) => name === eventName),
      ).toHaveLength(1)
    }

    unmount()

    for (const eventName of ADMIN_SESSION_ACTIVITY_EVENTS) {
      expect(
        removeSpy.mock.calls.filter(([name]) => name === eventName),
      ).toHaveLength(1)
    }
  })

  it('StrictMode não deixa listeners duplicados permanentes', () => {
    const counts = new Map<string, number>()
    const originalAdd = window.addEventListener.bind(window)
    const originalRemove = window.removeEventListener.bind(window)

    vi.spyOn(window, 'addEventListener').mockImplementation((type, listener, options) => {
      counts.set(type, (counts.get(type) ?? 0) + 1)
      originalAdd(type, listener, options)
    })
    vi.spyOn(window, 'removeEventListener').mockImplementation((type, listener, options) => {
      counts.set(type, (counts.get(type) ?? 0) - 1)
      originalRemove(type, listener, options)
    })

    const { unmount } = renderHook(() => useHarness({}), {
      wrapper: strictWrapper,
    })

    for (const eventName of ADMIN_SESSION_ACTIVITY_EVENTS) {
      expect(counts.get(eventName)).toBe(1)
    }

    unmount()

    for (const eventName of ADMIN_SESSION_ACTIVITY_EVENTS) {
      expect(counts.get(eventName)).toBe(0)
    }
  })

  it.each(ADMIN_SESSION_ACTIVITY_EVENTS)(
    'marca atividade local ao receber %s',
    (eventName) => {
      const onLocalActivity = vi.fn()

      renderHook(() => useHarness({ onLocalActivity }))

      act(() => {
        window.dispatchEvent(new Event(eventName))
      })

      expect(onLocalActivity).toHaveBeenCalledTimes(1)
      expect(onLocalActivity).toHaveBeenLastCalledWith(Date.now())
    },
  )

  it('navegação entre rotas React marca atividade local', () => {
    const onLocalActivity = vi.fn()

    const { rerender } = renderHook(
      ({ navigationKey }: { navigationKey: string }) =>
        useHarness({ navigationKey, onLocalActivity }),
      {
        initialProps: { navigationKey: '/app/backlog' },
      },
    )

    act(() => {
      vi.setSystemTime(new Date('2026-07-11T19:26:00.000Z'))
      rerender({ navigationKey: '/app/agenda-semanal' })
    })

    expect(onLocalActivity).toHaveBeenCalledTimes(1)
    expect(onLocalActivity).toHaveBeenCalledWith(Date.now())
  })

  it('não marca atividade quando está desabilitado', () => {
    const onLocalActivity = vi.fn()

    renderHook(() => useHarness({ enabled: false, onLocalActivity }))

    act(() => {
      window.dispatchEvent(new Event('pointerdown'))
    })

    expect(onLocalActivity).not.toHaveBeenCalled()
  })
})
