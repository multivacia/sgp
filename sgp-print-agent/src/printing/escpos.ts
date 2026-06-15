import iconv from 'iconv-lite'
import type { CutMode } from '../types.js'

const ESC = 0x1b
const GS = 0x1d

export function buildEscPosBuffer(lines: string[], cutMode: CutMode): Buffer {
  const chunks: Buffer[] = []

  chunks.push(Buffer.from([ESC, 0x40]))
  chunks.push(Buffer.from([ESC, 0x74, 2]))

  for (const line of lines) {
    chunks.push(encodeCp850(line))
    chunks.push(Buffer.from('\n', 'ascii'))
  }

  chunks.push(Buffer.from('\n\n', 'ascii'))

  if (cutMode === 'partial') {
    chunks.push(Buffer.from([GS, 0x56, 0x01]))
  } else {
    chunks.push(Buffer.from([GS, 0x56, 0x00]))
  }

  return Buffer.concat(chunks)
}

function encodeCp850(text: string): Buffer {
  const normalized = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x00-\xFF]/g, '?')
  return iconv.encode(normalized, 'cp850')
}
