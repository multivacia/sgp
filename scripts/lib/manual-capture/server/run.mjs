/**
 * Executa scripts-ponte (TypeScript) que reaproveitam código REAL do backend sem banco,
 * via `tsx` do workspace `server/` (instalado efemeramente com `npm ci` em server/).
 */
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { repoRoot } from '../inventory.mjs'

const TSX = path.join(repoRoot, 'server/node_modules/.bin/tsx')
const cache = new Map()

export function serverToolingAvailable() {
  return existsSync(TSX)
}

/** Roda `server/<name>.ts` e devolve stdout (JSON parseado quando `json`). */
export function runServerBridge(name, args = [], { json = true } = {}) {
  const key = `${name}|${args.join('|')}`
  if (!cache.has(key)) {
    if (!serverToolingAvailable()) {
      throw new Error('server/node_modules ausente — rode `npm ci` em server/ (efêmero) para gerar este payload.')
    }
    const out = execFileSync(TSX, [path.join(repoRoot, 'scripts/lib/manual-capture/server', `${name}.ts`), ...args], {
      cwd: repoRoot,
      encoding: 'utf8',
      env: { ...process.env, TZ: 'America/Sao_Paulo' },
      maxBuffer: 32 * 1024 * 1024,
    })
    cache.set(key, json ? JSON.parse(out) : out)
  }
  return cache.get(key)
}
