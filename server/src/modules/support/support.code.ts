import type { SupportTicketSeverity } from './support.types.js'

export function mapBlockingToSeverity(isBlocking: boolean): SupportTicketSeverity {
  return isBlocking ? 'HIGH' : 'MEDIUM'
}

export function buildSupportTicketCode(now = new Date()): string {
  const year = now.getUTCFullYear().toString()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const day = String(now.getUTCDate()).padStart(2, '0')
  const hh = String(now.getUTCHours()).padStart(2, '0')
  const mm = String(now.getUTCMinutes()).padStart(2, '0')
  const ss = String(now.getUTCSeconds()).padStart(2, '0')
  const rand = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0')
  return `CHM-${year}${month}${day}-${hh}${mm}${ss}${rand}`
}
