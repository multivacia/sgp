/**
 * Capturas auditadas do Manual do Usuário SGP+ (Playwright headless + API 100% mockada).
 *
 * Pré-requisito: frontend Vite em execução (sem backend/banco):
 *   npm run dev -- --host 127.0.0.1 --port 5174
 *
 * Uso:
 *   node scripts/capture-manual-screenshots.mjs                 # todas as capturas
 *   node scripts/capture-manual-screenshots.mjs --id cap08-03   # uma captura (repetível: --id a --id b)
 *   node scripts/capture-manual-screenshots.mjs --chapter 8     # um capítulo
 *   node scripts/capture-manual-screenshots.mjs --list          # inventário marcação → item
 *   node scripts/capture-manual-screenshots.mjs --validate      # só validações (sem navegador)
 *   node scripts/capture-manual-screenshots.mjs --base-url http://127.0.0.1:5174
 *
 * Saída: docs/manual/assets/screenshots/*.png + manifest.json
 */
import { chromium } from 'playwright'
import { existsSync } from 'node:fs'
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { readManualMarkers, repoRoot } from './lib/manual-capture/inventory.mjs'
import { installMockApi } from './lib/manual-capture/mock-api.mjs'
import { FIXED_NOW_ISO, adminUser } from './lib/manual-capture/fixtures/common.mjs'
import { ITEMS } from './lib/manual-capture/items/index.mjs'

