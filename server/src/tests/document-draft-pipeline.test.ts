import { describe, expect, it } from 'vitest'
import { buildDocumentDraftResult } from '../modules/argos-integration/pipeline/buildDocumentDraftResult.js'
import { interpretBravoDeterministic } from '../modules/argos-integration/pipeline/interpretBravoDeterministic.js'
import { interpretHeuristicBr } from '../modules/argos-integration/pipeline/interpretHeuristicBr.js'
import {
  BRAVO_EXPECTED_SERVICE_SAMPLES,
  BRAVO_OS_SANITIZED_TEXT,
} from './fixtures/bravo-os-sanitized.fixture.js'

describe('ARGOS pipeline local — interpretação heurística BR', () => {
  it('não promove rótulos de seção nem aceita veículo inválido como dado sugerido', () => {
    const text = [
      'OS 9001',
      'Cliente: João Teste',
      'Veículo: real.',
      'Dados do veículo',
      'Escopo solicitado',
      'Observações comerciais e técnicas',
      '1) Reforma de bancos',
    ].join('\n')
    const h = interpretHeuristicBr({ text, fileName: 'x.pdf' })
    const titles = h.serviceLines.map((s) => s.title)
    expect(titles.some((t) => /Dados do ve[ií]culo|Escopo solicitado|Observa[cç]/i.test(t))).toBe(
      false,
    )
    expect(h.vehicleDescription).toBeUndefined()
    expect(h.clientName).toContain('João')
  })

  it('extrai modelVersion só com rótulo explícito', () => {
    const t1 = 'Modelo: Gol G5 1.0\nPlaca ABC1D23'
    const h1 = interpretHeuristicBr({ text: t1, fileName: 'a.pdf' })
    expect(h1.modelVersion).toMatch(/Gol G5/i)

    const t2 = 'Carro Gol sem label de modelo'
    const h2 = interpretHeuristicBr({ text: t2, fileName: 'b.pdf' })
    expect(h2.modelVersion).toBeUndefined()
  })

  it('extrai OS, placa Mercosul e cliente de texto típico', () => {
    const text = `
      Ordem de Serviço 7945
      Cliente: Oficina Teste Ltda
      Placa ABC1D23
      Observações: troca de carpete
      1) Remover bancos
      2) Aplicar revestimento
    `
    const h = interpretHeuristicBr({ text, fileName: 'os.pdf' })
    expect(h.osNumber).toBe('7945')
    expect(h.licensePlate?.replace(/\s/g, '')).toMatch(/ABC1D23/i)
    expect(h.clientName).toContain('Oficina Teste')
    expect(h.serviceLines.length).toBeGreaterThanOrEqual(1)
    expect(h.suggestedEsteiraTitle).toContain('7945')
  })

  it('em documento misto, não promove metadado/disclaimer para linhas de serviço', () => {
    const text = [
      'ORDEM DE SERVIÇO - OS',
      'Tapeçaria Aurora Estofados LTDA',
      '12.345.678/0001-90',
      'Emissão: 13/04/2026',
      'Dados do cliente',
      'Documento fictício para simulação de fluxo.',
      'Porta-malas',
      '1) Reforma de bancos',
      'Aplicação de couro sintético',
    ].join('\n')
    const h = interpretHeuristicBr({ text, fileName: 'simulacao-os.pdf' })
    const titles = h.serviceLines.map((s) => s.title)
    expect(
      titles.some((t) =>
        /cnpj|LTDA|ORDEM DE SERVI|fict[ií]cio|Emiss[aã]o\s*:/i.test(t),
      ),
    ).toBe(false)
    expect(titles.some((t) => /Porta-malas|Reforma de bancos|couro sint[eé]tico/i.test(t))).toBe(
      true,
    )
  })
})

