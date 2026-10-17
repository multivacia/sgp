import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { App } from './App'
import { api } from './api/client'
import { SessionProvider } from './auth/session'

const USER = { userId: 'u1', email: 'ana@fabrica.com', role: 'GESTOR', collaboratorId: null, permissions: [], mustChangePassword: false }

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

/** Responde às rotas da V1 que a V2 usa; o resto falha para o teste não passar por acaso. */
function backend(routes: Record<string, () => Response>) {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${url}`
    const handler = routes[key]
    if (!handler) throw new Error(`rota inesperada: ${key}`)
    return handler()
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

function renderApp() {
  render(
    <MemoryRouter>
      <SessionProvider>
        <App />
      </SessionProvider>
    </MemoryRouter>,
  )
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('sessão do SGP+ V2 (mesmo login da V1)', () => {
  it('sem sessão na V1, mostra o login', async () => {
    backend({ 'GET /api/v1/auth/me': () => json(401, { error: { code: 'UNAUTHORIZED', message: 'Sessão expirada.' } }) })
    renderApp()
    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeTruthy()
  })

  it('login com e-mail e senha abre o app com a barra de menu e envia o cookie', async () => {
    const fetchMock = backend({
      'GET /api/v1/auth/me': () => json(401, { error: { message: 'Sessão expirada.' } }),
      'POST /api/v1/auth/login': () => json(200, { data: { user: USER } }),
    })
    renderApp()
    fireEvent.change(await screen.findByLabelText('E-mail'), { target: { value: 'ana@fabrica.com' } })
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'segredo' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))

    expect(await screen.findByRole('navigation', { name: 'Menu principal' })).toBeTruthy()
    const [, init] = fetchMock.mock.calls.find(([url]) => url === '/api/v1/auth/login')!
    expect(init?.credentials).toBe('include')
    expect(JSON.parse(String(init?.body))).toEqual({ email: 'ana@fabrica.com', password: 'segredo' })
  })

  it('qualquer resposta 401 do backend derruba a sessão e volta ao login', async () => {
    backend({
      'GET /api/v1/auth/me': () => json(200, { data: { user: USER } }),
      'GET /api/v1/conveyors': () => json(401, { error: { message: 'Sessão expirada.' } }),
    })
    renderApp()
    expect(await screen.findByRole('navigation', { name: 'Menu principal' })).toBeTruthy()

    await expect(api('/conveyors')).rejects.toMatchObject({ status: 401 })
    expect(await screen.findByRole('button', { name: 'Entrar' })).toBeTruthy()
  })
})
