import { describe, expect, it } from 'vitest'
import {
  daysSinceLastEntryVsReference,
  formatMinutesToHoursLabel,
  formatPercentLabel,
  getCollaboratorHealthRiskLabel,
  getCollaboratorHealthSignalLabel,
  getCollaboratorHealthStatusLabel,
} from './collaboratorOperationalHealthDisplay'

describe('collaboratorOperationalHealthDisplay', () => {
  it('formatMinutesToHoursLabel', () => {
    expect(formatMinutesToHoursLabel(0)).toBe('0h')
    expect(formatMinutesToHoursLabel(60)).toBe('1h')
    expect(formatMinutesToHoursLabel(90)).toBe('1h30')
    expect(formatMinutesToHoursLabel(480)).toBe('8h')
  })

  it('formatPercentLabel', () => {
    expect(formatPercentLabel(0)).toBe('0%')
    expect(formatPercentLabel(85)).toBe('85%')
    expect(formatPercentLabel(999)).toBe('999%+')
    expect(formatPercentLabel(1200)).toBe('999%+')
  })

  it('getCollaboratorHealthStatusLabel', () => {
    expect(getCollaboratorHealthStatusLabel('healthy')).toBe('Saudável')
    expect(getCollaboratorHealthStatusLabel('attention')).toBe('Atenção')
    expect(getCollaboratorHealthStatusLabel('critical')).toBe('Crítico')
    expect(getCollaboratorHealthStatusLabel('unknown')).toBe('Sem dados suficientes')
  })

  it('getCollaboratorHealthRiskLabel', () => {
    expect(getCollaboratorHealthRiskLabel('low')).toBe('Baixo')
    expect(getCollaboratorHealthRiskLabel('medium')).toBe('Médio')
    expect(getCollaboratorHealthRiskLabel('high')).toBe('Alto')
    expect(getCollaboratorHealthRiskLabel('critical')).toBe('Crítico')
    expect(getCollaboratorHealthRiskLabel('unknown')).toBe('Indefinido')
  })

  it('getCollaboratorHealthSignalLabel mapeamentos mínimos', () => {
    expect(getCollaboratorHealthSignalLabel('LOW_OCCUPATION')).toBe('Baixa ocupação')
    expect(getCollaboratorHealthSignalLabel('NO_OPEN_ASSIGNMENTS')).toBe('Sem etapas abertas')
    expect(getCollaboratorHealthSignalLabel('TEAM_ASSIGNMENTS_INCLUDED')).toBe('Carga via time')
    expect(getCollaboratorHealthSignalLabel('PENDING_OVER_WINDOW_CAPACITY')).toBe(
      'Pendência acima da capacidade da janela',
    )
  })

  it('daysSinceLastEntryVsReference', () => {
    expect(daysSinceLastEntryVsReference('2026-05-03', '2026-05-01T12:00:00.000Z')).toBe(2)
    expect(daysSinceLastEntryVsReference('2026-05-03', null)).toBeNull()
  })
})
