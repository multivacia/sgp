import {
  collaboratorFromMock,
  createInputToMock,
  updateInputToMock,
} from '../../domain/collaborators/collaborator.mappers'
import type { CollaboratorsService } from '../../domain/collaborators/collaborator.service'
import type {
  Collaborator,
  CollaboratorCreateInput,
  CollaboratorListFilter,
  CollaboratorUpdateInput,
  Role,
  Sector,
} from '../../domain/collaborators/collaborator.types'
import {
  atualizarColaboradorOperacional,
  criarColaboradorOperacional,
  definirAtivoColaboradorOperacional,
  getColaboradorById,
  listColaboradoresOperacionais,
} from '../../mocks/colaboradores-operacionais-repository'

/** Catálogo fixo para mock — alinhado ao exemplo de `role_id` da API. */
export const MOCK_COLLABORATOR_ROLES: Role[] = [
  { id: '22222222-2222-2222-2222-222222222222', name: 'Colaborador' },
  { id: '33333333-3333-3333-3333-333333333333', name: 'Gestor operacional' },
]

function roleNameForId(roleId: string | undefined): string | undefined {
  if (!roleId?.trim()) return undefined
  return MOCK_COLLABORATOR_ROLES.find((r) => r.id === roleId)?.name
}

function applyListFilter(
  rows: Collaborator[],
  filter?: CollaboratorListFilter,
): Collaborator[] {
  let out = rows
  if (filter?.status === 'active') {
    out = out.filter((c) => c.status === 'active')
  } else if (filter?.status === 'inactive') {
    out = out.filter((c) => c.status === 'inactive')
  }
  if (filter?.sectorKey?.trim()) {
    const k = filter.sectorKey.trim()
    out = out.filter(
      (c) => c.sectorName === k || c.sectorId === k,
    )
  }
  if (filter?.search?.trim()) {
    const q = filter.search.trim().toLowerCase()
    out = out.filter((c) => {
      const blob = [
        c.fullName,
        c.code,
        c.registrationCode,
        c.nickname,
        c.sectorName,
        c.email,
        c.phone,
        c.jobTitle,
        c.roleName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return blob.includes(q)
    })
  }
  return out.sort((a, b) =>
    a.fullName.localeCompare(b.fullName, 'pt-BR'),
  )
}

function mockSectorsFromStore(): Sector[] {
  const names = new Set<string>()
  for (const c of listColaboradoresOperacionais()) {
    const s = c.setorPrincipal?.trim()
    if (s) names.add(s)
  }
  return [...names]
    .sort((a, b) => a.localeCompare(b, 'pt-BR'))
    .map((name) => ({ id: name, name }))
}

export function createCollaboratorsMockService(): CollaboratorsService {
  return {
    async listCollaborators(filter) {
      const rows = listColaboradoresOperacionais().map(collaboratorFromMock)
      return applyListFilter(rows, filter)
    },

    async getCollaborator(id) {
      const c = getColaboradorById(id)
      return c ? collaboratorFromMock(c) : null
    },

    async createCollaborator(input: CollaboratorCreateInput) {
      const r = criarColaboradorOperacional(
        createInputToMock(input, roleNameForId(input.roleId)),
      )
      if (!r.ok) {
        return {
          ok: false,
          message: r.erros.map((e) => e.mensagem).join(' '),
        }
      }
      return { ok: true, data: collaboratorFromMock(r.colaborador) }
    },

    async updateCollaborator(id: string, input: CollaboratorUpdateInput) {
      const prev = getColaboradorById(id)
      const roleHint =
        input.roleId !== undefined ? roleNameForId(input.roleId) : undefined
      const r = atualizarColaboradorOperacional(
        id,
        updateInputToMock(input, prev, roleHint),
      )
      if (!r.ok) {
        return {
          ok: false,
          message: r.erros.map((e) => e.mensagem).join(' '),
        }
      }
      return { ok: true, data: collaboratorFromMock(r.colaborador) }
    },

    async activateCollaborator(id: string) {
      const r = definirAtivoColaboradorOperacional(id, true)
      if (!r.ok) {
        return {
          ok: false,
          message: r.erros.map((e) => e.mensagem).join(' '),
        }
      }
      return { ok: true, data: collaboratorFromMock(r.colaborador) }
    },

    async inactivateCollaborator(id: string) {
      const r = definirAtivoColaboradorOperacional(id, false)
      if (!r.ok) {
        return {
          ok: false,
          message: r.erros.map((e) => e.mensagem).join(' '),
        }
      }
      return { ok: true, data: collaboratorFromMock(r.colaborador) }
    },

    async listSectors() {
      return mockSectorsFromStore()
    },

    async listRoles(): Promise<Role[]> {
      return [...MOCK_COLLABORATOR_ROLES]
    },
  }
}
