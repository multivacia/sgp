/** @vitest-environment jsdom */

import {
  StrictMode,
  createElement,
  useCallback,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SessionIdlePolicy } from '../../domain/auth/sessionIdle.types'
import type { AuthUser } from '../auth-store'
import {
  ADMIN_SESSION_ACTIVITY_EVENTS,
  ADMIN_SESSION_SYNC_CHANNEL_NAME,
  ADMIN_SESSION_SYNC_STORAGE_KEY,
  buildOptimisticSessionIdle,
  shouldReplaceSessionIdle,
  useAdministrativeSessionActivityCoordinator,
} from './adminSessionActivityCoordinator'

type HarnessOptions = {
  enabled?: boolean
  navigationKey?: string
  initialSessionIdle?: SessionIdlePolicy | null
  refreshSession?: () => Promise<{ user: AuthUser; sessionIdle: SessionIdlePolicy } | null>
}

type SessionEnd = {
  reason: 'logout' | 'expired' | 'revoked'
  message?: string
}

const DEFAULT_SESSION_MS = Date.parse('2026-07-11T19:05:00.000Z')

class FakeBroadcastChannel {
  static registry = new Map<string, Set<FakeBroadcastChannel>>()
  static messages: Array<{ name: string; data: unknown }> = []

  readonly name: string
  onmessage: ((event: MessageEvent<unknown>) => void) | null = null

  constructor(name: string) {
    this.name = name
    const peers = FakeBroadcastChannel.registry.get(name) ?? new Set()
    peers.add(this)
    FakeBroadcastChannel.registry.set(name, peers)
  }

  postMessage(message: unknown) {
    FakeBroadcastChannel.messages.push({ name: this.name, data: message })
    const peers = FakeBroadcastChannel.registry.get(this.name)
    if (!peers) return
    for (const peer of peers) {
      if (peer === this) continue
      peer.onmessage?.({ data: message } as MessageEvent<unknown>)
    }
  }

  close() {
    FakeBroadcastChannel.registry.get(this.name)?.delete(this)
  }

  static reset() {
    FakeBroadcastChannel.registry.clear()
    FakeBroadcastChannel.messages = []
  }
}

function createUser(): AuthUser {
  return {
    userId: 'u-1',
    email: 'admin@sgp.test',
    role: 'ADMIN',
    roleId: 'role-1',
    collaboratorId: null,
    isActive: true,
    avatarUrl: null,
    mustChangePassword: false,
    passwordChangedAt: null,
    permissions: ['dashboard:view'],
  }
}

function createSessionIdle(
  lastActivityMs: number,
  timeoutMinutes = 10,
  warningMinutes = 5,
): SessionIdlePolicy {
  return {
    idleTimeoutMinutes: timeoutMinutes,
    idleWarningMinutes: warningMinutes,
    lastActivityAt: new Date(lastActivityMs).toISOString(),
    idleExpiresAt: new Date(
      lastActivityMs + timeoutMinutes * 60_000,
    ).toISOString(),
  }
}

function useCoordinatorHarness({
  enabled = true,
  navigationKey = '/app/backlog',
  initialSessionIdle = createSessionIdle(DEFAULT_SESSION_MS),
  refreshSession = async () => null,
}: HarnessOptions) {
  const [sessionIdle, setSessionIdle] = useState<SessionIdlePolicy | null>(
    initialSessionIdle,
  )
  const [sessionEnded, setSessionEnded] = useState<SessionEnd | null>(null)
  const [sources, setSources] = useState<string[]>([])
  const sessionIdleRef = useRef<SessionIdlePolicy | null>(initialSessionIdle)

  const applySessionIdle = useCallback(
    (nextSessionIdle: SessionIdlePolicy, source: string) => {
      if (!shouldReplaceSessionIdle(sessionIdleRef.current, nextSessionIdle)) {
        return false
      }
      sessionIdleRef.current = nextSessionIdle
      setSessionIdle(nextSessionIdle)
      setSources((currentSources) => [...currentSources, source])
      return true
    },
    [],
  )

  const coordinator = useAdministrativeSessionActivityCoordinator({
    enabled,
    navigationKey,
    sessionIdle,
    refreshSession,
    onSessionIdle(nextSessionIdle, source) {
      return applySessionIdle(nextSessionIdle, source)
    },
    onKeepaliveSession(session) {
      return applySessionIdle(session.sessionIdle, 'official')
    },
    onSessionEnded(reason, message) {
      sessionIdleRef.current = null
      setSessionIdle(null)
      setSessionEnded({ reason, message })
    },
  })

  return { sessionIdle, sessionEnded, sources, coordinator }
}

function strictWrapper({ children }: { children: ReactNode }) {
  return createElement(StrictMode, null, children)
}

async function flushAsyncWork() {
  await act(async () => {
    await Promise.resolve()
  })
}

