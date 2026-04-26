import { describe, expect, it } from 'vitest'
import { buildDocumentDraftResult } from '../modules/argos-integration/pipeline/buildDocumentDraftResult.js'
import { interpretHeuristicBr } from '../modules/argos-integration/pipeline/interpretHeuristicBr.js'

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
  it('monta draft 1.0.0 com avisos e confiança', () => {
    const buf = Buffer.from('OS 100\nCliente: X\nPlaca ABC1234\nServiço: polimento')
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
    expect(out.draft?.schemaVersion).toBe('1.0.0')
    expect(out.confidence?.overall).toBeGreaterThan(0)
    expect(out.warnings.some((w) => w.category === 'missing_field')).toBe(true)
    expect(out.draft?.extensions?.pipeline).toMatchObject({
      documentLineClassifier: 'document_line_semantic_v2',
    })
  })
})
