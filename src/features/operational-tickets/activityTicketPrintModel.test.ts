import { describe, expect, it } from 'vitest'
import {
  buildActivityTicketPrintModel,
  buildShortStepCode,
  formatMinutes,
  formatTicketDate,
  formatTicketDateTime,
} from './activityTicketPrintModel'

const baseInput = {
  conveyorId: 'conv-1',
  conveyorTitle: 'OS 7452',
  conveyorVehicleRef: 'Gol 1994',
  activityNodeId: 'node-abc-8f42',
  activityTitle: 'Costurar lateral banco dianteiro',
  taskTitle: 'Bancos dianteiros',
  sectorTitle: 'Costura',
  plannedDate: '2026-05-18',
  plannedOrder: 2,
  plannedMinutes: 120,
  realizedMinutes: 45,
  activityOperationalStatus: 'IN_PROGRESS',
  responsibleName: 'Marcio',
  teamName: 'Tapeçaria',
} as const

describe('activityTicketPrintModel', () => {
  it('monta ticket com campos principais', () => {
    const model = buildActivityTicketPrintModel(baseInput, {
      printedAt: '2026-05-18T16:20:00.000Z',
    })

    expect(model.conveyorTitle).toBe('OS 7452')
    expect(model.conveyorVehicleRef).toBe('Gol 1994')
    expect(model.activityTitle).toBe('Costurar lateral banco dianteiro')
    expect(model.taskTitle).toBe('Bancos dianteiros')
    expect(model.sectorTitle).toBe('Costura')
    expect(model.plannedDate).toBe('18/05/2026')
    expect(model.plannedOrder).toBe(3)
    expect(model.plannedMinutes).toBe(120)
    expect(model.realizedMinutes).toBe(45)
    expect(model.pendingMinutes).toBe(75)
    expect(model.operationalStatusLabel).toBe('Em andamento')
    expect(model.responsibleName).toBe('Marcio')
    expect(model.teamName).toBe('Tapeçaria')
    expect(model.shortCode).toBe(buildShortStepCode('node-abc-8f42'))
    expect(formatTicketDateTime(model.printedAt)).toMatch(/18\/05\/2026/)
  })

  it('tolera ausência de responsável', () => {
    const model = buildActivityTicketPrintModel({
      ...baseInput,
      responsibleName: null,
    })
    expect(model.responsibleName).toBeUndefined()
  })

  it('tolera ausência de equipe', () => {
    const model = buildActivityTicketPrintModel({
      ...baseInput,
      teamName: undefined,
    })
    expect(model.teamName).toBeUndefined()
  })

  it('tolera realizedMinutes ausente', () => {
    const model = buildActivityTicketPrintModel({
      ...baseInput,
      realizedMinutes: undefined,
    })
    expect(model.realizedMinutes).toBeUndefined()
    expect(model.pendingMinutes).toBeUndefined()
  })

  it('calcula pendente quando planned e realized existem', () => {
    const model = buildActivityTicketPrintModel({
      ...baseInput,
      plannedMinutes: 90,
      realizedMinutes: 30,
    })
    expect(model.pendingMinutes).toBe(60)
  })

  it('não deixa pendente negativo quando realizado excede planejado', () => {
    const model = buildActivityTicketPrintModel({
      ...baseInput,
      plannedMinutes: 60,
      realizedMinutes: 90,
    })
    expect(model.pendingMinutes).toBe(0)
  })

  it('gera shortCode previsível', () => {
    expect(buildShortStepCode('node-abc-8f42')).toBe('STEP-8F42')
    expect(buildShortStepCode('x')).toBe('STEP-000X')
  })

  it('formata minutos', () => {
    expect(formatMinutes(120)).toBe('120 min')
    expect(formatMinutes(0)).toBe('0 min')
  })

  it('formata data ISO', () => {
    expect(formatTicketDate('2026-05-18')).toBe('18/05/2026')
  })

  it('não propaga campos proibidos do objeto de entrada', () => {
    const polluted = {
      ...baseInput,
      notes: 'Observação com CPF 123.456.789-00',
      clientName: 'Cliente Secreto',
      cpf: '123.456.789-00',
      email: 'teste@exemplo.com',
      phone: '(11) 99999-9999',
      price: 1500,
      parts: ['Peça A'],
      rawPayload: { nested: true },
    }

    const model = buildActivityTicketPrintModel(polluted)
    const serialized = JSON.stringify(model)

    expect(serialized).not.toContain('123.456.789-00')
    expect(serialized).not.toContain('teste@exemplo.com')
    expect(serialized).not.toContain('Cliente Secreto')
    expect(serialized).not.toContain('Peça A')
    expect(serialized).not.toContain('"price"')
    expect(serialized).not.toContain('nested')
    expect(model).not.toHaveProperty('notes')
    expect(model).not.toHaveProperty('clientName')
    expect(model).not.toHaveProperty('price')
    expect(model).not.toHaveProperty('parts')
  })

  it('não propaga financeiro em texto livre permitido', () => {
    const model = buildActivityTicketPrintModel({
      ...baseInput,
      conveyorTitle: 'OS 7452',
      activityTitle: 'Atividade segura',
    })
    expect(JSON.stringify(model)).not.toMatch(/pagamento|desconto|recebido|total/i)
  })

  it('não usa observações brutas da OS no ticket', () => {
    const model = buildActivityTicketPrintModel({
      ...baseInput,
      notes: 'Endereço Rua X — valor R$ 500',
    } as typeof baseInput & { notes: string })
    expect(JSON.stringify(model)).not.toContain('Endereço')
    expect(JSON.stringify(model)).not.toContain('R$')
  })
})