describe('useAdministrativeSessionActivityCoordinator', () => {
  const originalBroadcastChannel = globalThis.BroadcastChannel

  beforeEach(() => {
    FakeBroadcastChannel.reset()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-11T19:05:00.000Z'))
    globalThis.BroadcastChannel =
      FakeBroadcastChannel as unknown as typeof BroadcastChannel
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.useRealTimers()
    globalThis.BroadcastChannel = originalBroadcastChannel
    window.localStorage.clear()
    FakeBroadcastChannel.reset()
  })

  it('registra listeners uma única vez e remove no unmount', () => {
    const addSpy = vi.spyOn(window, 'addEventListener')
    const removeSpy = vi.spyOn(window, 'removeEventListener')

    const { unmount } = renderHook(() => useCoordinatorHarness({}))

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

    const { unmount } = renderHook(() => useCoordinatorHarness({}), {
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
    'atividade %s recalcula o prazo visual',
    async (eventName) => {
      const startedAt = Date.now()
      const initialSessionIdle = createSessionIdle(startedAt - 120_000)

      const { result } = renderHook(() =>
        useCoordinatorHarness({ initialSessionIdle }),
      )

      act(() => {
        vi.setSystemTime(new Date(startedAt + 30_000))
        window.dispatchEvent(new Event(eventName))
      })

      expect(result.current.sessionIdle).not.toBeNull()
      expect(Date.parse(result.current.sessionIdle!.lastActivityAt)).toBe(
        startedAt + 30_000,
      )
    },
  )

  it('atividade fecha a janela visual por consequência do novo prazo', async () => {
    const baseMs = Date.now()
    const nearWarning = createSessionIdle(baseMs - 9 * 60_000, 10, 5)

    const { result } = renderHook(() =>
      useCoordinatorHarness({ initialSessionIdle: nearWarning }),
    )

    act(() => {
      vi.setSystemTime(new Date(baseMs))
      window.dispatchEvent(new Event('pointerdown'))
    })

    const nextSessionIdle = result.current.sessionIdle
    expect(nextSessionIdle).not.toBeNull()
    const remainingMs = Date.parse(nextSessionIdle!.idleExpiresAt) - Date.now()
    expect(remainingMs).toBeGreaterThan(5 * 60_000)
  })

  it('rajadas geram no máximo uma renovação por janela técnica', async () => {
    const refreshSession = vi.fn(async () => ({
      user: createUser(),
      sessionIdle: createSessionIdle(Date.now()),
    }))

    renderHook(() =>
      useCoordinatorHarness({
        refreshSession,
      }),
    )

    act(() => {
      window.dispatchEvent(new Event('pointerdown'))
      window.dispatchEvent(new Event('keydown'))
      window.dispatchEvent(new Event('scroll'))
      window.dispatchEvent(new Event('touchstart'))
    })

    await flushAsyncWork()

    expect(refreshSession).toHaveBeenCalledTimes(1)
  })

  it('não permite duas renovações simultâneas', async () => {
    let resolveRefresh: ((value: { user: AuthUser; sessionIdle: SessionIdlePolicy }) => void) | null =
      null
    const refreshSession = vi.fn(
      () =>
        new Promise<{ user: AuthUser; sessionIdle: SessionIdlePolicy }>((resolve) => {
          resolveRefresh = resolve
        }),
    )

    renderHook(() =>
      useCoordinatorHarness({
        refreshSession,
      }),
    )

    act(() => {
      window.dispatchEvent(new Event('pointerdown'))
    })

    act(() => {
      vi.setSystemTime(new Date(Date.now() + 90_000))
      window.dispatchEvent(new Event('keydown'))
    })

    expect(refreshSession).toHaveBeenCalledTimes(1)

    act(() => {
      resolveRefresh?.({
        user: createUser(),
        sessionIdle: createSessionIdle(Date.now()),
      })
    })

    await flushAsyncWork()

    expect(refreshSession).toHaveBeenCalledTimes(1)
  })

  it('resposta oficial atualiza sessionIdle', async () => {
    const baseMs = Date.now()
    const officialSessionIdle = createSessionIdle(baseMs + 15_000)
    const refreshSession = vi.fn(async () => ({
      user: createUser(),
      sessionIdle: officialSessionIdle,
    }))

    const { result } = renderHook(() =>
      useCoordinatorHarness({
        initialSessionIdle: createSessionIdle(baseMs - 60_000),
        refreshSession,
      }),
    )

    act(() => {
      window.dispatchEvent(new Event('pointerdown'))
    })

    await flushAsyncWork()

    expect(result.current.sessionIdle).toEqual(officialSessionIdle)
    expect(result.current.sources).toContain('official')
  })

  it('resposta antiga não sobrescreve estado mais novo', async () => {
    const baseMs = Date.now()
    let resolveRefresh: ((value: { user: AuthUser; sessionIdle: SessionIdlePolicy }) => void) | null =
      null
    const staleOfficial = createSessionIdle(baseMs + 10_000)
    const refreshSession = vi.fn(
      () =>
        new Promise<{ user: AuthUser; sessionIdle: SessionIdlePolicy }>((resolve) => {
          resolveRefresh = resolve
        }),
    )

    const { result } = renderHook(() =>
      useCoordinatorHarness({
        initialSessionIdle: createSessionIdle(baseMs),
        refreshSession,
      }),
    )

    act(() => {
      window.dispatchEvent(new Event('pointerdown'))
    })

    act(() => {
      vi.setSystemTime(new Date(baseMs + 20_000))
      window.dispatchEvent(new Event('keydown'))
    })

    act(() => {
      resolveRefresh?.({
        user: createUser(),
        sessionIdle: staleOfficial,
      })
    })

    await flushAsyncWork()

    expect(Date.parse(result.current.sessionIdle!.lastActivityAt)).toBe(
      baseMs + 20_000,
    )
  })

  it('navegação entre rotas conta como atividade', async () => {
    const baseMs = Date.now()
    const { result, rerender } = renderHook(
      ({ navigationKey }: { navigationKey: string }) =>
        useCoordinatorHarness({
          navigationKey,
          initialSessionIdle: createSessionIdle(baseMs),
        }),
      {
        initialProps: { navigationKey: '/app/backlog' },
      },
    )

    act(() => {
      vi.setSystemTime(new Date(baseMs + 25_000))
      rerender({ navigationKey: '/app/usuarios' })
    })

    expect(Date.parse(result.current.sessionIdle!.lastActivityAt)).toBe(
      baseMs + 25_000,
    )
  })

  it('atividade em outra aba atualiza o aviso local', async () => {
    const baseMs = Date.now()
    const receiver = renderHook(() =>
      useCoordinatorHarness({
        initialSessionIdle: createSessionIdle(baseMs - 9 * 60_000, 10, 5),
      }),
    )
    const sender = new FakeBroadcastChannel(ADMIN_SESSION_SYNC_CHANNEL_NAME)

    act(() => {
      sender.postMessage({
        type: 'activity',
        eventId: 'bc-activity-1',
        sourceTabId: 'remote-tab',
        occurredAt: baseMs + 10_000,
        sessionIdle: buildOptimisticSessionIdle(
          createSessionIdle(baseMs - 9 * 60_000, 10, 5),
          baseMs + 10_000,
        ),
      })
    })

    expect(Date.parse(receiver.result.current.sessionIdle!.lastActivityAt)).toBe(
      baseMs + 10_000,
    )
    expect(receiver.result.current.sources).toContain('remote-activity')
  })

  it.each([
    ['logout', undefined],
    ['expired', 'Sua sessão expirou. Faça login novamente.'],
    [
      'revoked',
      'Sua sessão foi encerrada porque suas credenciais foram alteradas. Faça login novamente.',
    ],
  ] as const)(
    'logout/expiração/revogação em outra aba limpam a sessão (%s)',
    async (reason, message) => {
      const tabA = renderHook(() => useCoordinatorHarness({}))
      const tabB = renderHook(() => useCoordinatorHarness({}))

      act(() => {
        tabA.result.current.coordinator.publishSessionEnded(reason, message)
      })

      expect(tabB.result.current.sessionIdle).toBeNull()
      expect(tabB.result.current.sessionEnded).toEqual({ reason, message })
    },
  )

  it('fallback por storage também sincroniza atividade remota', async () => {
    globalThis.BroadcastChannel = undefined as unknown as typeof BroadcastChannel
    const baseMs = Date.now()

    const { result } = renderHook(() =>
      useCoordinatorHarness({
        initialSessionIdle: createSessionIdle(baseMs - 9 * 60_000, 10, 5),
      }),
    )

    const payload = {
      type: 'activity',
      eventId: 'storage-evt-1',
      sourceTabId: 'other-tab',
      occurredAt: baseMs + 15_000,
      sessionIdle: buildOptimisticSessionIdle(
        createSessionIdle(baseMs - 9 * 60_000, 10, 5),
        baseMs + 15_000,
      ),
    }

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: ADMIN_SESSION_SYNC_STORAGE_KEY,
          newValue: JSON.stringify(payload),
        }),
      )
    })

    expect(Date.parse(result.current.sessionIdle!.lastActivityAt)).toBe(
      baseMs + 15_000,
    )
  })

  it('eventos entre abas não entram em loop', async () => {
    const tabA = renderHook(() => useCoordinatorHarness({}))
    renderHook(() => useCoordinatorHarness({}))

    act(() => {
      tabA.result.current.coordinator.publishOfficialSessionIdle(
        createSessionIdle(Date.now() + 5_000),
      )
    })

    expect(
      FakeBroadcastChannel.messages.filter(
        (message) => message.name === ADMIN_SESSION_SYNC_CHANNEL_NAME,
      ),
    ).toHaveLength(1)
  })
})
