import { describe, expect, it } from 'vitest'
import {
  isBravoClientLabelOnlyLine,
  parseBravoBasicFields,
  parseBravoBasicFieldsWithDiagnostics,
  sanitizeBravoClientDisplayName,
} from '../modules/argos-integration/pipeline/parseBravoBasicFields.js'
import { sanitizeBravoDebugLine } from '../modules/argos-integration/pipeline/bravoDebugSanitize.js'

describe('sanitizeBravoDebugLine (TD10.3)', () => {
  it('mascara PII e preserva rótulos/valores financeiros', () => {
    const input =
      'Placa: AWW2C00 Modelo: GOL GTI 2000 Ano: 1993 Cor: PRETA Tel. 19999110876 CPF/CNPJ: 258.407.588-17 E-Mail: x@y.com Total R$ 30497,51 Chassi: 9BWZZZ377VT161962'
    const out = sanitizeBravoDebugLine(input)
    expect(out).toContain('Placa: [PLATE]')
    expect(out).toContain('Modelo: GOL GTI 2000')
    expect(out).toContain('Ano: 1993')
    expect(out).toContain('Cor: PRETA')
    expect(out).toContain('Total R$ 30497,51')
    expect(out).toContain('[PHONE]')
    expect(out).toContain('[CPF_CNPJ]')
    expect(out).toContain('[EMAIL]')
    expect(out).toContain('[VIN]')
    expect(out).not.toContain('AWW2C00')
    expect(out).not.toContain('258.407.588-17')
    expect(out).not.toContain('19999110876')
    expect(out).not.toContain('x@y.com')
    expect(out).not.toContain('9BWZZZ377VT161962')
  })
})

describe('sanitizeBravoClientDisplayName (R6 / TD10.6 — CPF colado)', () => {
  it('corta antes de \\d{3}.\\d{3} (colado em letra ou com espaço)', () => {
    expect(sanitizeBravoClientDisplayName('DENILSON DE FRETAS GTI258.407.588-17')).toBe(
      'DENILSON DE FRETAS GTI',
    )
    expect(sanitizeBravoClientDisplayName('DENILSON DE FRETAS GTI 258.407.588-17')).toBe(
      'DENILSON DE FRETAS GTI',
    )
    expect(sanitizeBravoClientDisplayName('CLIENTE TESTE123.456.789-00')).toBe('CLIENTE TESTE')
  })
})

