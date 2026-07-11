/** @vitest-environment jsdom */

import { createElement } from 'react'
import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthContextValue } from '../../lib/auth-context-instance'
import { AuthContext } from '../../lib/auth-context-instance'
import { SessionIdleWarningHost } from './SessionIdleWarningHost'

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

function createSessionIdle(lastActivityMs: number, timeoutMinutes = 10, warningMinutes = 5) {
  return {
    idleTimeoutMinutes: timeoutMinutes,
    idleWarningMinutes: warningMinutes,
    lastActivityAt: new Date(lastActivityMs).toISOString(),
    idleExpiresAt: new Date(lastActivityMs + timeoutMinutes * 60_000).toISOString(),
  }
}

function renderWithAuth(value: AuthContextValue) {
  return render(
    createElement(
      AuthContext.Provider,
      { value },
      createElement(SessionIdleWarningHost),
    ),
  )
}

describe('SessionIdleWarningHost', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-11T19:05:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('fecha o modal quando o prazo é estendido por atividade mais recente', () => {
    const user = createUser()
    const logout = vi.fn(async () => {})
    const refreshUser = vi.fn(async () => user)
    const initialValue: AuthContextValue = {
      user,
      ready: true,
      sessionEndedMessage: null,
      sessionIdle: createSessionIdle(Date.now() - 9 * 60_000, 10, 5),
      clearSessionEndedMessage: vi.fn(),
      login: vi.fn(),
      logout,
      refreshUser,
      can: () => true,
      canAny: () => true,
    }

    const view = renderWithAuth(initialValue)

    act(() => {
      vi.advanceTimersByTime(0)
    })

    expect(screen.queryByRole('dialog')).not.toBeNull()

    view.rerender(
      createElement(
        AuthContext.Provider,
        {
          value: {
            ...initialValue,
            sessionIdle: createSessionIdle(Date.now(), 10, 5),
          },
        },
        createElement(SessionIdleWarningHost),
      ),
    )

    act(() => {
      vi.advanceTimersByTime(0)
    })

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('não faz logout automático puramente local quando o contador chega a zero', () => {
    const user = createUser()
    const logout = vi.fn(async () => {})
    const refreshUser = vi.fn(async () => user)

    renderWithAuth({
      user,
      ready: true,
      sessionEndedMessage: null,
      sessionIdle: {
        idleTimeoutMinutes: 10,
        idleWarningMinutes: 5,
        lastActivityAt: new Date(Date.now() - (10 * 60_000 - 2_000)).toISOString(),
        idleExpiresAt: new Date(Date.now() + 2_000).toISOString(),
      },
      clearSessionEndedMessage: vi.fn(),
      login: vi.fn(),
      logout,
      refreshUser,
      can: () => true,
      canAny: () => true,
    })

    act(() => {
      vi.advanceTimersByTime(3_000)
    })

    expect(logout).not.toHaveBeenCalled()
    expect(refreshUser).not.toHaveBeenCalled()
  })
})
