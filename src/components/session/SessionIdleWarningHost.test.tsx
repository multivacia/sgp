/** @vitest-environment jsdom */

import { createElement } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
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

function createSessionIdle(
  lastActivityMs: number,
  timeoutMinutes = 30,
  warningMinutes = 5,
) {
  return {
    idleTimeoutMinutes: timeoutMinutes,
    idleWarningMinutes: warningMinutes,
    lastActivityAt: new Date(lastActivityMs).toISOString(),
    idleExpiresAt: new Date(lastActivityMs + timeoutMinutes * 60_000).toISOString(),
  }
}

function createAuthValue(
  overrides: Partial<AuthContextValue> = {},
): AuthContextValue {
  const user = createUser()
  return {
    user,
    ready: true,
    sessionEndedMessage: null,
    sessionIdle: createSessionIdle(Date.now()),
    hasLocalActivitySinceLastServerSync: false,
    isSessionRefreshInFlight: false,
    clearSessionEndedMessage: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(async () => {}),
    refreshUser: vi.fn(async () => user),
    refreshAdministrativeSession: vi.fn(async () => true),
    can: () => true,
    canAny: () => true,
    ...overrides,
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
    vi.setSystemTime(new Date('2026-07-11T10:25:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    cleanup()
  })

  it('sem atividade local, abre o modal ao atingir a janela de aviso', () => {
    renderWithAuth(
      createAuthValue({
        sessionIdle: createSessionIdle(Date.now() - 25 * 60_000, 30, 5),
      }),
    )

    act(() => {
      vi.advanceTimersByTime(0)
    })

    expect(screen.queryByRole('dialog')).not.toBeNull()
  })

  it('com atividade local, não abre o modal imediatamente e inicia uma única renovação no limiar', () => {
    const refreshAdministrativeSession = vi.fn(async () => true)

    renderWithAuth(
      createAuthValue({
        sessionIdle: createSessionIdle(Date.now() - 25 * 60_000, 30, 5),
        hasLocalActivitySinceLastServerSync: true,
        refreshAdministrativeSession,
      }),
    )

    act(() => {
      vi.advanceTimersByTime(3_000)
    })

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(refreshAdministrativeSession).toHaveBeenCalledTimes(1)
  })

  it('o intervalo de 1 segundo não dispara tempestade de chamadas automáticas', () => {
    const refreshAdministrativeSession = vi.fn(async () => true)

    renderWithAuth(
      createAuthValue({
        sessionIdle: createSessionIdle(Date.now() - 25 * 60_000, 30, 5),
        hasLocalActivitySinceLastServerSync: true,
        refreshAdministrativeSession,
      }),
    )

    act(() => {
      vi.advanceTimersByTime(10_000)
    })

    expect(refreshAdministrativeSession).toHaveBeenCalledTimes(1)
  })

  it('mantém o modal aberto enquanto a renovação iniciada após atividade ainda está em andamento', () => {
    const refreshAdministrativeSession = vi.fn(async () => true)
    const initialValue = createAuthValue({
      sessionIdle: createSessionIdle(Date.now() - 25 * 60_000, 30, 5),
    })

    const view = renderWithAuth(initialValue)

    act(() => {
      vi.advanceTimersByTime(0)
    })

    expect(screen.queryByRole('dialog')).not.toBeNull()

    view.rerender(
      createElement(
        AuthContext.Provider,
        {
          value: createAuthValue({
            sessionIdle: initialValue.sessionIdle,
            hasLocalActivitySinceLastServerSync: true,
            isSessionRefreshInFlight: true,
            refreshAdministrativeSession,
          }),
        },
        createElement(SessionIdleWarningHost),
      ),
    )

    act(() => {
      vi.advanceTimersByTime(0)
    })

    expect(screen.queryByRole('dialog')).not.toBeNull()
    expect(refreshAdministrativeSession).not.toHaveBeenCalled()
  })

  it('renovação bem-sucedida mantém o modal fechado com novo sessionIdle oficial', () => {
    const refreshAdministrativeSession = vi.fn(async () => true)
    const view = renderWithAuth(
      createAuthValue({
        sessionIdle: createSessionIdle(Date.now() - 25 * 60_000, 30, 5),
        hasLocalActivitySinceLastServerSync: true,
        refreshAdministrativeSession,
      }),
    )

    act(() => {
      vi.advanceTimersByTime(0)
    })

    view.rerender(
      createElement(
        AuthContext.Provider,
        {
          value: createAuthValue({
            sessionIdle: createSessionIdle(Date.now(), 30, 5),
            hasLocalActivitySinceLastServerSync: false,
            refreshAdministrativeSession,
          }),
        },
        createElement(SessionIdleWarningHost),
      ),
    )

    act(() => {
      vi.advanceTimersByTime(0)
    })

    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('o botão Continuar conectado reutiliza a mesma função de renovação', () => {
    const refreshAdministrativeSession = vi.fn(async () => true)

    renderWithAuth(
      createAuthValue({
        sessionIdle: createSessionIdle(Date.now() - 25 * 60_000, 30, 5),
        refreshAdministrativeSession,
      }),
    )

    act(() => {
      vi.advanceTimersByTime(0)
    })

    fireEvent.click(screen.getByText('Continuar conectado'))

    expect(refreshAdministrativeSession).toHaveBeenCalledTimes(1)
  })

  it('não faz logout automático puramente local quando o contador chega a zero', () => {
    const logout = vi.fn(async () => {})
    const refreshAdministrativeSession = vi.fn(async () => true)

    renderWithAuth(
      createAuthValue({
        sessionIdle: {
          idleTimeoutMinutes: 30,
          idleWarningMinutes: 5,
          lastActivityAt: new Date(Date.now() - (30 * 60_000 - 2_000)).toISOString(),
          idleExpiresAt: new Date(Date.now() + 2_000).toISOString(),
        },
        logout,
        refreshAdministrativeSession,
      }),
    )

    act(() => {
      vi.advanceTimersByTime(3_000)
    })

    expect(logout).not.toHaveBeenCalled()
    expect(refreshAdministrativeSession).not.toHaveBeenCalled()
  })
})
