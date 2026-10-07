/**
 * Inventário programático das marcações `[IMAGEM SUGERIDA: ...]` do manual canônico.
 * Fonte: docs/manual/source/MANUAL_USUARIO_SGP.md (somente leitura).
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
export const repoRoot = path.resolve(__dirname, '../../..')
export const manualPath = path.join(repoRoot, 'docs/manual/source/MANUAL_USUARIO_SGP.md')

const MARKER_RE = /\[IMAGEM SUGERIDA:\s*(.+?)\]\s*$/

/** @returns {Promise<Array<{seq:number, chapterNumber:number, chapter:string, section:string, line:number, marker:string, text:string}>>} */
export async function readManualMarkers() {
  const src = await readFile(manualPath, 'utf8')
  const lines = src.split(/\r?\n/)
  let chapter = ''
  let section = ''
  const out = []
  lines.forEach((raw, idx) => {
    if (/^# /.test(raw)) {
      chapter = raw.replace(/^# /, '').trim()
      section = ''
    } else if (/^## /.test(raw)) {
      section = raw.replace(/^## /, '').trim()
    }
    if (!raw.includes('IMAGEM SUGERIDA')) return
    const m = raw.trim().match(MARKER_RE)
    out.push({
      seq: out.length + 1,
      chapterNumber: Number.parseInt(chapter, 10) || 0,
      chapter,
      section,
      line: idx + 1,
      marker: raw.trim(),
      text: m ? m[1].trim() : raw.trim(),
    })
  })
  return out
}
