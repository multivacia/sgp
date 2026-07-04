import type { CreateConveyorDados } from '../../domain/conveyors/conveyor.types'
import { parseFlexibleDeadlineToDate } from '../../lib/backlog/operationalBuckets'

export type WizardExtras = {
  inicioPrevisto: string
  fimPrevisto: string
}

const PLANEAMENTO_TEMPO_LINE_RE =
  /\[Planeamento\]\s*Tempo total previsto:\s*\d+\s*min/gi

const WIZARD_INICIO_RE = /In[ií]cio previsto:\s*(.+?)(?:\s*[·•|]\s*|$)/i
const WIZARD_FIM_RE = /Fim previsto:\s*(.+)$/i

export function formatPrazoDateTimeForDisplay(value: string | null | undefined): string | null {
  const trimmed = (value ?? '').trim()
  if (!trimmed) return null

  const parsed = parseFlexibleDeadlineToDate(trimmed)
  if (parsed) {
    return parsed.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const local = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(trimmed)
  if (local) {
    const d = new Date(
      Number(local[1]),
      Number(local[2]) - 1,
      Number(local[3]),
      Number(local[4]),
      Number(local[5]),
    )
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    }
  }

  return trimmed
}

function parseWizardPrazoRawParts(prazo: string): { inicio: string | null; fim: string | null } {
  const inicio = prazo.match(WIZARD_INICIO_RE)?.[1]?.trim() ?? null
  const fim = prazo.match(WIZARD_FIM_RE)?.[1]?.trim() ?? null
  return { inicio, fim }
}

export function stripWizardPlanningFromObservacoes(observacoes: string): string {
  return observacoes
    .replace(PLANEAMENTO_TEMPO_LINE_RE, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function parseWizardExtrasFromPersisted(
  dados: Pick<CreateConveyorDados, 'prazoEstimado' | 'observacoes'>,
): WizardExtras {
  const prazo = dados.prazoEstimado ?? ''
  const { inicio, fim } = parseWizardPrazoRawParts(prazo)
  return {
    inicioPrevisto: inicio ?? '',
    fimPrevisto: fim ?? '',
  }
}

export function buildDadosParaApi(
  dados: CreateConveyorDados,
  extras: WizardExtras,
): CreateConveyorDados {
  const prazoPartes: string[] = []
  if (extras.inicioPrevisto.trim()) {
    prazoPartes.push(`Início previsto: ${extras.inicioPrevisto.trim()}`)
  }
  if (extras.fimPrevisto.trim()) {
    prazoPartes.push(`Fim previsto: ${extras.fimPrevisto.trim()}`)
  }
  const prazoEstimado = prazoPartes.length > 0 ? prazoPartes.join(' · ') : dados.prazoEstimado

  const observacoes = stripWizardPlanningFromObservacoes(dados.observacoes ?? '')
  return { ...dados, prazoEstimado, observacoes }
}

export type WizardPrazoDisplay = {
  inicioPrevisto: string | null
  fimPrevisto: string | null
  prazoLegado: string | null
}

export function parseWizardPrazoForDisplay(
  prazoEstimado: string | null | undefined,
): WizardPrazoDisplay {
  const prazo = (prazoEstimado ?? '').trim()
  if (!prazo) {
    return { inicioPrevisto: null, fimPrevisto: null, prazoLegado: null }
  }

  const { inicio, fim } = parseWizardPrazoRawParts(prazo)
  if (inicio || fim) {
    return {
      inicioPrevisto: inicio ? formatPrazoDateTimeForDisplay(inicio) : null,
      fimPrevisto: fim ? formatPrazoDateTimeForDisplay(fim) : null,
      prazoLegado: null,
    }
  }

  const legacyDate = formatPrazoDateTimeForDisplay(prazo)
  if (legacyDate && legacyDate !== prazo) {
    return { inicioPrevisto: null, fimPrevisto: legacyDate, prazoLegado: null }
  }

  return { inicioPrevisto: null, fimPrevisto: null, prazoLegado: prazo }
}

export function extractWizardTempoTotalPrevistoMin(
  observacoes: string | null | undefined,
): number | null {
  const match = (observacoes ?? '').match(
    /\[Planeamento\]\s*Tempo total previsto:\s*(\d+)\s*min/i,
  )
  return match ? Number(match[1]) : null
}

export function displayUsuarioObservacoes(observacoes: string | null | undefined): string {
  return stripWizardPlanningFromObservacoes(observacoes ?? '')
}
