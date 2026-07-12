import { chromium } from 'playwright'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const BASE_URL = 'http://localhost:5173'

async function runServerScript(...args) {
  return new Promise((resolve, reject) => {
    const child = spawn('npx', ['tsx', path.join(ROOT, 'server/src/scripts/tmp-session-homolog-helper.ts'), ...args], {
      cwd: path.join(ROOT, 'server'),
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let stdout = ''
    child.stdout.on('data', (d) => { stdout += d.toString() })
    child.stderr.on('data', (d) => { stdout += d.toString() })
    child.on('close', (code) => code === 0 ? resolve(stdout.trim()) : reject(new Error(stdout)))
  })
}

function parsePrep(stdout) {
  const line = stdout.split('\n').find((l) => l.startsWith('SESSION_PREP:'))
  return JSON.parse(line.slice('SESSION_PREP:'.length))
}

async function openPage(browser, prep, route = '/app/backlog') {
  const context = await browser.newContext()
  await context.addCookies([{
    name: prep.cookie.name,
    value: prep.cookie.value,
    domain: 'localhost',
    path: '/',
    httpOnly: true,
    sameSite: 'Lax',
  }])
  const page = await context.newPage()
  const network = []
  page.on('response', async (res) => {
    if (!res.url().includes('/api/v1/auth/me') || res.request().method() !== 'GET') return
    let idleExpiresAt = null
    try { idleExpiresAt = (await res.json())?.data?.sessionIdle?.idleExpiresAt ?? null } catch {}
    network.push({ status: res.status(), idleExpiresAt, at: new Date().toISOString() })
  })
  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' })
  return { context, page, network }
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const out = []

  // A — inatividade real após bootstrap (5/1 => aguardar 4m05s)
  const prepA = parsePrep(await runServerScript('--timeout', '5', '--warning', '1', '--idle-elapsed-ms', '0'))
  const aStart = new Date().toISOString()
  const { context: cA, page: pA, network: nA } = await openPage(browser, prepA)
  console.log(`[A] bootstrap concluído ${new Date().toISOString()}, aguardando 245s inativo...`)
  await pA.waitForTimeout(245_000)
  const modalA = await pA.getByRole('dialog', { name: /sessão está prestes a expirar/i }).isVisible().catch(() => false)
  out.push({ scenario: 'A', startedAt: aStart, config: '5/1, 245s inativo pós-bootstrap', modalOpen: modalA, network: nA, result: modalA ? 'aprovado' : 'reprovado' })
  await cA.close()

  // F — modal + continuar conectado
  const prepF = parsePrep(await runServerScript('--timeout', '5', '--warning', '1', '--idle-elapsed-ms', '0'))
  const fStart = new Date().toISOString()
  const { context: cF, page: pF, network: nF } = await openPage(browser, prepF)
  console.log(`[F] aguardando modal (~245s)...`)
  await pF.waitForTimeout(245_000)
  const modalF = await pF.getByRole('dialog', { name: /sessão está prestes a expirar/i }).isVisible().catch(() => false)
  const before = nF.length
  if (modalF) await pF.getByRole('button', { name: /continuar conectado/i }).click()
  await pF.waitForTimeout(3000)
  const modalAfter = await pF.getByRole('dialog', { name: /sessão está prestes a expirar/i }).isVisible().catch(() => false)
  out.push({
    scenario: 'F',
    startedAt: fStart,
    config: '5/1, modal + Continuar conectado',
    modalOpen: modalF,
    modalAfterClick: modalAfter,
    network: nF,
    newIdleExpiresAt: nF.at(-1)?.idleExpiresAt ?? null,
    result: modalF && nF.length > before && !modalAfter ? 'aprovado' : 'reprovado',
  })
  await cF.close()

  // H — falha na renovação (não no bootstrap)
  const prepH = parsePrep(await runServerScript('--timeout', '5', '--warning', '1', '--idle-elapsed-ms', '245000'))
  const hStart = new Date().toISOString()
  const { context: cH, page: pH, network: nH } = await openPage(browser, prepH)
  let blocks = 0
  await pH.route('**/api/v1/auth/me', async (route) => {
    if (route.request().method() !== 'GET') return route.continue()
    if (nH.filter((x) => x.status).length >= 2 && blocks < 1) {
      blocks += 1
      return route.abort('failed')
    }
    return route.continue()
  })
  await pH.mouse.click(300, 300)
  await pH.waitForTimeout(5000)
  const onLogin = pH.url().includes('/login')
  out.push({
    scenario: 'H',
    startedAt: hStart,
    config: 'falha na renovação automática (não bootstrap)',
    network: nH,
    blocks,
    logoutIndevido: onLogin,
    result: !onLogin ? 'aprovado' : 'reprovado',
  })
  await cH.close()

  await runServerScript('--timeout', '30', '--warning', '5', '--idle-elapsed-ms', '0', '--restore-defaults')
  console.log('RERUN_RESULTS:' + JSON.stringify(out, null, 2))
  await browser.close()
}

main().catch((e) => { console.error(e); process.exit(1) })
