/**
 * Roteador central de mocks `/api/**` para as capturas do Manual do Usuário.
 *
 * - Cada item de captura declara `handlers` (sobrepõem os handlers base).
 * - Toda chamada `/api/**` sem handler é registrada como inesperada e respondida com 404
 *   (envelope de erro real), para que o navegador nunca dependa de backend externo.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { repoRoot } from './inventory.mjs'
import { FIXED_NOW_ISO } from './fixtures/common.mjs'
import { MATRIX_ITEMS, MATRIX_TREES, ROLES, SECTORS, TEAMS, collaboratorsList } from './fixtures/reference.mjs'

const appVersion = JSON.parse(readFileSync(path.join(repoRoot, 'app-version.json'), 'utf8'))

/** Resposta de sucesso no envelope real `{ data, meta? }`. */
export function ok(data, meta) {
  return { status: 200, body: meta === undefined ? { data } : { data, meta } }
}

/** Resposta de erro no envelope real `{ error: { code, message, ... } }`. */
export function fail(status, code, message, extra = {}) {
  return { status, body: { error: { code, message, ...extra } } }
}

/** Handler: `[METHOD, pathMatcher, reply]`. `pathMatcher` = string exata ou RegExp sobre pathname. */
export function h(method, matcher, reply) {
  return { method, matcher, reply }
}

export function sessionIdle() {
  const now = Date.parse(FIXED_NOW_ISO)
  return {
    idleTimeoutMinutes: 600,
    idleWarningMinutes: 5,
    lastActivityAt: new Date(now).toISOString(),
    idleExpiresAt: new Date(now + 600 * 60 * 1000).toISOString(),
  }
}

export function baseHandlers(user) {
  return [
    h('GET', '/api/v1/auth/me', () => ok({ user, sessionIdle: sessionIdle() })),
    h('POST', '/api/v1/auth/heartbeat', () => ok({ sessionIdle: sessionIdle() })),
    h('GET', '/api/v1/version', () =>
      ok({
        product: appVersion.product,
        version: appVersion.version,
        releaseName: appVersion.releaseName,
        environment: 'production',
        buildTime: null,
        commit: 'manual',
      }),
    ),
    // Dados de referência comuns a várias telas (podem ser sobrepostos pelo item).
    h('GET', '/api/v1/collaborators', () => ok(collaboratorsList())),
    h('GET', '/api/v1/sectors', () => ok(SECTORS)),
    h('GET', '/api/v1/roles', () => ok(ROLES)),
    h('GET', '/api/v1/teams', () => ok(TEAMS, { total: TEAMS.length, limit: 200, offset: 0 })),
    h('GET', '/api/v1/operation-matrix/items', () => ok(MATRIX_ITEMS)),
    h('GET', /^\/api\/v1\/operation-matrix\/items\/[^/]+\/tree$/, ({ url }) =>
      ok(MATRIX_TREES.find((t) => t.id === decodeURIComponent(url.pathname.split('/')[5])) ?? MATRIX_TREES[0]),
    ),
  ]
}

function matches(handler, method, pathname) {
  if (handler.method !== '*' && handler.method !== method) return false
  if (typeof handler.matcher === 'string') return handler.matcher === pathname
  return handler.matcher.test(pathname)
}

/**
 * Instala o roteador na página. Retorna o registro de chamadas (atendidas e inesperadas).
 * @param {import('playwright').Page | import('playwright').BrowserContext} target
 */
export async function installMockApi(target, { user, handlers = [] }) {
  const all = [...handlers, ...(user ? baseHandlers(user) : [])]
  const log = { served: new Set(), unexpected: [] }
  await target.route(
    (url) => url.pathname.startsWith('/api/'),
    async (route) => {
      const req = route.request()
      const url = new URL(req.url())
      const method = req.method()
      const handler = all.find((x) => matches(x, method, url.pathname))
      if (!handler) {
        log.unexpected.push(`${method} ${url.pathname}${url.search}`)
        return route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ error: { code: 'NOT_FOUND', message: 'Recurso não mockado.' } }),
        })
      }
      log.served.add(`${method} ${url.pathname}`)
      let body = null
      try {
        body = req.postDataJSON()
      } catch {
        body = req.postData()
      }
      const res = await handler.reply({ url, method, body, query: url.searchParams })
      if (res && res.abort) return route.abort(res.abort)
      if (res && res.raw) {
        return route.fulfill({ status: res.status ?? 200, contentType: res.contentType, body: res.raw, headers: res.headers })
      }
      if (res && res.status === 204) return route.fulfill({ status: 204, body: '' })
      return route.fulfill({
        status: res?.status ?? 200,
        contentType: 'application/json',
        body: JSON.stringify(res?.body ?? null),
      })
    },
  )
  return log
}
