import { beforeEach, describe, expect, it } from 'vitest'
import {
  __resetColaboradoresRepositoryForTests,
  criarColaboradorOperacional,
} from '../../mocks/colaboradores-operacionais-repository'
import {
  createCollaboratorsMockService,
  MOCK_COLLABORATOR_ROLES,
} from './collaboratorsMockService'

describe('collaboratorsMockService', () => {
  beforeEach(() => {
    __resetColaboradoresRepositoryForTests()
  })

  it('listCollaborators aplica filtro de setor (nome)', async () => {
    criarColaboradorOperacional({
      nome: 'Zé Outro Setor',
      setorPrincipal: 'Costura',
      metadata: { roleId: MOCK_COLLABORATOR_ROLES[0]!.id },
    })
    const svc = createCollaboratorsMockService()
    const tape = await svc.listCollaborators({
      status: 'all',
      sectorKey: 'Tapeçaria',
    })
    expect(tape.every((c) => c.sectorName === 'Tapeçaria')).toBe(true)
    const costura = await svc.listCollaborators({ sectorKey: 'Costura' })
    expect(costura.some((c) => c.fullName === 'Zé Outro Setor')).toBe(true)
  })

  it('createCollaborator retorna erro amigável de validação', async () => {
    const svc = createCollaboratorsMockService()
    const r = await svc.createCollaborator({
      fullName: '   ',
      sectorId: 'Costura',
      roleId: MOCK_COLLABORATOR_ROLES[0]!.id,
    })
    expect(r.ok).toBe(false)
    if (r.ok) return
    expect(r.message.length).toBeGreaterThan(0)
  })
})
