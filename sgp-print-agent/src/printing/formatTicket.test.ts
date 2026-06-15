import { describe, expect, it } from 'vitest'
import { formatActivityTicketLines, buildTestTicket } from './formatTicket.js'

describe('formatActivityTicketLines', () => {
  it('gera linhas do ticket no padrao SGP+', () => {
    const lines = formatActivityTicketLines(buildTestTicket(), 42)

    expect(lines.join('\n')).toContain('SGP+ ATIVIDADE')
    expect(lines.join('\n')).toContain('OS TESTE SGP+')
    expect(lines.join('\n')).toContain('Atividade de teste do agente local')
    expect(lines.join('\n')).toContain('STEP-0001')
    expect(lines.join('\n')).toContain('Apoio operacional.')
  })
})
