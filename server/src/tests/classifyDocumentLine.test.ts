import { describe, expect, it } from 'vitest'
import {
  classifyDocumentLine,
  normalizeDocumentLine,
  shouldPromoteToServiceLine,
} from '../modules/argos-integration/pipeline/classifyDocumentLine.js'
import {
  isPlausibleClientName,
  isPlausibleVehicleDescription,
} from '../modules/argos-integration/pipeline/documentFieldPlausibilityBr.js'

describe('classifyDocumentLine — bloqueios fortes antes do score', () => {
  it('bloqueia CNPJ e texto cadastral, sem promoção a serviço', () => {
    const r = classifyDocumentLine('CNPJ fictício: 12.345.678/0001-90')
    expect(r.category).toBe('metadata')
    expect(shouldPromoteToServiceLine(r)).toBe(false)
  })

  it('bloqueia razão social com sufixo societário', () => {
    const r = classifyDocumentLine('AURORA TAPEÇARIA AUTOMOTIVA LTDA.')
    expect(r.category).toBe('metadata')
    expect(shouldPromoteToServiceLine(r)).toBe(false)
  })

  it('bloqueia cabeçalho de OS documental', () => {
    const r = classifyDocumentLine('ORDEM DE SERVIÇO - OS')
    expect(['label', 'metadata']).toContain(r.category)
    expect(shouldPromoteToServiceLine(r)).toBe(false)
  })

  it('bloqueia rótulos de seção e emissão', () => {
    expect(shouldPromoteToServiceLine(classifyDocumentLine('Dados do cliente'))).toBe(false)
    expect(shouldPromoteToServiceLine(classifyDocumentLine('Emissão: 13/04/2026'))).toBe(false)
  })

  it('bloqueia cabeçalhos de seção explícitos (R4-S2)', () => {
    expect(shouldPromoteToServiceLine(classifyDocumentLine('Dados do veículo'))).toBe(false)
    expect(shouldPromoteToServiceLine(classifyDocumentLine('Escopo solicitado'))).toBe(false)
    expect(
      shouldPromoteToServiceLine(classifyDocumentLine('Observações comerciais e técnicas')),
    ).toBe(false)
    expect(classifyDocumentLine('Dados do veículo').blockReason).toBe('section_vehicle')
  })

  it('bloqueia disclaimer', () => {
    const r = classifyDocumentLine(
      'Documento fictício criado para simulação; não correspondem a cliente real.',
    )
    expect(r.category).toBe('disclaimer')
    expect(shouldPromoteToServiceLine(r)).toBe(false)
  })

  it('bloqueia linha de placa como metadado', () => {
    const r = classifyDocumentLine('Placa ABC1234')
    expect(r.category).toBe('metadata')
    expect(shouldPromoteToServiceLine(r)).toBe(false)
  })
})

describe('classifyDocumentLine — serviços curtos e operacionais', () => {
  it.each([
    'Porta-malas',
    'Costura aparente',
    'Espuma lateral',
    'Reforço de espuma',
    'Troca de revestimento lateral',
  ])('promove "%s" como linha de serviço plausível', (line) => {
    const r = classifyDocumentLine(line)
    expect(shouldPromoteToServiceLine(r)).toBe(true)
    expect(r.category).toBe('service_line')
  })

  it('ordinal colado ao texto (PDF) vira lista antes do score — conteúdo operacional preservado', () => {
    const r = classifyDocumentLine('1Courvin sintético premium')
    expect(r.normalized).toMatch(/Courvin/i)
    expect(shouldPromoteToServiceLine(r)).toBe(true)
  })

  it('ordinal colado com itens 2 e 3 (tapeçaria)', () => {
    const a = classifyDocumentLine('2Linha reforçada cinza grafite')
    const b = classifyDocumentLine('3Espuma D33 + reforço')
    expect(a.normalized).toMatch(/^Linha reforçada/i)
    expect(b.normalized).toMatch(/^Espuma D33/i)
    expect(shouldPromoteToServiceLine(a)).toBe(true)
    expect(shouldPromoteToServiceLine(b)).toBe(true)
  })
})

describe('documentFieldPlausibilityBr', () => {
  it('rejeita lixo típico em veículo e aceita descrição plausível', () => {
    expect(isPlausibleVehicleDescription('real.')).toBe(false)
    expect(isPlausibleVehicleDescription('Gol GTI 1.8')).toBe(true)
    expect(isPlausibleClientName('real.')).toBe(false)
    expect(isPlausibleClientName('Maria Silva')).toBe(true)
  })
})

describe('classifyDocumentLine — ambíguo / ruído', () => {
  it('linha só com separadores vira ruído, não serviço', () => {
    const r = classifyDocumentLine('---')
    expect(shouldPromoteToServiceLine(r)).toBe(false)
    expect(['noise', 'label']).toContain(r.category)
  })

  it('normaliza espaços e NBSP', () => {
    const n = normalizeDocumentLine('  a\u00a0  b  ')
    expect(n).toBe('a b')
  })
})