const OUT_DIR = path.join(repoRoot, 'docs/manual/assets/screenshots')
const MANIFEST = path.join(OUT_DIR, 'manifest.json')
const DEFAULT_VIEWPORT = { width: 1440, height: 1000 }
/** Permissão exigida pela rota (src/routes/AppRoutes.tsx); Modo Fábrica usa sessão de produção própria. */
const ROUTE_PERMISSIONS = [
  [/^\/app\/permissoes-por-papel/, ['rbac.manage_role_permissions']],
  [/^\/app\/usuarios\/trilha/, ['audit.view']],
  [/^\/app\/(nova-esteira|importar-os|planejamento-semanal|agenda-semanal|gestao\/evolucao-esteiras|esteiras\/[^/]+\/alterar)/, ['conveyors.create']],
  [/^\/app\/dashboard/, ['dashboard.view_operational', 'dashboard.view_executive']],
  [/^\/app\/(colaboradores|gestao\/jornada-colaborador)/, ['collaborators_admin.view']],
  [/^\/app\/configuracoes-operacionais/, ['operational_settings.manage']],
  [/^\/app\/gestao\/apontamento\//, ['time_entries.create_on_behalf | time_entries.edit_any | time_entries.delete_any']],
  [/^\/app\/kiosk/, ['sessão do Modo Fábrica (colaborador + PIN)']],
]

function permissionsFor(route) {
  if (!route) return []
  return ROUTE_PERMISSIONS.find(([re]) => re.test(route))?.[1] ?? ['usuário autenticado']
}

const STATUSES = new Set(['CAPTURED', 'BLOCKED', 'REQUIRES_EXTERNAL_VIEWER', 'NOT_APPLICABLE'])

const args = process.argv.slice(2)
function argValues(flag) {
  const out = []
  args.forEach((a, i) => {
    if (a === flag && args[i + 1]) out.push(args[i + 1])
    else if (a.startsWith(`${flag}=`)) out.push(a.slice(flag.length + 1))
  })
  return out
}
const baseUrl = argValues('--base-url')[0] ?? 'http://127.0.0.1:5174'
const onlyIds = new Set(argValues('--id'))
const onlyChapters = new Set(argValues('--chapter').map(Number))

/** Liga cada marcação do manual a exatamente um item (por trecho do texto da marcação). */
function bindInventory(markers) {
  const errors = []
  const bound = []
  for (const m of markers) {
    const hits = ITEMS.filter((it) => it.match && m.text.includes(it.match))
    if (hits.length !== 1) {
      errors.push(`linha ${m.line}: ${hits.length} itens casam com "${m.text.slice(0, 70)}…"`)
      continue
    }
    bound.push({ marker: m, item: hits[0] })
  }
  const orphanItems = ITEMS.filter((it) => it.match && !bound.some((b) => b.item === it))
  for (const it of orphanItems) errors.push(`item ${it.id} não casa com nenhuma marcação`)
  for (const it of ITEMS.filter((x) => !x.match)) bound.push({ marker: null, item: it })
  return { bound, errors }
}

function fileFor(item) {
  return item.file ?? `${item.id}-${item.slug}.png`
}

async function loadManifest() {
  if (!existsSync(MANIFEST)) return { items: [] }
  return JSON.parse(await readFile(MANIFEST, 'utf8'))
}

function manifestEntry({ marker, item }, result) {
  return {
    id: item.id,
    chapter: marker ? marker.chapter : item.chapter,
    section: marker ? marker.section : item.section ?? null,
    manualLine: marker ? marker.line : null,
    marker: marker ? marker.marker : item.marker,
    file: result.status === 'CAPTURED' || item.file ? fileFor(item) : null,
    extraFiles: result.extraFiles ?? item.extraFiles ?? [],
    route: item.route,
    viewport: item.viewport ?? DEFAULT_VIEWPORT,
    user: item.user === null ? null : (item.user ?? adminUser).email,
    permissions: permissionsFor(item.route),
    scenario: item.scenario,
    mockEndpoints: result.mockEndpoints ?? [],
    unexpectedApiCalls: result.unexpected ?? [],
    status: result.status,
    notes: [item.notes, result.notes].filter(Boolean).join(' ') || null,
  }
}

async function makeShot(page, item) {
  return async function shot(target, opts = {}) {
    const file = path.join(OUT_DIR, opts.file ?? fileFor(item))
    await page.evaluate(() => document.fonts?.ready)
    await page.waitForTimeout(opts.settle ?? 250)
    if (!target) {
      await page.screenshot({ path: file, fullPage: !!opts.fullPage, clip: opts.clip, animations: 'disabled', caret: 'hide' })
      return file
    }
    const locators = Array.isArray(target) ? target : [target]
    const boxes = []
    for (const loc of locators) {
      const b = await loc.boundingBox()
      if (!b) throw new Error(`Elemento sem bounding box para recorte (${item.id}).`)
      boxes.push(b)
    }
    const pad = opts.pad ?? 16
    const x = Math.max(0, Math.min(...boxes.map((b) => b.x)) - pad)
    const y = Math.max(0, Math.min(...boxes.map((b) => b.y)) - pad)
    const right = Math.max(...boxes.map((b) => b.x + b.width)) + pad
    const bottom = Math.max(...boxes.map((b) => b.y + b.height)) + pad
    const vp = page.viewportSize()
    const fullPage = bottom > vp.height || right > vp.width
    await page.screenshot({
      path: file,
      clip: { x, y, width: Math.min(right, fullPage ? right : vp.width) - x, height: bottom - y },
      fullPage,
      animations: 'disabled',
      caret: 'hide',
    })
    return file
  }
}

async function runItem(browser, entry) {
  const { item } = entry
  if (item.staticStatus) {
    return { status: item.staticStatus, notes: null, mockEndpoints: [] }
  }
  const context = await browser.newContext({
    viewport: item.viewport ?? DEFAULT_VIEWPORT,
    deviceScaleFactor: 1,
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    colorScheme: 'light',
    reducedMotion: 'reduce',
    acceptDownloads: true,
  })
  await context.addInitScript(
    ({ theme, storage }) => {
      try {
        window.localStorage.setItem('sgp.colorTheme', theme)
        for (const [k, v] of Object.entries(storage)) window.localStorage.setItem(k, v)
      } catch {
        /* storage indisponível */
      }
    },
    { theme: item.theme ?? 'light-executive', storage: item.localStorage ?? {} },
  )
  const page = await context.newPage()
  await page.clock.setFixedTime(new Date(item.now ?? FIXED_NOW_ISO))
  const handlers = typeof item.handlers === 'function' ? item.handlers() : item.handlers ?? []
  const log = await installMockApi(context, { user: item.user === null ? null : item.user ?? adminUser, handlers })
  const pageErrors = []
  page.on('pageerror', (e) => pageErrors.push(e.message))
  await page.addStyleTag({ content: '' }).catch(() => {})
  const shot = await makeShot(page, item)
  try {
    if (item.route) {
      await page.goto(`${baseUrl}${item.route}`, { waitUntil: 'networkidle', timeout: 60000 })
      await page.addStyleTag({
        content: '*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important}',
      })
    }
    const res = (await item.run({ page, context, shot, baseUrl, outDir: OUT_DIR })) ?? {}
    const unexpected = [...new Set(log.unexpected)].filter((u) => !(item.allowUnexpected ?? []).some((re) => re.test(u)))
    const status = pageErrors.length && !item.allowPageErrors ? 'BLOCKED' : res.status ?? 'CAPTURED'
    return {
      status,
      notes: [res.notes, pageErrors.length ? `Erros JS: ${pageErrors.join(' | ')}` : null].filter(Boolean).join(' ') || null,
      mockEndpoints: [...log.served].sort(),
      unexpected,
      extraFiles: res.extraFiles,
    }
  } catch (e) {
    await page.screenshot({ path: path.join(os.tmpdir(), `manual-capture-fail-${item.id}.png`) }).catch(() => {})
    return {
      status: 'BLOCKED',
      notes: `Falha na automação: ${e.message.split('\n')[0]}`,
      mockEndpoints: [...log.served].sort(),
      unexpected: [...new Set(log.unexpected)],
    }
  } finally {
    await context.close()
  }
}

/**
 * Garante que as fixtures/itens de captura só usam dados fictícios:
 * e-mails apenas em `.example` e nenhum domínio/marca de cliente real.
 */
async function scanFixturesForRealData() {
  const dir = path.join(repoRoot, 'scripts/lib/manual-capture')
  const files = []
  async function walk(d) {
    for (const e of await readdir(d, { withFileTypes: true })) {
      const p = path.join(d, e.name)
      if (e.isDirectory()) await walk(p)
      else if (/\.(mjs|ts)$/.test(e.name)) files.push(p)
    }
  }
  await walk(dir)
  const problems = []
  for (const f of files) {
    const src = await readFile(f, 'utf8')
    for (const m of src.matchAll(/[\w.+-]+@([\w-]+(?:\.[\w-]+)+)/g)) {
      if (!m[1].endsWith('.example')) problems.push(`${path.relative(repoRoot, f)}: e-mail fora de .example (${m[0]})`)
    }
    if (/multivacia\.com|bravo\.com|@gmail|@hotmail/i.test(src)) problems.push(`${path.relative(repoRoot, f)}: domínio real encontrado`)
  }
  return problems
}

async function validate(markers) {
  const problems = []
  const manifest = await loadManifest()
  const byId = new Map(manifest.items.map((x) => [x.id, x]))
  const { bound, errors } = bindInventory(markers)
  problems.push(...errors)
  for (const { item } of bound) {
    const e = byId.get(item.id)
    if (!e) {
      problems.push(`${item.id}: sem entrada no manifesto`)
      continue
    }
    if (!STATUSES.has(e.status)) problems.push(`${item.id}: status inválido ${e.status}`)
    if (e.status === 'CAPTURED') {
      const f = path.join(OUT_DIR, e.file ?? '')
      if (!e.file || !existsSync(f) || (await stat(f)).size === 0) problems.push(`${item.id}: arquivo ausente/vazio ${e.file}`)
      if (e.unexpectedApiCalls?.length) problems.push(`${item.id}: chamadas /api inesperadas ${e.unexpectedApiCalls.join(', ')}`)
    }
  }
  const known = new Set(manifest.items.flatMap((e) => [e.file, ...(e.extraFiles ?? [])]).filter(Boolean))
  for (const f of await readdir(OUT_DIR)) {
    if (f === 'manifest.json' || f === 'README.md') continue
    if (!known.has(f)) problems.push(`arquivo sem entrada no manifesto: ${f}`)
  }
  if (!existsSync(path.join(OUT_DIR, 'extra-ajuda-menu.png'))) problems.push('extra-ajuda-menu.png ausente')
  problems.push(...(await scanFixturesForRealData()))
  const counts = {}
  for (const e of manifest.items) counts[e.status] = (counts[e.status] ?? 0) + 1
  return { problems, counts, markers: markers.length, total: manifest.items.length }
}

async function main() {
  const markers = await readManualMarkers()
  const { bound, errors } = bindInventory(markers)
  if (args.includes('--list')) {
    for (const { marker, item } of bound) {
      console.log(`${item.id}\t${marker ? `L${marker.line}` : 'extra'}\t${fileFor(item)}\t${item.route ?? '-'}`)
    }
    console.log(`marcações=${markers.length} itens=${bound.length}`)
    if (errors.length) console.log(errors.join('\n'))
    return
  }
  if (args.includes('--validate')) {
    const r = await validate(markers)
    console.log(JSON.stringify(r, null, 2))
    process.exitCode = r.problems.length ? 1 : 0
    return
  }
  if (errors.length) {
    console.error(errors.join('\n'))
    if (!onlyIds.size && !onlyChapters.size) {
      process.exitCode = 1
      return
    }
  }
  const selected = bound.filter(
    ({ item }) =>
      (!onlyIds.size || onlyIds.has(item.id)) &&
      (!onlyChapters.size || onlyChapters.has(item.chapterNumber)),
  )
  await mkdir(OUT_DIR, { recursive: true })
  const manifest = await loadManifest()
  const browser = await chromium.launch({ channel: 'chromium', args: ['--lang=pt-BR'], env: { ...process.env, LANG: 'pt_BR.UTF-8', LANGUAGE: 'pt_BR' } })
  try {
    for (const entry of selected) {
      const result = await runItem(browser, entry)
      const row = manifestEntry(entry, result)
      const idx = manifest.items.findIndex((x) => x.id === row.id)
      if (idx >= 0) manifest.items[idx] = row
      else manifest.items.push(row)
      const warn = row.unexpectedApiCalls.length ? ` [inesperadas: ${row.unexpectedApiCalls.join(', ')}]` : ''
      console.log(`${row.status.padEnd(24)} ${row.id} ${row.file ?? ''}${warn}${row.status === 'BLOCKED' ? ` — ${row.notes}` : ''}`)
    }
  } finally {
    await browser.close()
  }
  const order = new Map(bound.map(({ item }, i) => [item.id, i]))
  manifest.items = manifest.items.filter((x) => order.has(x.id)).sort((a, b) => order.get(a.id) - order.get(b.id))
  manifest.generatedBy = 'scripts/capture-manual-screenshots.mjs'
  manifest.source = 'docs/manual/source/MANUAL_USUARIO_SGP.md'
  manifest.fixedClock = FIXED_NOW_ISO
  manifest.markersInManual = markers.length
  manifest.extraItems = bound.filter((b) => !b.marker).length
  manifest.items = manifest.items
  const ordered = {
    generatedBy: manifest.generatedBy,
    source: manifest.source,
    fixedClock: manifest.fixedClock,
    markersInManual: manifest.markersInManual,
    extraItems: manifest.extraItems,
    items: manifest.items,
  }
  await writeFile(MANIFEST, `${JSON.stringify(ordered, null, 2)}\n`)
}

await main()
