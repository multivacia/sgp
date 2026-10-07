/**
 * Renderização local de planilhas REAIS (geradas pelos builders do backend) para PNG:
 * LibreOffice headless (uma página por aba, "SinglePageSheets") → PDF → pdftoppm.
 * Não é o Excel: a imagem é uma renderização fiel do arquivo .xlsx por ferramenta local.
 */
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, readdir } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

export function xlsxRenderAvailable() {
  try {
    execFileSync('soffice', ['--version'], { stdio: 'ignore' })
    execFileSync('pdftoppm', ['-v'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

/** Devolve um Buffer PNG por aba (na ordem do arquivo). */
export async function renderXlsxSheets(xlsxPath, { dpi = 110 } = {}) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'sgp-xlsx-'))
  execFileSync(
    'soffice',
    ['--headless', '--convert-to', 'pdf:calc_pdf_Export:{"SinglePageSheets":{"type":"boolean","value":"true"}}', '--outdir', dir, xlsxPath],
    { stdio: 'ignore', timeout: 180000, env: { ...process.env, HOME: dir } },
  )
  const pdf = path.join(dir, `${path.basename(xlsxPath, '.xlsx')}.pdf`)
  if (!existsSync(pdf)) throw new Error(`LibreOffice não gerou PDF para ${xlsxPath}`)
  execFileSync('pdftoppm', ['-png', '-r', String(dpi), pdf, path.join(dir, 'sheet')])
  const pngs = (await readdir(dir)).filter((f) => f.startsWith('sheet') && f.endsWith('.png')).sort()
  return Promise.all(pngs.map((f) => readFile(path.join(dir, f))))
}
