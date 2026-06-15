import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { z } from 'zod'
import type { AgentConfig } from './types.js'

const configSchema = z.object({
  port: z.number().int().min(1).max(65535).default(8765),
  printerName: z.string().min(1),
  paperWidthMm: z.number().int().min(58).max(120).default(80),
  charsPerLine: z.number().int().min(32).max(64).default(42),
  cutMode: z.enum(['partial', 'full']).default('partial'),
  authToken: z.string().min(8),
  allowedOrigins: z.array(z.string().min(1)).min(1),
  mockPrinter: z.boolean().default(false),
})

const CONFIG_FILENAMES = [
  'sgp-print-agent.config.json',
  'sgp-print-agent.config.local.json',
]

export function resolveConfigPath(): string | null {
  for (const name of CONFIG_FILENAMES) {
    const path = resolve(process.cwd(), name)
    if (existsSync(path)) return path
  }
  return null
}

export function loadConfig(): AgentConfig {
  const path = resolveConfigPath()
  if (!path) {
    throw new Error(
      'Arquivo sgp-print-agent.config.json não encontrado. Copie sgp-print-agent.config.example.json.',
    )
  }

  const raw = JSON.parse(readFileSync(path, 'utf8')) as unknown
  return configSchema.parse(raw)
}
