/** @vitest-environment jsdom */

import { createElement } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

function createSessionIdle(lastActivityMs: number) {
  return {
    idleTimeoutMinutes: 10,
    idleWarningMinutes: 5,
    lastActivityAt: new Date(lastActivityMs).toISOString(),
    idleExpiresAt: new Date(lastActivityMs + 10 * 60_000).toISOString(),
  }
}

function AuthProbe() {
  const { ready, user, sessionEndedMessage, refreshUser } = useAuth()
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
      'button',
      {
        type: 'button',
        onClick: () => {
          void refreshUser()
        },
      },
      'refresh',
    ),
  )
}

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    getMeMock.mockReset()
    postLoginMock.mockReset()
    postLogoutMock.mockReset()
    window.localStorage.clear()
  })

  afterEach(() => {
    window.localStorage.clear()
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

    render(
      createElement(
        MemoryRouter,
        { initialEntries: ['/app/backlog'] },
        createElement(AuthProvider, null, createElement(AuthProbe)),
      ),
    )

    await waitFor(() => {
      expect(screen.getByTestId('ready').textContent).toBe('1')
      expect(screen.getByTestId('user').textContent).toBe('admin@sgp.test')
    })

    act(() => {
      fireEvent.click(screen.getByText('refresh'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('user').textContent).toBe('anon')
      expect(screen.getByTestId('ended').textContent).toBe(
        SESSION_EXPIRED_USER_MESSAGE,
      )
    })
  })
})
