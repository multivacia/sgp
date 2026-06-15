import { appendFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const LOG_DIR = join(process.cwd(), 'logs')
const LOG_FILE = join(LOG_DIR, 'sgp-print-agent.log')

function ensureLogDir(): void {
  if (!existsSync(LOG_DIR)) mkdirSync(LOG_DIR, { recursive: true })
}

function write(level: string, message: string, meta?: Record<string, unknown>): void {
  ensureLogDir()
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    message,
    ...meta,
  })
  appendFileSync(LOG_FILE, `${line}\n`, 'utf8')
  const prefix = `[sgp-print-agent] ${level.toUpperCase()}`
  if (level === 'error') console.error(prefix, message, meta ?? '')
  else console.log(prefix, message, meta ?? '')
}

export const logger = {
  info: (message: string, meta?: Record<string, unknown>) => write('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => write('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>) => write('error', message, meta),
}