describe('ARGOS pipeline local — build resultado', () => {
  it('monta draft 1.1.0 com avisos e confiança', () => {
    const buf = Buffer.from('OS 100\nCliente: Oficina Teste\nPlaca ABC1234\n\n1) Polimento')
    const h = interpretHeuristicBr({
      text: buf.toString('utf8'),
      fileName: 'doc.txt',
    })
    const out = buildDocumentDraftResult({
      fileBuffer: buf,
      fileName: 'doc.txt',
      mimeType: 'text/plain',
      correlationId: 'corr-test',
      extract: {
        text: buf.toString('utf8'),
        source: 'text',
        extractWarnings: [],
      },
      interpretation: h,
    })
    expect(out.draft?.schemaVersion).toBe('1.1.0')
    if (out.draft?.schemaVersion === '1.1.0') {
      expect(out.draft.humanReviewRequired).toBe(true)
    }
    expect(out.confidence?.overall).toBeGreaterThan(0)
    expect(out.warnings.some((w) => w.category === 'missing_field')).toBe(false)
    expect(out.redaction?.personalDataRemoved).toBe(true)
    expect(out.redaction?.financialDataRemoved).toBe(true)
    expect(out.draft?.extensions?.pipeline).toMatchObject({
      documentLineClassifier: 'document_line_semantic_v2',
    })
    expect(out.sourceDocument?.provider).toBe('HEURISTIC_IMPORT')
  })

  it('não promove linhas financeiras para itens operacionais', () => {
    const buf = Buffer.from(
      'OS 100\nServiço: polimento\nTotal: R$ 500,00\nRecebido: R$ 500,00',
    )
    const h = interpretHeuristicBr({
      text: buf.toString('utf8'),
      fileName: 'doc.txt',
    })
    const out = buildDocumentDraftResult({
      fileBuffer: buf,
      fileName: 'doc.txt',
      mimeType: 'text/plain',
      correlationId: 'corr-test',
      extract: {
        text: buf.toString('utf8'),
        source: 'text',
        extractWarnings: [],
      },
      interpretation: h,
    })
    const facts = out.extractedFacts.map((f) => String(f.value).toLowerCase())
    expect(facts.some((f) => f.includes('r$') || f.includes('total'))).toBe(false)
  })

  it('gera payload 1.1.0 limpo para OS Bravo textual', () => {
    const text = BRAVO_OS_SANITIZED_TEXT
    const buf = Buffer.from(text)
    const out = buildDocumentDraftResult({
      fileBuffer: buf,
      fileName: 'os-bravo.pdf',
      mimeType: 'text/plain',
      correlationId: 'corr-bravo',
      extract: {
        text,
        source: 'text',
        extractWarnings: [],
      },
      interpretation: interpretBravoDeterministic({
        text,
        fileName: 'os-bravo.pdf',
      }),
    })

    expect(out.draft?.schemaVersion).toBe('1.1.0')
    if (out.draft?.schemaVersion === '1.1.0') {
      expect(out.draft.humanReviewRequired).toBe(true)
      const draftSerialized = JSON.stringify(out.draft).toLowerCase()
      expect(draftSerialized.includes('producer')).toBe(false)
      expect(draftSerialized.includes('creationdate')).toBe(false)
      expect(draftSerialized.includes('bravo tapeçaria fone')).toBe(false)
      expect(draftSerialized.includes('contato@')).toBe(false)
      expect(draftSerialized.includes('fone:')).toBe(false)
      expect(draftSerialized.includes('cel:')).toBe(false)
      expect(draftSerialized.includes('rua josé')).toBe(false)
      expect(draftSerialized.includes('dados do cliente')).toBe(false)
      expect(draftSerialized.includes('dados do veículo')).toBe(false)
      expect(draftSerialized.includes('peças do pedido')).toBe(false)
      expect(draftSerialized.includes('serviços do pedido')).toBe(false)
      expect(draftSerialized.includes('total r$')).toBe(false)
      expect(draftSerialized.includes('pagamento')).toBe(false)
      expect(draftSerialized.includes('cpf/cnpj')).toBe(false)
      expect(draftSerialized.includes('e-mail')).toBe(false)
      expect(draftSerialized.includes('cpf')).toBe(false)
      expect(draftSerialized.includes('r$')).toBe(false)
      expect(draftSerialized.includes('pagamento')).toBe(false)
      expect(draftSerialized.includes('16816,36')).toBe(false)
      expect(draftSerialized.includes('13681,15')).toBe(false)
      expect(draftSerialized.includes('30497,51')).toBe(false)
      expect(out.draft.suggestedDados.title).toBe('7452')
      expect(out.draft.suggestedDados.notes).toBe('')
      expect(out.draft.suggestedDados.modelVersion).toBe('')
      /** R6 S1 baseline — nome sem CPF colado (TD10.6). */
      expect(out.draft.suggestedDados.clientName).toBe('DENILSON DE FRETAS GTI')
      expect(out.draft.suggestedDados.licensePlate).toBe('AWW2C00')
      expect(out.draft.suggestedDados.estimatedDeadline ?? '').toBe('')
      expect(out.draft.options[0]?.areas[0]?.steps.length).toBeGreaterThanOrEqual(1)
      const stepTitles = out.draft.options[0]?.areas[0]?.steps.map((s) => s.title) ?? []
      expect(stepTitles).toEqual(
        expect.arrayContaining(BRAVO_EXPECTED_SERVICE_SAMPLES),
      )
    }
    expect(out.sourceDocument?.provider).toBe('BRAVO')
    expect(out.sourceDocument?.documentType).toBe('OS_OR_BUDGET')
    expect(out.sourceDocument?.documentNumber).toBe('7452')
    expect(out.operationalContext?.vehicle?.year).toBe(1993)
    expect(out.operationalContext?.vehicle?.model).toMatch(/GOL GTI 2000/i)
    expect(out.operationalContext?.vehicle?.color).toMatch(/PRETA/i)
    expect(out.operationalContext?.maskedIdentifiers?.licensePlateMasked).toBe('AWW****')
    expect(out.draft?.suggestedDados.vehicleDescription).toMatch(/GOL GTI 2000/i)
    expect(out.sourceDocument?.issuedAt).toBe('2026-01-15')
    expect((out.sourceDocument as { entryDate?: string } | undefined)?.entryDate).toBe(
      '2026-01-26',
    )
    expect(
      out.warnings.filter((w) => w.code === 'field.missing.suggestedDados_licensePlate'),
    ).toHaveLength(0)
    expect(
      out.extractedFacts.map((f) => f.key).includes('vehicle.licensePlate'),
    ).toBe(false)
    expect(
      out.extractedItems?.serviceItems.every(
        (s) =>
          !/DENILSON/i.test(s.description) &&
          !/AWW2C00/i.test(s.description) &&
          !/\d{3}\.\d{3}\.\d{3}-\d{2}/.test(s.description),
      ),
    ).toBe(true)
    expect(out.extractedItems?.serviceItems.map((i) => i.description)).toEqual(
      expect.arrayContaining(BRAVO_EXPECTED_SERVICE_SAMPLES),
    )
    for (const s of out.extractedItems?.serviceItems ?? []) {
      const d = s.description.toLowerCase()
      expect(d).not.toMatch(/^\s*\d{3,4}\s*$/)
      expect(d).not.toContain('un @')
      expect(d).not.toContain('r$')
      expect(d).not.toContain('total')
      expect(d).not.toContain('pagamento')
      expect(d).not.toContain('desconto')
    }
    expect(out.extractedItems?.partItems).toEqual([])
    expect(
      typeof out.draft?.extensions?.documentPartsExcludedFromOperationalUi === 'number' &&
        (out.draft.extensions.documentPartsExcludedFromOperationalUi as number) > 0,
    ).toBe(true)
    expect(out.extractedItems?.operationalNotes ?? []).toEqual([])
    const fullOut = JSON.stringify(out).toLowerCase()
    expect(fullOut.includes('16816,36')).toBe(false)
    expect(fullOut.includes('13681,15')).toBe(false)
    expect(fullOut.includes('30497,51')).toBe(false)
    expect(fullOut.includes('sub total')).toBe(false)
    expect(fullOut.includes('valor unit')).toBe(false)
    expect(fullOut.includes('valor total')).toBe(false)
    expect(fullOut.includes('recebido')).toBe(false)
    expect(fullOut.includes('troco')).toBe(false)
    expect(fullOut.includes('chassi')).toBe(false)
    expect(fullOut.includes('un @')).toBe(false)
    expect(fullOut.includes('rg/i.e')).toBe(false)
    expect(fullOut.includes('cpf/cnpj')).toBe(false)
    expect(fullOut.includes('30123')).toBe(false)
    expect(out.matchingPlan).toEqual([])
    expect(out.redaction?.financialDataRemoved).toBe(true)
    expect(out.redaction?.personalDataRemoved).toBe(true)
    expect(out.redaction?.removedCategories).toEqual(
      expect.arrayContaining([
        'cpf_cnpj',
        'address',
        'phone',
        'email',
        'customer_name',
        'pricing',
        'payment_terms',
        'discount',
        'totals',
      ]),
    )
  })
})
