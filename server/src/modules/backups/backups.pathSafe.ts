import { createHash } from 'node:crypto'
import {
  createReadStream,
  existsSync,
  lstatSync,
  realpathSync,
  statSync,
} from 'node:fs'
import { basename, join, resolve, sep } from 'node:path'
import { AppError } from '../../shared/errors/AppError.js'
import { ErrorCodes } from '../../shared/errors/errorCodes.js'

/** Nome de segmento WAL PostgreSQL (24 hex) ou timeline history. */
export const WAL_SEGMENT_NAME_RE = /^(?:[0-9A-F]{24}|[0-9A-F]{8}\.history)$/i

export function sanitizeLogicalFileName(name: string): string {
  const base = basename(name).replace(/[^a-zA-Z0-9._-]/g, '_')
  if (!base || base === '.' || base === '..') {
    throw new AppError(
      'Nome de arquivo inválido.',
      400,
      ErrorCodes.VALIDATION_ERROR,
    )
  }
  return base
}

export function buildFullLogicalFileName(
  prefix: string,
  environment: string,
  at: Date = new Date(),
): string {
  const safePrefix = sanitizeLogicalFileName(prefix || 'sgp')
  const safeEnv = sanitizeLogicalFileName(environment || 'unknown')
  const y = at.getUTCFullYear()
  const m = String(at.getUTCMonth() + 1).padStart(2, '0')
  const d = String(at.getUTCDate()).padStart(2, '0')
  const hh = String(at.getUTCHours()).padStart(2, '0')
  const mm = String(at.getUTCMinutes()).padStart(2, '0')
  const ss = String(at.getUTCSeconds()).padStart(2, '0')
  return `${safePrefix}_${safeEnv}_FULL_${y}-${m}-${d}_${hh}${mm}${ss}.dump`
}

/**
 * Resolve path absoluto e garante que está confinado sob `rootDir`
 * (bloqueia path traversal e symlink escape).
 */
export function resolvePathInsideRoot(
  rootDir: string,
  relativeOrName: string,
): string {
  if (!rootDir.trim()) {
    throw new AppError(
      'Diretório de backup não configurado.',
      503,
      ErrorCodes.SERVICE_UNAVAILABLE,
    )
  }
  const rootReal = realpathSync(resolve(rootDir))
  const candidate = resolve(rootReal, relativeOrName)
  let finalPath: string
  try {
    if (existsSync(candidate)) {
      const st = lstatSync(candidate)
      if (st.isSymbolicLink()) {
        throw new AppError(
          'Arquivo de backup inválido.',
          400,
          ErrorCodes.VALIDATION_ERROR,
        )
      }
      finalPath = realpathSync(candidate)
    } else {
      finalPath = candidate
    }
  } catch (e) {
    if (e instanceof AppError) throw e
    throw new AppError(
      'Arquivo de backup inválido.',
      400,
      ErrorCodes.VALIDATION_ERROR,
    )
  }
  const prefix = rootReal.endsWith(sep) ? rootReal : rootReal + sep
  if (finalPath !== rootReal && !finalPath.startsWith(prefix)) {
    throw new AppError(
      'Arquivo de backup fora do diretório permitido.',
      400,
      ErrorCodes.VALIDATION_ERROR,
    )
  }
  return finalPath
}

/** storage_key relativo interno — nunca expor path absoluto na API. */
export function toRelativeStorageKey(fileName: string): string {
  return sanitizeLogicalFileName(fileName)
}

export function absoluteFromStorageKey(
  rootDir: string,
  storageKey: string,
): string {
  const safe = sanitizeLogicalFileName(storageKey)
  if (safe.includes('..') || safe.includes(sep) || safe.includes('/')) {
    throw new AppError(
      'Chave de armazenamento inválida.',
      400,
      ErrorCodes.VALIDATION_ERROR,
    )
  }
  return resolvePathInsideRoot(rootDir, safe)
}

export function assertFileInsideRoot(rootDir: string, absolutePath: string): void {
  const rootReal = realpathSync(resolve(rootDir))
  let fileReal: string
  try {
    const st = lstatSync(absolutePath)
    if (st.isSymbolicLink()) {
      throw new AppError(
        'Arquivo de backup inválido.',
        400,
        ErrorCodes.VALIDATION_ERROR,
      )
    }
    fileReal = realpathSync(absolutePath)
  } catch (e) {
    if (e instanceof AppError) throw e
    throw new AppError('Arquivo de backup não encontrado.', 404, ErrorCodes.NOT_FOUND)
  }
  const prefix = rootReal.endsWith(sep) ? rootReal : rootReal + sep
  if (fileReal !== rootReal && !fileReal.startsWith(prefix)) {
    throw new AppError(
      'Arquivo de backup fora do diretório permitido.',
      400,
      ErrorCodes.VALIDATION_ERROR,
    )
  }
}

export function isValidWalSegmentName(name: string): boolean {
  const base = basename(name)
  if (base !== name || base.includes('..') || base.includes('/') || base.includes('\\')) {
    return false
  }
  return WAL_SEGMENT_NAME_RE.test(base)
}

export async function sha256File(absolutePath: string): Promise<string> {
  return new Promise((resolveHash, reject) => {
    const hash = createHash('sha256')
    const stream = createReadStream(absolutePath)
    stream.on('data', (chunk) => hash.update(chunk))
    stream.on('error', reject)
    stream.on('end', () => resolveHash(hash.digest('hex')))
  })
}

export function fileSizeBytes(absolutePath: string): number {
  return statSync(absolutePath).size
}

export function joinUnderRoot(rootDir: string, fileName: string): string {
  return join(resolve(rootDir), sanitizeLogicalFileName(fileName))
}
