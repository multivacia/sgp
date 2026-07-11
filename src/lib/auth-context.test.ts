/** @vitest-environment jsdom */

import { createElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from './auth-context'
import {
  ApiError,
  SESSION_EXPIRED_CODE,
  SESSION_EXPIRED_USER_MESSAGE,
} from './api/apiErrors'
import { useAuth } from './use-auth'

const getMeMock = vi.fn()
const postLoginMock = vi.fn()
const postLogoutMock = vi.fn()

vi.mock('../services/auth/authApiService', () => ({
  getMe: () => getMeMock(),
  postLogin: (...args: unknown[]) => postLoginMock(...args),
  postLogout: () => postLogoutMock(),
}))

function createUser() {
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
  idleTimeoutMinutes = 30,
  idleWarningMinutes = 5,
) {
  return {
    idleTimeoutMinutes,
    idleWarningMinutes,
    lastActivityAt: new Date(lastActivityMs).toISOString(),
    idleExpiresAt: new Date(lastActivityMs + idleTimeoutMinutes * 60_000).toISOString(),
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

async function flushAsyncWork() {
  await act(async () => {
    await Promise.resolve()
    await Promise.resolve()
  })
}

function AuthProbe() {
  const {
    ready,
    user,
    sessionIdle,
    sessionEndedMessage,
    hasLocalActivitySinceLastServerSync,
    isSessionRefreshInFlight,
    refreshAdministrativeSession,
    refreshUser,
    logout,
  } = useAuth()
  return createElement(
    'div',
    null,
    createElement('span', { 'data-testid': 'ready' }, ready ? '1' : '0'),
    createElement('span', { 'data-testid': 'user' }, user?.email ?? 'anon'),
    createElement(
      'span',
      { 'data-testid': 'ended' },
      sessionEndedMessage ?? '',
    ),
    createElement(
      'span',
      { 'data-testid': 'local-activity' },
      hasLocalActivitySinceLastServerSync ? '1' : '0',
    ),
    createElement(
      'span',
      { 'data-testid': 'refreshing' },
      isSessionRefreshInFlight ? '1' : '0',
    ),
    createElement(
      'span',
      { 'data-testid': 'idle-expires-at' },
      sessionIdle?.idleExpiresAt ?? '',
    ),
    createElement(
      'button',
      {
        type: 'button',
        onClick: () => {
          void refreshAdministrativeSession()
        },
      },
      'refresh-admin',
    ),
    createElement(
      'button',
      {
        type: 'button',
        onClick: () => {
          void refreshUser()
        },
      },
      'refresh-user',
    ),
    createElement(
      'button',
      {
        type: 'button',
        onClick: () => {
          void logout()
        },
      },
      'logout',
    ),
  )
}

function renderAuthApp(route = '/app/backlog') {
  return render(
    createElement(
      MemoryRouter,
      { initialEntries: [route] },
      createElement(AuthProvider, null, createElement(AuthProbe)),
    ),
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-11T10:00:00.000Z'))
    getMeMock.mockReset()
    postLoginMock.mockReset()
    postLogoutMock.mockReset()
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
    window.localStorage.clear()
    cleanup()
  })

  it('atividade local não dispara request imediatamente e marca a flag', async () => {
    getMeMock.mockResolvedValueOnce({
      user: createUser(),
      sessionIdle: createSessionIdle(Date.now()),
    })

    renderAuthApp()
    await flushAsyncWork()

    expect(screen.getByTestId('ready').textContent).toBe('1')
    expect(screen.getByTestId('user').textContent).toBe('admin@sgp.test')
    expect(getMeMock).toHaveBeenCalledTimes(1)

    act(() => {
      window.dispatchEvent(new Event('pointerdown'))
    })

    expect(screen.getByTestId('local-activity').textContent).toBe('1')
    expect(getMeMock).toHaveBeenCalledTimes(1)
  })

  it('usa uma única renovação oficial e limpa a flag ao receber sessionIdle novo', async () => {
    const nextSession = {
      user: createUser(),
      sessionIdle: createSessionIdle(Date.now() + 25 * 60_000),
    }
    const refreshDeferred = deferred<typeof nextSession>()

    getMeMock
      .mockResolvedValueOnce({
        user: createUser(),
        sessionIdle: createSessionIdle(Date.now()),
      })
      .mockImplementationOnce(() => refreshDeferred.promise)

    renderAuthApp()
    await flushAsyncWork()

    act(() => {
      window.dispatchEvent(new Event('keydown'))
    })

    expect(screen.getByTestId('local-activity').textContent).toBe('1')

    act(() => {
      fireEvent.click(screen.getByText('refresh-admin'))
      fireEvent.click(screen.getByText('refresh-admin'))
    })

    expect(getMeMock).toHaveBeenCalledTimes(2)
    expect(screen.getByTestId('refreshing').textContent).toBe('1')

    await act(async () => {
      refreshDeferred.resolve(nextSession)
      await refreshDeferred.promise
    })
    await flushAsyncWork()

    expect(screen.getByTestId('refreshing').textContent).toBe('0')
    expect(screen.getByTestId('local-activity').textContent).toBe('0')
    expect(screen.getByTestId('idle-expires-at').textContent).toBe(
      nextSession.sessionIdle.idleExpiresAt,
    )
  })

  it('preserva atividade ocorrida durante a renovação em andamento', async () => {
    const refreshDeferred = deferred<{
      user: ReturnType<typeof createUser>
      sessionIdle: ReturnType<typeof createSessionIdle>
    }>()

    getMeMock
      .mockResolvedValueOnce({
        user: createUser(),
        sessionIdle: createSessionIdle(Date.now()),
      })
      .mockImplementationOnce(() => refreshDeferred.promise)

    renderAuthApp()
    await flushAsyncWork()

    act(() => {
      window.dispatchEvent(new Event('pointerdown'))
    })

    act(() => {
      fireEvent.click(screen.getByText('refresh-admin'))
    })

    expect(screen.getByTestId('refreshing').textContent).toBe('1')

    act(() => {
      vi.setSystemTime(new Date('2026-07-11T10:00:05.000Z'))
      window.dispatchEvent(new Event('scroll'))
    })

    await act(async () => {
      refreshDeferred.resolve({
        user: createUser(),
        sessionIdle: createSessionIdle(Date.now()),
      })
      await refreshDeferred.promise
    })
    await flushAsyncWork()

    expect(screen.getByTestId('refreshing').textContent).toBe('0')
    expect(screen.getByTestId('local-activity').textContent).toBe('1')
  })

  it('resposta antiga não reaplica sessão após logout', async () => {
    const refreshDeferred = deferred<{
      user: ReturnType<typeof createUser>
      sessionIdle: ReturnType<typeof createSessionIdle>
    }>()

    getMeMock
      .mockResolvedValueOnce({
        user: createUser(),
        sessionIdle: createSessionIdle(Date.now()),
      })
      .mockImplementationOnce(() => refreshDeferred.promise)
    postLogoutMock.mockResolvedValue(undefined)

    renderAuthApp()
    await flushAsyncWork()

    act(() => {
      fireEvent.click(screen.getByText('refresh-admin'))
    })

    act(() => {
      fireEvent.click(screen.getByText('logout'))
    })
    await flushAsyncWork()

    expect(screen.getByTestId('user').textContent).toBe('anon')

    await act(async () => {
      refreshDeferred.resolve({
        user: createUser(),
        sessionIdle: createSessionIdle(Date.now() + 30_000),
      })
      await refreshDeferred.promise
    })
    await flushAsyncWork()

    expect(screen.getByTestId('user').textContent).toBe('anon')
  })

  it('401 real continua limpando a sessão administrativa', async () => {
    getMeMock
      .mockResolvedValueOnce({
        user: createUser(),
        sessionIdle: createSessionIdle(Date.now()),
      })
      .mockImplementationOnce(async () => {
        window.dispatchEvent(
          new CustomEvent('sgp:session-expired', {
            detail: { message: SESSION_EXPIRED_USER_MESSAGE },
          }),
        )
        throw new ApiError(SESSION_EXPIRED_USER_MESSAGE, 401, {
          code: SESSION_EXPIRED_CODE,
        })
      })

    renderAuthApp()
    await flushAsyncWork()

    expect(screen.getByTestId('ready').textContent).toBe('1')
    expect(screen.getByTestId('user').textContent).toBe('admin@sgp.test')

    act(() => {
      fireEvent.click(screen.getByText('refresh-user'))
    })
    await flushAsyncWork()

    expect(screen.getByTestId('user').textContent).toBe('anon')
    expect(screen.getByTestId('ended').textContent).toBe(
      SESSION_EXPIRED_USER_MESSAGE,
    )
  })
})
