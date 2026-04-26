import { describe, expect, it } from 'vitest'
import {
  collaboratorFromApiJson,
  collaboratorFromMock,
  collaboratorListFilterToQueryString,
  createInputToApiBody,
  updateInputToApiBody,
} from './collaborator.mappers'
import type { ColaboradorOperacional } from '../../mocks/colaboradores-operacionais-repository'

describe('collaborator.mappers', () => {
  it('collaboratorFromMock mapeia repositório para domínio', () => {
    const c: ColaboradorOperacional = {
      colaboradorId: 'colab-x',
      nome: 'Maria',
      codigo: 'MAR',
      matricula: '123',
      apelido: 'M',
      ativo: true,
      setorPrincipal: 'Corte',
    }
    const d = collaboratorFromMock(c)
    expect(d.id).toBe('colab-x')
    expect(d.fullName).toBe('Maria')
    expect(d.code).toBe('MAR')
    expect(d.registrationCode).toBe('123')
    expect(d.nickname).toBe('M')
    expect(d.sectorName).toBe('Corte')
    expect(d.status).toBe('active')
  })

  it('collaboratorFromApiJson aceita snake_case e nome', () => {
    const d = collaboratorFromApiJson({
      id: 'uuid-1',
      full_name: 'João API',
      code: 'J',
      status: 'inactive',
    })
    expect(d.id).toBe('uuid-1')
    expect(d.fullName).toBe('João API')
    expect(d.status).toBe('inactive')
  })

  it('collaboratorFromApiJson usa ativo boolean', () => {
    const d = collaboratorFromApiJson({
      id: '1',
      nome: 'X',
      ativo: false,
    })
    expect(d.fullName).toBe('X')
    expect(d.status).toBe('inactive')
  })

  it('collaboratorFromApiJson aceita status ACTIVE da API', () => {
    const d = collaboratorFromApiJson({
      id: '1',
      full_name: 'Y',
      status: 'ACTIVE',
    })
    expect(d.status).toBe('active')
  })

  it('collaboratorFromApiJson prioriza is_active sobre status', () => {
    const d = collaboratorFromApiJson({
      id: '1',
      full_name: 'Z',
      status: 'ACTIVE',
      is_active: false,
    })
    expect(d.status).toBe('inactive')
  })

  it('createInputToApiBody emite camelCase canônico e status ACTIVE/INACTIVE', () => {
    const sid = '11111111-1111-1111-1111-111111111111'
    const rid = '22222222-2222-2222-2222-222222222222'
    const body = createInputToApiBody({
      fullName: 'Maria Silva',
      avatarUrl: null,
      sectorId: sid,
      roleId: rid,
      notes: 'Obs',
      status: 'inactive',
    })
    expect(body).toEqual({
      fullName: 'Maria Silva',
      avatarUrl: null,
      sectorId: sid,
      roleId: rid,
      notes: 'Obs',
      status: 'INACTIVE',
    })
  })

  it('updateInputToApiBody só inclui campos presentes (camelCase)', () => {
    expect(
      updateInputToApiBody({
        fullName: 'Novo',
        avatarUrl: 'https://x/y.png',
      }),
    ).toEqual({
      fullName: 'Novo',
      avatarUrl: 'https://x/y.png',
    })
  })

  it('collaboratorListFilterToQueryString usa ACTIVE, INACTIVE e sector_id (sem status em "all")', () => {
    expect(collaboratorListFilterToQueryString({ status: 'active' })).toBe(
      '?status=ACTIVE',
    )
    expect(collaboratorListFilterToQueryString({ status: 'inactive' })).toBe(
      '?status=INACTIVE',
    )
    expect(collaboratorListFilterToQueryString({ status: 'all' })).toBe('')
    expect(
      collaboratorListFilterToQueryString({
        status: 'active',
        sectorKey: 'abc-uuid',
      }),
    ).toBe('?status=ACTIVE&sector_id=abc-uuid')
    expect(collaboratorListFilterToQueryString()).toBe('')
    expect(
      collaboratorListFilterToQueryString({ search: 'maria' }),
    ).toBe('?search=maria')
    expect(
      collaboratorListFilterToQueryString({
        status: 'active',
        sectorKey: 'sid',
        search: 'x',
      }),
    ).toBe('?status=ACTIVE&sector_id=sid&search=x')
  })
})
