import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { platform } from 'node:os'
import type { AgentConfig, ActivityTicketPayload, CutMode } from '../types.js'
import { logger } from '../logger.js'
import { formatActivityTicketLines } from './formatTicket.js'
import { buildEscPosBuffer } from './escpos.js'

const SCRIPT_PATH = join(dirname(fileURLToPath(import.meta.url)), '../../scripts/raw-print.ps1')

export async function printActivityTicket(
  config: AgentConfig,
  ticket: ActivityTicketPayload,
): Promise<void> {
  const lines = formatActivityTicketLines(ticket, config.charsPerLine)
  const buffer = buildEscPosBuffer(lines, config.cutMode)

  if (config.mockPrinter) {
    logger.info('Mock print ticket', {
      printerName: config.printerName,
      shortCode: ticket.shortCode,
      bytes: buffer.length,
    })
    return
  }

  if (platform() !== 'win32') {
    throw new Error('Impressao RAW suportada apenas no Windows neste MVP')
  }

  await sendRawToWindowsPrinter(config.printerName, buffer)
  logger.info('Ticket impresso', {
    printerName: config.printerName,
    activityNodeId: ticket.activityNodeId,
    shortCode: ticket.shortCode,
  })
}

function sendRawToWindowsPrinter(printerName: string, data: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'powershell',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', SCRIPT_PATH, '-PrinterName', printerName],
      { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true },
    )

    let stderr = ''
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8')
    })

    child.on('error', (err) => reject(err))
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(stderr.trim() || `raw-print.ps1 exit code ${code}`))
    })

    child.stdin.write(data)
    child.stdin.end()
  })
}

export function describeCutMode(cutMode: CutMode): string {
  return cutMode === 'partial' ? 'corte parcial' : 'corte total'
}
