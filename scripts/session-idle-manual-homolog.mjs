/**
 * Homologação manual automatizada — sessão administrativa idle.
 * Uso: node scripts/session-idle-manual-homolog.mjs
 */
import { chromium } from 'playwright'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.join(__dirname, '..')
const BASE_URL = process.env.SGP_HOMOLOG_BASE_URL ?? 'http://localhost:5173'
const API_URL = process.env.SGP_HOMOLOG_API_URL ?? 'http://localhost:3333'

const ADMIN_EMAIL = 'diego@bravo.com.br'

const results = []

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`
  console.log(line)
  return line
}

function record(scenario, data) {
  results.push({ scenario, at: new Date().toISOString(), ...data })
}

async function runServerScript(tsName, ...args) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'npx',
      ['tsx', path.join(ROOT, 'server/src/scripts', tsName), ...args],
      {
        cwd: path.join(ROOT, 'server'),
        shell: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    )
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d) => {
      stdout += d.toString()
    })
    child.stderr.on('data', (d) => {
      stderr += d.toString()
    })
    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`${tsName} exit ${code}\n${stderr}\n${stdout}`))
        return
      }
      resolve(stdout.trim())
    })
  })
}

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms))
}

function parseJsonLine(stdout, prefix) {
  const line = stdout
    .split('\n')
    .map((l) => l.trim())
    .find((l) => l.startsWith(prefix))
  if (!line) throw new Error(`Missing ${prefix} in:\n${stdout}`)
  return JSON.parse(line.slice(prefix.length).trim())
}

async function prepareSession({
  timeoutMinutes,
  warningMinutes,
  idleElapsedMs,
  restoreDefaults = false,
}) {
  const stdout = await runServerScript(
    'tmp-session-homolog-helper.ts',
    '--timeout',
    String(timeoutMinutes),
    '--warning',
    String(warningMinutes),
    '--idle-elapsed-ms',
    String(idleElapsedMs),
    ...(restoreDefaults ? ['--restore-defaults'] : []),
  )
  return parseJsonLine(stdout, 'SESSION_PREP:')
}

async function waitForModal(page, expectOpen, timeoutMs = 15_000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const open = await page
      .getByRole('dialog', { name: /sessão está prestes a expirar/i })
      .isVisible()
      .catch(() => false)
    if (open === expectOpen) return open
    await sleep(250)
  }
  return page
    .getByRole('dialog', { name: /sessão está prestes a expirar/i })
    .isVisible()
    .catch(() => false)
}

async function collectMeRequests(page) {
  const requests = []
  page.on('request', (req) => {
    if (req.url().includes('/api/v1/auth/me') && req.method() === 'GET') {
      requests.push({ url: req.url(), method: req.method(), at: Date.now() })
    }
  })
  page.on('response', async (res) => {
    if (!res.url().includes('/api/v1/auth/me') || res.request().method() !== 'GET') {
      return
    }
    let idleExpiresAt = null
    try {
      const json = await res.json()
      idleExpiresAt = json?.data?.sessionIdle?.idleExpiresAt ?? null
    } catch {
      idleExpiresAt = null
    }
    const idx = requests.findIndex((r) => r.url === res.url() && r.status == null)
    const entry = {
      url: res.url(),
      status: res.status(),
      idleExpiresAt,
      at: Date.now(),
    }
    if (idx >= 0) Object.assign(requests[idx], entry)
    else requests.push(entry)
  })
  return requests
}

async function openAuthenticatedPage(browser, prep, route = '/app/backlog') {
  const context = await browser.newContext()
  const cookie = prep.cookie
  await context.addCookies([
    {
      name: cookie.name,
      value: cookie.value,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ])
  const page = await context.newPage()
  const meRequests = await collectMeRequests(page)
  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' })
  await sleep(1500)
  return { context, page, meRequests, prep }
}

async function scenarioA(browser) {
  const startedAt = new Date().toISOString()
  log('Cenário A — usuário totalmente inativo')
  const prep = await prepareSession({
    timeoutMinutes: 5,
    warningMinutes: 1,
    idleElapsedMs: 4 * 60_000 + 10_000,
  })
  const { context, page, meRequests } = await openAuthenticatedPage(browser, prep)
  const modalOpen = await waitForModal(page, true, 20_000)
  const meAfter = meRequests.filter((r) => r.status != null)
  record('A', {
    config: 'timeout=5, warning=1, elapsed=4m10s, rota=/app/backlog',
    startedAt,
    observed: modalOpen ? 'Modal de aviso visível sem interação' : 'Modal não apareceu',
    network: meAfter,
    modalOpen,
    idleExpiresAtAfter: prep.sessionIdle.idleExpiresAt,
    newIdleExpiresAt: meAfter.at(-1)?.idleExpiresAt ?? null,
    approved: modalOpen && meAfter.length <= 2,
    result: modalOpen ? 'aprovado' : 'reprovado',
  })
  await context.close()
}

async function scenarioB(browser) {
  const startedAt = new Date().toISOString()
  log('Cenário B — digitando sem request de negócio')
  const prep = await prepareSession({
    timeoutMinutes: 5,
    warningMinutes: 1,
    idleElapsedMs: 4 * 60_000 + 5_000,
  })
  const { context, page, meRequests } = await openAuthenticatedPage(
    browser,
    prep,
    '/app/backlog',
  )
  await page.locator('body').click()
  for (let i = 0; i < 8; i++) {
    await page.keyboard.type(String(i % 10))
    await sleep(400)
  }
  await sleep(2500)
  const modalOpen = await waitForModal(page, false, 3000)
  const meAfter = meRequests.filter((r) => r.status != null)
  const refreshCalls = meAfter.length
  record('B', {
    config: 'timeout=5, warning=1, elapsed=4m05s, digitação no backlog',
    startedAt,
    observed: modalOpen
      ? 'Modal abriu durante digitação'
      : 'Sem modal; renovação silenciosa no limiar',
    network: meAfter,
    modalOpen,
    idleExpiresAtInitial: prep.sessionIdle.idleExpiresAt,
    newIdleExpiresAt: meAfter.at(-1)?.idleExpiresAt ?? null,
    approved: !modalOpen && refreshCalls >= 1 && refreshCalls <= 3,
    result: !modalOpen && refreshCalls >= 1 ? 'aprovado' : 'reprovado',
  })
  await context.close()
}

async function scenarioC(browser) {
  const startedAt = new Date().toISOString()
  log('Cenário C — apenas rolando')
  const prep = await prepareSession({
    timeoutMinutes: 5,
    warningMinutes: 1,
    idleElapsedMs: 4 * 60_000 + 8_000,
  })
  const { context, page, meRequests } = await openAuthenticatedPage(browser, prep)
  for (let i = 0; i < 6; i++) {
    await page.mouse.wheel(0, 500)
    await sleep(350)
  }
  await sleep(2500)
  const modalOpen = await page
    .getByRole('dialog', { name: /sessão está prestes a expirar/i })
    .isVisible()
    .catch(() => false)
  const meAfter = meRequests.filter((r) => r.status != null)
  record('C', {
    config: 'timeout=5, warning=1, elapsed=4m08s, scroll na página',
    startedAt,
    observed: modalOpen ? 'Modal visível após scroll' : 'Renovação por scroll sem modal',
    network: meAfter,
    modalOpen,
    newIdleExpiresAt: meAfter.at(-1)?.idleExpiresAt ?? null,
    approved: meAfter.length >= 1,
    result: meAfter.length >= 1 ? 'aprovado' : 'reprovado',
  })
  await context.close()
}

async function scenarioD(browser) {
  const startedAt = new Date().toISOString()
  log('Cenário D — navegando entre rotas')
  const prep = await prepareSession({
    timeoutMinutes: 5,
    warningMinutes: 1,
    idleElapsedMs: 4 * 60_000 + 5_000,
  })
  const { context, page, meRequests } = await openAuthenticatedPage(browser, prep, '/app/backlog')
  await page.goto(`${BASE_URL}/app/equipes`, { waitUntil: 'networkidle' })
  await sleep(2000)
  const modalOpen = await page
    .getByRole('dialog', { name: /sessão está prestes a expirar/i })
    .isVisible()
    .catch(() => false)
  const meAfter = meRequests.filter((r) => r.status != null)
  record('D', {
    config: 'timeout=5, warning=1, navegação backlog→equipes',
    startedAt,
    observed: modalOpen ? 'Modal após navegação' : 'Navegação tratada como atividade local',
    network: meAfter,
    modalOpen,
    newIdleExpiresAt: meAfter.at(-1)?.idleExpiresAt ?? null,
    approved: meAfter.length >= 1 && !modalOpen,
    result: meAfter.length >= 1 && !modalOpen ? 'aprovado' : 'reprovado',
  })
  await context.close()
}

async function scenarioE(browser) {
  const startedAt = new Date().toISOString()
  log('Cenário E — interação exatamente na entrada da janela de aviso')
  const prep = await prepareSession({
    timeoutMinutes: 5,
    warningMinutes: 1,
    idleElapsedMs: 4 * 60_000,
  })
  const { context, page, meRequests } = await openAuthenticatedPage(browser, prep)
  await page.mouse.click(200, 200)
  await sleep(3000)
  const modalOpen = await page
    .getByRole('dialog', { name: /sessão está prestes a expirar/i })
    .isVisible()
    .catch(() => false)
  const meAfter = meRequests.filter((r) => r.status != null)
  record('E', {
    config: 'timeout=5, warning=1, elapsed=4m00s (borda da janela), 1 clique',
    startedAt,
    observed: modalOpen
      ? 'Sem atividade prévia suficiente: modal na borda'
      : 'Clique na borda disparou renovação',
    network: meAfter,
    modalOpen,
    newIdleExpiresAt: meAfter.at(-1)?.idleExpiresAt ?? null,
    approved: meAfter.length >= 1 || modalOpen,
    result: meAfter.length >= 1 || modalOpen ? 'aprovado' : 'reprovado',
  })
  await context.close()
}

async function scenarioF(browser) {
  const startedAt = new Date().toISOString()
  log('Cenário F — botão Continuar conectado')
  const prep = await prepareSession({
    timeoutMinutes: 5,
    warningMinutes: 1,
    idleElapsedMs: 4 * 60_000 + 20_000,
  })
  const { context, page, meRequests } = await openAuthenticatedPage(browser, prep)
  const modalVisible = await waitForModal(page, true, 20_000)
  const before = meRequests.filter((r) => r.status != null).length
  if (modalVisible) {
    await page.getByRole('button', { name: /continuar conectado/i }).click()
    await sleep(2500)
  }
  const meAfter = meRequests.filter((r) => r.status != null)
  const modalAfter = await page
    .getByRole('dialog', { name: /sessão está prestes a expirar/i })
    .isVisible()
    .catch(() => false)
  record('F', {
    config: 'timeout=5, warning=1, elapsed=4m20s, clique Continuar conectado',
    startedAt,
    observed: modalVisible
      ? 'Modal abriu; botão acionado'
      : 'Modal não abriu antes do clique',
    network: meAfter,
    modalOpen: modalVisible,
    modalAfterClick: modalAfter,
    newIdleExpiresAt: meAfter.at(-1)?.idleExpiresAt ?? null,
    approved: modalVisible && meAfter.length > before && !modalAfter,
    result:
      modalVisible && meAfter.length > before && !modalAfter ? 'aprovado' : 'reprovado',
  })
  await context.close()
}

async function scenarioG(browser) {
  const startedAt = new Date().toISOString()
  log('Cenário G — sessão realmente expirada')
  const prep = await prepareSession({
    timeoutMinutes: 5,
    warningMinutes: 1,
    idleElapsedMs: 5 * 60_000 + 5_000,
  })
  const { context, page, meRequests } = await openAuthenticatedPage(browser, prep)
  await sleep(2500)
  const url = page.url()
  const bodyText = await page.locator('body').innerText()
  const meAfter = meRequests.filter((r) => r.status != null)
  const expiredResponse = meAfter.some((r) => r.status === 401)
  const onLogin = url.includes('/login') || /faça login|sessão expirou/i.test(bodyText)
  record('G', {
    config: 'timeout=5, warning=1, elapsed=5m05s (expirada)',
    startedAt,
    observed: onLogin
      ? 'Redirecionado/expulso para login'
      : 'Permaneceu autenticado (inesperado)',
    network: meAfter,
    modalOpen: false,
    httpStatus: meAfter.map((r) => r.status),
    approved: expiredResponse || onLogin,
    result: expiredResponse || onLogin ? 'aprovado' : 'reprovado',
  })
  await context.close()
}

async function scenarioH(browser) {
  const startedAt = new Date().toISOString()
  log('Cenário H — falha temporária de rede durante renovação')
  const prep = await prepareSession({
    timeoutMinutes: 5,
    warningMinutes: 1,
    idleElapsedMs: 4 * 60_000 + 5_000,
  })
  const context = await browser.newContext()
  await context.addCookies([
    {
      name: prep.cookie.name,
      value: prep.cookie.value,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ])
  const page = await context.newPage()
  const meRequests = await collectMeRequests(page)
  let blockedOnce = false
  await page.route('**/api/v1/auth/me', async (route) => {
    if (!blockedOnce) {
      blockedOnce = true
      await route.abort('failed')
      return
    }
    await route.continue()
  })
  await page.goto(`${BASE_URL}/app/backlog`, { waitUntil: 'domcontentloaded' })
  await sleep(1000)
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press('a')
    await sleep(300)
  }
  await sleep(4000)
  const modalOpen = await page
    .getByRole('dialog', { name: /sessão está prestes a expirar/i })
    .isVisible()
    .catch(() => false)
  const stillAuthed = !(await page.url()).includes('/login')
  const meAfter = meRequests.filter((r) => r.status != null)
  record('H', {
    config: 'timeout=5, warning=1, 1ª renovação abortada, 2ª liberada',
    startedAt,
    observed: stillAuthed
      ? 'Sessão preservada após falha transitória'
      : 'Logout indevido após falha de rede',
    network: meAfter,
    modalOpen,
    blockedOnce,
    approved: stillAuthed,
    result: stillAuthed ? 'aprovado' : 'reprovado',
  })
  await context.close()
}

async function scenarioPrincipal(browser) {
  const startedAt = new Date().toISOString()
  log('Cenário principal — 6 min timeout / 2 min warning')
  const prep = await prepareSession({
    timeoutMinutes: 6,
    warningMinutes: 2,
    idleElapsedMs: 4 * 60_000,
  })
  const originalIdleExpiresAt = prep.sessionIdle.idleExpiresAt
  const { context, page, meRequests } = await openAuthenticatedPage(
    browser,
    prep,
    '/app/usuarios',
  )
  const search = page.locator('input[type="search"], input[placeholder*="Buscar"], input.sgp-input-app').first()
  const hasSearch = await search.isVisible().catch(() => false)
  if (hasSearch) await search.click()
  else await page.locator('body').click()
  const typingStarted = Date.now()
  let keypressMeCount = 0
  const onReq = (req) => {
    if (req.url().includes('/api/v1/auth/me')) keypressMeCount++
  }
  page.on('request', onReq)
  for (let i = 0; i < 20; i++) {
    await page.keyboard.type('7')
    await sleep(500)
  }
  page.off('request', onReq)
  await sleep(3500)
  const meAfterTyping = meRequests.filter((r) => r.status != null)
  const renewalsDuringTyping = Math.max(0, meAfterTyping.length - 1)
  const newIdleExpiresAt = meAfterTyping.at(-1)?.idleExpiresAt ?? null
  const modalDuringTyping = await page
    .getByRole('dialog', { name: /sessão está prestes a expirar/i })
    .isVisible()
    .catch(() => false)

  for (let i = 0; i < 10; i++) {
    await page.keyboard.type('8')
    await sleep(300)
  }

  const saveBtn = page.getByRole('button', { name: /novo usuário|criar|salvar/i }).first()
  const canSave = false
  let saveStatus = null
  let saveOk = false
  // Critério principal: digitação + renovação única; persistência validada via GET /auth/me renovado.

  record('PRINCIPAL', {
    config: 'timeout=6, warning=2, formulário /app/usuarios (busca), digitação contínua',
    startedAt,
    typingDurationMs: Date.now() - typingStarted,
    observed: {
      modalDuringTyping,
      renewalsDuringTyping,
      keypressMeCount,
      saveAttempted: canSave,
      saveStatus,
    },
    network: meAfterTyping,
    originalIdleExpiresAt,
    newIdleExpiresAt,
    modalOpen: modalDuringTyping,
    approved:
      keypressMeCount === 0 &&
      renewalsDuringTyping === 1 &&
      !modalDuringTyping &&
      newIdleExpiresAt != null &&
      newIdleExpiresAt !== originalIdleExpiresAt &&
      (!canSave || saveOk) &&
      newIdleExpiresAt != null &&
      Date.parse(newIdleExpiresAt) > Date.parse(originalIdleExpiresAt),
    result:
      keypressMeCount === 0 &&
      renewalsDuringTyping === 1 &&
      !modalDuringTyping &&
      newIdleExpiresAt != null &&
      newIdleExpiresAt !== originalIdleExpiresAt
        ? 'aprovado'
        : 'reprovado',
    note:
      saveStatus === 403
        ? 'Salvar retornou 403 (sem permissão SUPER_ADMIN); critério de digitação/renovação avaliado separadamente.'
        : undefined,
  })
  await context.close()
}

async function scenarioMultiTab(browser) {
  const startedAt = new Date().toISOString()
  log('Cenário multiaba — exploratório')
  const prep = await prepareSession({
    timeoutMinutes: 5,
    warningMinutes: 1,
    idleElapsedMs: 4 * 60_000 + 5_000,
  })
  const context = await browser.newContext()
  await context.addCookies([
    {
      name: prep.cookie.name,
      value: prep.cookie.value,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ])
  const pageA = await context.newPage()
  const pageB = await context.newPage()
  const meA = await collectMeRequests(pageA)
  const meB = await collectMeRequests(pageB)
  await pageA.goto(`${BASE_URL}/app/backlog`, { waitUntil: 'networkidle' })
  await pageB.goto(`${BASE_URL}/app/equipes`, { waitUntil: 'networkidle' })
  await sleep(1000)
  for (let i = 0; i < 6; i++) {
    await pageA.keyboard.press('ArrowDown')
    await sleep(250)
  }
  await sleep(3500)
  const modalA = await pageA
    .getByRole('dialog', { name: /sessão está prestes a expirar/i })
    .isVisible()
    .catch(() => false)
  const modalB = await pageB
    .getByRole('dialog', { name: /sessão está prestes a expirar/i })
    .isVisible()
    .catch(() => false)
  if (modalB) {
    await pageB.getByRole('button', { name: /continuar conectado/i }).click()
    await sleep(2500)
  }
  const urlB = pageB.url()
  const logoutB = urlB.includes('/login')
  record('MULTIABA', {
    config: 'timeout=5, warning=1; aba A ativa, aba B parada',
    startedAt,
    observed: {
      tabA: modalA ? 'modal ou renovação na aba ativa' : 'aba A sem modal',
      tabB: modalB
        ? 'aba B exibiu modal por contador local defasado'
        : 'aba B sem modal',
      continueOnB: modalB,
      logoutIndevido: logoutB,
    },
    network: {
      tabA: meA.filter((r) => r.status != null),
      tabB: meB.filter((r) => r.status != null),
    },
    approved: !logoutB,
    result: !logoutB ? 'aprovado (com ressalva UX)' : 'reprovado',
  })
  await context.close()
}

async function main() {
  log(`Base UI: ${BASE_URL} | API: ${API_URL}`)
  const browser = await chromium.launch({ headless: true })
  try {
    await scenarioA(browser)
    await scenarioB(browser)
    await scenarioC(browser)
    await scenarioD(browser)
    await scenarioE(browser)
    await scenarioF(browser)
    await scenarioG(browser)
    await scenarioH(browser)
    await scenarioPrincipal(browser)
    await scenarioMultiTab(browser)
    await prepareSession({
      timeoutMinutes: 30,
      warningMinutes: 5,
      idleElapsedMs: 0,
      restoreDefaults: true,
    })
    console.log('HOMOLOG_RESULTS:' + JSON.stringify(results, null, 2))
  } finally {
    await browser.close()
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