describe('parseBravoBasicFields', () => {
  it('R6 — linha real com CPF colado no nome (sem gap)', () => {
    const raw = ['RG/I.E.:CPF/CNPJ:Nome:', 'DENILSON DE FRETAS GTI258.407.588-17'].join('\n')
    const b = parseBravoBasicFields(raw)
    expect(b.clientName).toBe('DENILSON DE FRETAS GTI')
    expect(b.clientName).not.toContain('258')
    expect(b.clientName).not.toContain('.407')
    expect(b.clientName).not.toMatch(/\d{3}\.\d{3}\.\d{3}-\d{2}/)
  })

  it('extrai trecho TD10.1 (rótulos em linhas separadas)', () => {
    const raw = [
      'Dados do Cliente',
      'Dados do Veículo',
      'Placa: AWW2C00 Modelo: GOL GTI 2000 Ano: 1993 Cor: PRETA',
      'Nº 7452 / Orçamento Data: 15/01/2026',
      'Entrada: 26/01/2026 00:00 Saída: KM Ent.: 0',
      'Nome: RG/I.E.: CPF/CNPJ:',
      'DENILSON DE FRETAS GTI 258.407.588-17',
    ].join('\n')

    const b = parseBravoBasicFields(raw)
    expect(b.documentNumber).toBe('7452')
    expect(b.issuedAt).toBe('2026-01-15')
    expect(b.entryAt).toBe('2026-01-26')
    expect(b.vehicleModel).toMatch(/GOL GTI 2000/i)
    expect(b.vehicleYear).toBe(1993)
    expect(b.vehicleColor).toBe('PRETA')
    expect(b.licensePlate).toBe('AWW2C00')
    expect(b.clientName).toMatch(/DENILSON/i)
    expect(b.clientName).not.toMatch(/\d{3}\.\d{3}\.\d{3}-\d{2}/)
  })

  it('TD10.6 — não aceita rótulos de grade (UF/Cep) como cliente', () => {
    const raw = [
      'Endereço:',
      'Bairro:',
      'Nome:',
      'RG/I.E.:CPF/CNPJ:Nome:',
      'UF:',
      'Cep:',
      'Cidade:',
      'Nº:',
      'E-Mail: [EMAIL] Tel. 1: Tel. 2:',
      'DENILSON DE FRETAS GTI 258.407.588-17',
      'RUA FREDERICO MAGNUSSON 76',
    ].join('\n')

    expect(isBravoClientLabelOnlyLine('UF:')).toBe(true)
    expect(isBravoClientLabelOnlyLine('Cep:')).toBe(true)

    const b = parseBravoBasicFields(raw)
    expect(b.clientName).toBe('DENILSON DE FRETAS GTI')
    expect(b.clientName).not.toMatch(/UF/i)
    expect(b.clientName).not.toMatch(/^Cep/i)
    expect(b.clientName).not.toMatch(/^Cidade/i)
    expect(b.clientName).not.toMatch(/\d{3}\.\d{3}\.\d{3}-\d{2}/)
  })

  it('TD10.4 — texto Bravo real colado/achatado', () => {
    const raw = [
      '1993GOL GTI 2000AWW2C00Modelo:PRETAAno:Cor:',
      'Placa:',
      'Nº 7452 / OrçamentoData:15/01/2026',
      'KM Ent.:026/01/2026 00:00',
      'Entrada:Saída:',
      'RG/I.E.:CPF/CNPJ:Nome:',
      'DENILSON DE FRETAS GTI 258.407.588-17',
    ].join('\n')

    const b = parseBravoBasicFields(raw)
    expect(b.documentNumber).toBe('7452')
    expect(b.issuedAt).toBe('2026-01-15')
    expect(b.entryAt).toBe('2026-01-26')
    expect(b.vehicleModel).toMatch(/GOL GTI 2000/i)
    expect(b.vehicleYear).toBe(1993)
    expect(b.vehicleColor).toBe('PRETA')
    expect(b.licensePlate).toBe('AWW2C00')
    expect(b.clientName).toMatch(/DENILSON/i)
    expect(b.clientName).not.toMatch(/\d{3}\.\d{3}\.\d{3}-\d{2}/)

    const { diagnostics } = parseBravoBasicFieldsWithDiagnostics(raw)
    expect(diagnostics.foundIssuedAt).toBe(true)
    expect(diagnostics.foundEntryAt).toBe(true)
    expect(diagnostics.foundVehicleByTabularScan).toBe(true)
    expect(diagnostics.foundLicensePlate).toBe(true)
    expect(diagnostics.foundVehicleModel).toBe(true)
    expect(diagnostics.foundVehicleYear).toBe(true)
    expect(diagnostics.foundVehicleColor).toBe(true)
    expect(diagnostics.foundClientName).toBe(true)
  })

  it('extrai campos de estrutura linearizada TD10', () => {
    const raw = [
      'Nº 7452 / Orçamento',
      'Data: 15/01/2026',
      'Entrada: 26/01/2026 00:00',
      'Dados do Veiculo',
      'Placa: AWW2C00 Modelo: GOL GTI 2000 Ano: 1993 Cor: PRETA',
      'Dados do Cliente',
      'Nome: RG/I.E.: CPF/CNPJ:',
      'DENILSON EXEMPLO SILVA',
    ].join('\n')

    const b = parseBravoBasicFields(raw)
    expect(b.documentNumber).toBe('7452')
    expect(b.issuedAt).toBe('2026-01-15')
    expect(b.entryAt).toBe('2026-01-26')
    expect(b.licensePlate).toBe('AWW2C00')
    expect(b.vehicleModel).toMatch(/GOL GTI 2000/i)
    expect(b.vehicleYear).toBe(1993)
    expect(b.vehicleColor).toBe('PRETA')
    expect(b.clientName).toMatch(/DENILSON/i)
  })
})
