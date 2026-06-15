import type { ActivityTicketPayload } from '../types.js'

function formatMinutes(minutes: number): string {
  return `${Math.max(0, Math.floor(minutes))} min`
}

function formatPlannedOrder(order: number | undefined): string | undefined {
  if (order == null || !Number.isFinite(order)) return undefined
  return String(Math.max(1, Math.floor(order))).padStart(2, '0')
}

function formatPrintedAt(iso: string): string {
  const dt = new Date(iso)
  if (Number.isNaN(dt.getTime())) return iso
  return dt.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function wrapLine(text: string, width: number): string[] {
  const words = text.split(/\s+/)
  const lines: string[] = []
  let current = ''

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (candidate.length <= width) {
      current = candidate
      continue
    }
    if (current) lines.push(current)
    if (word.length > width) {
      for (let i = 0; i < word.length; i += width) {
        lines.push(word.slice(i, i + width))
      }
      current = ''
    } else {
      current = word
    }
  }
  if (current) lines.push(current)
  return lines.length > 0 ? lines : ['']
}

function pushWrapped(lines: string[], prefix: string, value: string, width: number): void {
  const full = `${prefix}${value}`
  const wrapped = wrapLine(full, width)
  lines.push(...wrapped)
}

export function formatActivityTicketLines(
  ticket: ActivityTicketPayload,
  charsPerLine: number,
): string[] {
  const width = charsPerLine
  const lines: string[] = []
  const areaLabel = ticket.areaTitle ?? ticket.sectorTitle
  const orderLabel = formatPlannedOrder(ticket.plannedOrder)

  if (ticket.groupHeaderLabel) {
    lines.push('--------------------------------')
    const headerWrapped = wrapLine(ticket.groupHeaderLabel.toUpperCase(), width)
    lines.push(...headerWrapped)
    lines.push('--------------------------------')
  }

  lines.push(centerText('SGP+ ATIVIDADE', width))
  lines.push(dashedRule(width))

  const conveyorLine = ticket.conveyorCode
    ? `Esteira: ${ticket.conveyorTitle} (${ticket.conveyorCode})`
    : `Esteira: ${ticket.conveyorTitle}`
  lines.push(...wrapLine(conveyorLine, width))

  if (ticket.conveyorVehicleRef) {
    pushWrapped(lines, 'Veiculo/Ref.: ', ticket.conveyorVehicleRef, width)
  }

  lines.push('')
  lines.push('ATIVIDADE')
  lines.push(...wrapLine(ticket.activityTitle, width))

  if (ticket.taskTitle) pushWrapped(lines, 'Tarefa: ', ticket.taskTitle, width)
  if (areaLabel) pushWrapped(lines, 'Area: ', areaLabel, width)
  if (ticket.plannedDate) pushWrapped(lines, 'Planejado: ', ticket.plannedDate, width)
  if (orderLabel) lines.push(`Ordem: ${orderLabel}`)
  if (ticket.plannedMinutes != null) {
    lines.push(`Tempo: ${formatMinutes(ticket.plannedMinutes)}`)
  }

  if (ticket.responsibleName) pushWrapped(lines, 'Resp.: ', ticket.responsibleName, width)
  if (ticket.teamName) pushWrapped(lines, 'Equipe: ', ticket.teamName, width)

  if (ticket.operationalStatusLabel) {
    pushWrapped(lines, 'Status: ', ticket.operationalStatusLabel, width)
  }
  if (ticket.realizedMinutes != null) {
    lines.push(`Realizado: ${formatMinutes(ticket.realizedMinutes)}`)
  }
  if (ticket.pendingMinutes != null) {
    lines.push(`Pendente: ${formatMinutes(ticket.pendingMinutes)}`)
  }

  lines.push('')
  lines.push('Obs:')
  lines.push('_'.repeat(Math.min(width, 32)))
  lines.push('_'.repeat(Math.min(width, 32)))
  lines.push('')
  lines.push(centerText(ticket.shortCode, width))
  lines.push(centerText(`Impresso em: ${formatPrintedAt(ticket.printedAt)}`, width))
  lines.push('')
  lines.push(centerText('Apoio operacional.', width))
  lines.push(centerText('Status oficial no SGP+.', width))
  lines.push(dashedRule(width))

  return lines
}

export function centerText(text: string, width: number): string {
  if (text.length >= width) return text
  const pad = Math.floor((width - text.length) / 2)
  return `${' '.repeat(Math.max(0, pad))}${text}`
}

export function dashedRule(width: number): string {
  return '-'.repeat(Math.min(width, 32))
}

export function buildTestTicket(): ActivityTicketPayload {
  return {
    conveyorTitle: 'OS TESTE SGP+',
    conveyorCode: 'TEST-001',
    conveyorVehicleRef: 'Veiculo demonstracao',
    activityNodeId: 'step-test-0001',
    activityTitle: 'Atividade de teste do agente local',
    taskTitle: 'Tarefa teste',
    sectorTitle: 'CORTE',
    plannedMinutes: 30,
    responsibleName: 'Operador teste',
    shortCode: 'STEP-0001',
    printedAt: new Date().toISOString(),
    operationalStatusLabel: 'Pendente',
  }
}
