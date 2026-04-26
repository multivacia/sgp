import {
  collaboratorFromApiJson,
  collaboratorListFilterToQueryString,
  createInputToApiBody,
  roleFromApiJson,
  sectorFromApiJson,
  updateInputToApiBody,
} from '../../domain/collaborators/collaborator.mappers'
import type { CollaboratorsService } from '../../domain/collaborators/collaborator.service'
import type {
  Collaborator,
  CollaboratorCreateInput,
  CollaboratorUpdateInput,
  ServiceMutationResult,
} from '../../domain/collaborators/collaborator.types'
import { ApiError } from '../../lib/api/apiErrors'
import { requestJson } from '../../lib/api/client'

function unwrapArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && 'items' in data) {
    const items = (data as { items?: unknown }).items
    if (Array.isArray(items)) return items
  }
  return []
}

export function createCollaboratorsApiService(): CollaboratorsService {
  const base = '/api/v1'

  return {
    async listCollaborators(filter) {
      const raw = await requestJson<unknown>(
        'GET',
        `${base}/collaborators${collaboratorListFilterToQueryString(filter)}`,
      )
      const arr = unwrapArray(raw)
      return arr.map((a) => collaboratorFromApiJson(a))
    },

    async getCollaborator(id: string) {
      try {
        const raw = await requestJson<unknown>(
          'GET',
          `${base}/collaborators/${encodeURIComponent(id)}`,
        )
        return collaboratorFromApiJson(raw)
      } catch (e) {
        if (e instanceof ApiError && e.status === 404) return null
        throw e
      }
    },

    async createCollaborator(
      input: CollaboratorCreateInput,
    ): Promise<ServiceMutationResult<Collaborator>> {
      try {
        const raw = await requestJson<unknown>('POST', `${base}/collaborators`, {
          body: createInputToApiBody(input),
        })
        return { ok: true, data: collaboratorFromApiJson(raw) }
      } catch (e) {
        return mutationFromApiError(e)
      }
    },

    async updateCollaborator(
      id: string,
      input: CollaboratorUpdateInput,
    ): Promise<ServiceMutationResult<Collaborator>> {
      try {
        const raw = await requestJson<unknown>(
          'PATCH',
          `${base}/collaborators/${encodeURIComponent(id)}`,
          { body: updateInputToApiBody(input) },
        )
        return { ok: true, data: collaboratorFromApiJson(raw) }
      } catch (e) {
        return mutationFromApiError(e)
      }
    },

    async activateCollaborator(id: string) {
      try {
        const raw = await requestJson<unknown>(
          'POST',
          `${base}/collaborators/${encodeURIComponent(id)}/activate`,
        )
        return { ok: true, data: collaboratorFromApiJson(raw) }
      } catch (e) {
        return mutationFromApiError(e)
      }
    },

    async inactivateCollaborator(id: string) {
      try {
        const raw = await requestJson<unknown>(
          'POST',
          `${base}/collaborators/${encodeURIComponent(id)}/inactivate`,
        )
        return { ok: true, data: collaboratorFromApiJson(raw) }
      } catch (e) {
        return mutationFromApiError(e)
      }
    },

    async listSectors() {
      const raw = await requestJson<unknown>('GET', `${base}/sectors`)
      const arr = unwrapArray(raw)
      return arr
        .map((a) => sectorFromApiJson(a))
        .filter((s) => s.id && s.name)
    },

    async listRoles() {
      const raw = await requestJson<unknown>('GET', `${base}/roles`)
      const arr = unwrapArray(raw)
      return arr
        .map((a) => roleFromApiJson(a))
        .filter((r) => r.id && r.name)
    },
  }
}

function mutationFromApiError(e: unknown): ServiceMutationResult<Collaborator> {
  const err = e as { message?: string; status?: number }
  return {
    ok: false,
    message: err.message ?? 'Não foi possível concluir a operação.',
  }
}
