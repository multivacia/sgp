import type { CollaboratorsService } from '../../domain/collaborators/collaborator.service'
import { ApiError } from '../../lib/api/apiErrors'
import { getDataMode } from '../../lib/api/env'
import { createCollaboratorsApiService } from './collaboratorsApiService'
import { createCollaboratorsMockService } from './collaboratorsMockService'

const PROXY_BACKEND_DOWN_STATUSES = new Set([502, 503, 504])

/**
 * Erros HTTP com resposta tratável (400, 401, 403, 404, 409, 422, 500, …) não disparam fallback.
 * Falhas de rede, abort e indisponibilidade atrás de proxy (502/503/504) disparam fallback no modo auto.
 */
export function isNetworkOrBackendUnavailableError(e: unknown): boolean {
  if (e instanceof ApiError) {
    return PROXY_BACKEND_DOWN_STATUSES.has(e.status)
  }
  if (e instanceof TypeError) return true
  if (typeof DOMException !== 'undefined' && e instanceof DOMException) {
    return e.name === 'AbortError'
  }
  return false
}

function createAutoService(
  mock: CollaboratorsService,
  api: CollaboratorsService,
): CollaboratorsService {
  const logFallback = () => {
    if (import.meta.env.DEV) {
      console.warn(
        '[VITE_DATA_MODE=auto] API indisponível (rede/servidor); usando mock.',
      )
    }
  }

  async function tryApi<T>(
    fn: (s: CollaboratorsService) => Promise<T>,
  ): Promise<T> {
    try {
      return await fn(api)
    } catch (e) {
      if (isNetworkOrBackendUnavailableError(e)) {
        logFallback()
        return fn(mock)
      }
      throw e
    }
  }

  return {
    listCollaborators: (filter) =>
      tryApi((s) => s.listCollaborators(filter)),
    getCollaborator: (id) => tryApi((s) => s.getCollaborator(id)),
    createCollaborator: (input) =>
      tryApi((s) => s.createCollaborator(input)),
    updateCollaborator: (id, input) =>
      tryApi((s) => s.updateCollaborator(id, input)),
    activateCollaborator: (id) =>
      tryApi((s) => s.activateCollaborator(id)),
    inactivateCollaborator: (id) =>
      tryApi((s) => s.inactivateCollaborator(id)),
    listSectors: () => tryApi((s) => s.listSectors()),
    listRoles: () => tryApi((s) => s.listRoles()),
  }
}

let cached: CollaboratorsService | undefined

export function getCollaboratorsService(): CollaboratorsService {
  if (cached) return cached
  const mock = createCollaboratorsMockService()
  const api = createCollaboratorsApiService()
  const mode = getDataMode()
  if (mode === 'mock') cached = mock
  else if (mode === 'real') cached = api
  else cached = createAutoService(mock, api)
  return cached
}

/** Testes — permite trocar instância. */
export function __resetCollaboratorsServiceForTests(): void {
  cached = undefined
}
