import { describe, expect, it } from 'vitest'
import { isForbiddenOperationalContent } from '../modules/argos-integration/pipeline/bravoOperationalSanitize.js'
import { interpretBravoDeterministic } from '../modules/argos-integration/pipeline/interpretBravoDeterministic.js'
import {
  BRAVO_EXPECTED_PART_SAMPLES,
  BRAVO_EXPECTED_SERVICE_SAMPLES,
  BRAVO_OS_SANITIZED_TEXT,
} from './fixtures/bravo-os-sanitized.fixture.js'

describe('interpretBravoDeterministic', () => {
  it('não cola ruído PRETAAno/Cor em modelo ou cor quando a linha está corrompida', () => {
    const text = [
      'OS 7001',
      'Dados do Veiculo',
      'Modelo: HB20',
      'Cor: PRETAAno:Cor:',
      'Placa ABC1D23',
      'Servicos do Pedido',
      '1) Polimento',
    ].join('\n')
    const out = interpretBravoDeterministic({ text, fileName: 'x.pdf' })
    expect(out.modelVersion).toBeUndefined()
    expect(out.vehicleDescription?.toLowerCase()).not.toContain('pretaano')
    expect(out.vehicleDescription?.toLowerCase()).not.toContain('ano:cor')
    expect(String(out.vehicleColor ?? '').toLowerCase()).not.toContain('pretaano')
  })

  it('marca texto com telefone/CEP/e-mail/VIN como conteúdo operacional proibido', () => {
    expect(
      isForbiddenOperationalContent(
        'SPCOMERCIAL VITORIA ARUBA 13.347-624 19999110876 contato@x.com',
      ),
    ).toBe(true)
    expect(isForbiddenOperationalContent('OMBREIRA DIANTEIRA - REVESTIMENTO')).toBe(false)
  })

  it('separa serviços, peças e remove linhas LGPD/financeiras', () => {
    const text = [
      'ORDEM DE SERVICO OS 9988',
      'Dados do Veiculo',
      'Modelo: Onix LT 1.0',
      'Ano: 2020',
      'Cor: Prata',
      'Placa ABC1D23',
      'Pecas do Pedido',
      '1) Courvin preto qtd: 2',
      '2) Espuma densidade 45',
      'Servicos do Pedido',
      '1) Reforma de bancos dianteiros',
      '2) Higienizacao interna',
      'Dados Adicionais',
      'Cliente: Joao da Silva',
      'CPF: 123.456.789-10',
      'Telefone: 11999999999',
      'Observacoes',
      'Priorizar entrega ate sexta.',
      'Total: R$ 890,00',
      'Pagamento: PIX',
    ].join('\n')

    const out = interpretBravoDeterministic({ text, fileName: 'os-bravo.pdf' })

    expect(out.osNumber).toBe('9988')
    expect(out.licensePlate).toBe('ABC1D23')
    expect(out.modelVersion).toBeUndefined()
    expect(out.vehicleDescription).toMatch(/Onix/i)
    expect(out.clientName?.toLowerCase()).toContain('joao')
    expect(out.vehicleYear).toBe(2020)
    expect(out.vehicleColor?.toLowerCase()).toBe('prata')
    expect(out.serviceLines.map((s) => s.title)).toEqual(
      expect.arrayContaining(['Reforma de bancos dianteiros', 'Higienizacao interna']),
    )
    expect(out.partLines?.map((p) => p.description)).toEqual(
      expect.arrayContaining(['Courvin preto', 'Espuma densidade 45']),
    )
    expect(out.operationalNotes).toEqual([])
    expect(out.personalDataDetected).toBe(true)
    expect(out.financialDataDetected).toBe(true)
    expect(out.removedCategories).toEqual(
      expect.arrayContaining([
        'cpf_cnpj',
        'phone',
        'customer_name',
        'pricing',
        'payment_terms',
        'discount',
        'totals',
      ]),
    )
  })

  it('interpreta OS Bravo realista sanitizada com múltiplos serviços/peças', () => {
    const out = interpretBravoDeterministic({
      text: BRAVO_OS_SANITIZED_TEXT,
      fileName: 'bravo-os-realista.pdf',
    })
    expect(out.documentNumber).toBe('7452')
    expect(out.osNumber).toBe('7452')
    expect(out.licensePlate).toBe('AWW2C00')
    expect(out.modelVersion).toBeUndefined()
    expect(out.vehicleDescription).toMatch(/GOL GTI 2000/i)
    expect(out.clientName).toBe('DENILSON DE FRETAS GTI')
    expect(out.vehicleYear).toBe(1993)
    expect(out.vehicleColor).toBe('PRETA')
    expect(out.issuedAt).toBe('2026-01-15')
    expect(out.entryAt).toBe('2026-01-26')
    expect(out.receivedAt).toBe('2026-01-26')

    const services = out.serviceLines.map((s) => s.title)
    const parts = (out.partLines ?? []).map((p) => p.description)
    expect(services).toEqual(expect.arrayContaining(BRAVO_EXPECTED_SERVICE_SAMPLES))
    expect(parts).toEqual(expect.arrayContaining(BRAVO_EXPECTED_PART_SAMPLES))
    expect(out.operationalNotes).toEqual([])
    expect(out.suggestedEsteiraTitle).toBe('7452')

    const serialized = JSON.stringify({
      services,
      parts,
      notes: out.operationalNotes,
    }).toLowerCase()
    expect(serialized.includes('producer')).toBe(false)
    expect(serialized.includes('creationdate')).toBe(false)
    expect(serialized.includes('bravo tapeçaria fone')).toBe(false)
    expect(serialized.includes('contato@')).toBe(false)
    expect(serialized.includes('fone:')).toBe(false)
    expect(serialized.includes('cel:')).toBe(false)
    expect(serialized.includes('rua josé')).toBe(false)
    expect(serialized.includes('dados do veículo')).toBe(false)
    expect(serialized.includes('peças do pedido')).toBe(false)
    expect(serialized.includes('serviços do pedido')).toBe(false)
    expect(serialized.includes('cpf/cnpj')).toBe(false)
    expect(serialized.includes('e-mail')).toBe(false)
    expect(serialized.includes('cpf')).toBe(false)
    expect(serialized.includes('telefone')).toBe(false)
    expect(serialized.includes('e-mail')).toBe(false)
    expect(serialized.includes('endereço')).toBe(false)
    expect(serialized.includes('r$')).toBe(false)
    expect(serialized.includes('subtotal')).toBe(false)
    expect(serialized.includes('desconto')).toBe(false)
    expect(serialized.includes('pagamento')).toBe(false)
    expect(serialized.includes('30497')).toBe(false)
    expect(serialized.includes('5502')).toBe(false)
    expect(serialized.includes('1246')).toBe(false)
    expect(serialized.includes('0,00')).toBe(false)
    expect(serialized.includes('total')).toBe(false)
    expect(serialized.includes('valor unit')).toBe(false)
    expect(serialized.includes('valor total')).toBe(false)
    expect(serialized.includes('recebido')).toBe(false)
    expect(serialized.includes('troco')).toBe(false)
    expect(serialized.includes('cnpj')).toBe(false)
    expect(serialized.includes('denilson')).toBe(false)
    expect(serialized.includes('un @')).toBe(false)
    expect(serialized.includes('1,000')).toBe(false)
    expect(serialized.includes('342')).toBe(false)
    expect(serialized.includes('341')).toBe(false)
    expect(serialized.includes('401')).toBe(false)
    expect(serialized.includes('402')).toBe(false)
    expect(serialized.includes('16816,36')).toBe(false)
    expect(serialized.includes('13681,15')).toBe(false)
    expect(serialized.includes('5502,75')).toBe(false)
    expect(serialized.includes('825,00')).toBe(false)

    expect(out.personalDataDetected).toBe(true)
    expect(out.financialDataDetected).toBe(true)
    expect(out.removedCategories).toEqual(
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

