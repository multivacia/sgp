import { describe, expect, it } from 'vitest'
import {
  createExtraTimeEntryDescriptionBodySchema,
  listExtraTimeEntryDescriptionsQuerySchema,
} from '../modules/operational-settings/extra-time-entry-descriptions.schemas.js'

describe('extra time entry descriptions schemas', () => {
  it('create válido', () => {
    const out = createExtraTimeEntryDescriptionBodySchema.parse({
      description: '  Ajuste de máquina  ',
      sortOrder: 50,
    })
    expect(out.description).toBe('Ajuste de máquina')
    expect(out.sortOrder).toBe(50)
  })

  it('description obrigatória e com mínimo de 3', () => {
    expect(() =>
      createExtraTimeEntryDescriptionBodySchema.parse({
        description: '  ',
      }),
    ).toThrow()
    expect(() =>
      createExtraTimeEntryDescriptionBodySchema.parse({
        description: 'ab',
      }),
    ).toThrow()
  })

  it('list query aplica defaults', () => {
    const out = listExtraTimeEntryDescriptionsQuerySchema.parse({})
    expect(out.status).toBe('active')
  })
})
