import { describe, expect, it } from 'vitest'
import {
  patchExtraTimeEntryBodySchema,
  deleteExtraTimeEntryBodySchema,
} from '../modules/my-activities/extra-time-entry-corrections.schemas.js'

const ID = '11111111-1111-4111-8111-111111111111'
const base = {
  expectedUpdatedAt: '2026-10-20T12:00:00.000Z',
  reason: '  Ajuste conferido pela gestão ',
  descriptionId: ID,
  entryDate: '2026-10-20',
  minutes: 30,
  notes: null,
}

describe('correção gerencial Extra Esteira — validação', () => {
  it('aceita os campos e normaliza justificativa', () => {
    const parsed = patchExtraTimeEntryBodySchema.parse(base)
    expect(parsed.reason).toBe('Ajuste conferido pela gestão')
    expect(parsed.minutes).toBe(30)
  })
  it('rejeita data inexistente ou futura', () => {
    expect(patchExtraTimeEntryBodySchema.safeParse({ ...base, entryDate: '2026-02-30' }).success).toBe(false)
    expect(patchExtraTimeEntryBodySchema.safeParse({ ...base, entryDate: '2099-01-01' }).success).toBe(false)
  })
  it('rejeita minutos zero, justificativa vazia, observação longa e payload excedente', () => {
    expect(patchExtraTimeEntryBodySchema.safeParse({ ...base, minutes: 0 }).success).toBe(false)
    expect(patchExtraTimeEntryBodySchema.safeParse({ ...base, reason: '   ' }).success).toBe(false)
    expect(patchExtraTimeEntryBodySchema.safeParse({ ...base, notes: 'x'.repeat(501) }).success).toBe(false)
    expect(patchExtraTimeEntryBodySchema.safeParse({ ...base, collaboratorId: ID }).success).toBe(false)
  })
  it('remoção exige motivo e revisão para impedir exclusão às cegas', () => {
    expect(deleteExtraTimeEntryBodySchema.safeParse({
      expectedUpdatedAt: base.expectedUpdatedAt,
      reason: '  erro operacional  ',
    }).success).toBe(true)
    expect(deleteExtraTimeEntryBodySchema.safeParse({ reason: 'teste' }).success).toBe(false)
    expect(deleteExtraTimeEntryBodySchema.safeParse({
      expectedUpdatedAt: base.expectedUpdatedAt,
      reason: '',
    }).success).toBe(false)
  })
})
