import { describe, expect, it } from 'vitest'
import { computeCollaboratorInitials } from '../modules/production/production-initials.js'

describe('computeCollaboratorInitials', () => {
  it('gera iniciais de nome composto', () => {
    expect(computeCollaboratorInitials('Maria Silva')).toBe('MS')
  })

  it('gera duas letras para nome único', () => {
    expect(computeCollaboratorInitials('Ana')).toBe('AN')
  })
})
