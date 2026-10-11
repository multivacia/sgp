/**
 * Auditoria de textos de tela do SGP+ — encontra, em texto que o usuário pode ver:
 *   PT-PT   palavras de Portugal (registar, ecrã, utilizador, premir, planeamento…)
 *   TECNICO jargão técnico (STEP, node, conveyor, payload, null…), nomes de coluna/tabela
 *           (snake_case), códigos de estado (EM_ANDAMENTO) e identificadores (stepNodeId)
 *
 * Só olha o conteúdo de strings ('…', "…", `…`) e texto JSX (>…<) em src/ e server/src/.
 * Ignora comentários, imports, logs, testes e mocks. É uma triagem: confira cada linha
 * (uma string pode ser chave interna e nunca aparecer na tela).
 *
 * Uso (terminal do VS Code / PowerShell / bash, na raiz do repositório):
 *   npm run auditoria:textos                      todas as categorias
 *   npm run auditoria:textos -- --so=PT-PT        só uma categoria (PT-PT | TECNICO)
 *   npm run auditoria:textos -- --csv=saida.csv   também grava CSV (abre no Excel)
 * Sai com código 1 quando encontra algo (pode virar checagem de CI no futuro).
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIRS = ['src', 'server/src']
const IGNORE_PATH =
  /(^|[\\/])(tests|__tests__|mocks|test-utils|config|migrations|scripts)([\\/]|$)|\.(test|spec)\.[tj]sx?$|\.d\.ts$/
/** No backend, `new Error(...)` genérico vira "Serviço temporariamente indisponível" (errorHandler). */
const SERVER_INTERNAL_ERROR = /\bnew Error\(/

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=')
    return [k, v ?? true]
  }),
)

/** Palavras/formas de Portugal → sugestão em pt-BR. */
const PT_PT = {
  registar: 'registrar', registo: 'registro', registos: 'registros', registado: 'registrado',
  registada: 'registrada', registados: 'registrados', registadas: 'registradas', registe: 'registre',
  'ecrã': 'tela', 'ecrãs': 'telas', utilizador: 'usuário', utilizadores: 'usuários',
  ficheiro: 'arquivo', ficheiros: 'arquivos', 'palavra-passe': 'senha', 'telemóvel': 'celular',
  contacto: 'contato', contactos: 'contatos', contacte: 'entre em contato', contactar: 'contatar',
  equipa: 'equipe', equipas: 'equipes', facto: 'fato', actual: 'atual', actualizar: 'atualizar',
  'acção': 'ação', 'acções': 'ações', 'selecção': 'seleção', seleccionar: 'selecionar',
  seleccione: 'selecione', objecto: 'objeto', 'direcção': 'direção', 'óptimo': 'ótimo',
  partilhar: 'compartilhar', partilhado: 'compartilhado', partilhada: 'compartilhada',
  gerir: 'gerenciar', rever: 'revisar', carregue: 'clique', prima: 'clique', premir: 'clicar',
  aceder: 'acessar', aceda: 'acesse', introduza: 'digite', introduzir: 'digitar',
  planeamento: 'planejamento', planear: 'planejar', guardar: 'salvar', guardado: 'salvo',
  guardada: 'salva', 'receção': 'recepção', 'secção': 'seção', 'detetar': 'detectar',
  'autenticar-se': 'entrar', 'âmbito': 'escopo/filtro', numa: 'em uma', consola: 'console',
}
// "A carregar…", "a registar" — gerúndio de Portugal (pt-BR: "Carregando…").
const PT_PT_PROGRESSIVE =
  /(?:^|[\s(—–-])[Aa] (carregar|guardar|registar|processar|enviar|gravar|abrir|criar|validar|calcular|gerar|importar|exportar|atualizar|remover|eliminar|apagar|guardar|verificar|sincronizar|publicar|aplicar|preparar|imprimir|procurar|pesquisar)\b/

/** Jargão técnico que não deve aparecer em tela. */
const TECH_WORDS =
  /\b(STEPS?|STEPs|[Ss]teps?|[Nn]odes?|[Cc]onveyors?|TASK|AREA|OPTION|ACTIVITY|payload|endpoint|undefined|null|NaN|uuid|UUID|backend|frontend|stack ?trace|query|bucket)\b/
const UPPER_SNAKE = /\b[A-Z]{2,}(?:_[A-Z0-9]+)+\b/ // EM_ANDAMENTO, A_INICIAR
const LOWER_SNAKE = /\b[a-z]+(?:_[a-z0-9]+)+\b/ // conveyor_id, time_entries
const CAMEL_ID = /\b[a-z]+(?:[A-Z][a-z0-9]+)*(?:Id|Ids|At)\b/ // stepNodeId, createdAt

const SKIP_LINE =
  /^\s*(\/\/|\*|\/\*|import\b|export\s+\*|export\s+\{[^}]*\}\s+from)|\b(console|logger|log)\.(log|info|warn|error|debug|trace)\(|\b(it|describe|test)\(/
const UI_PROP = /\b(label|title|header|placeholder|aria-label|ariaLabel|description|message|hint|tooltip|caption|emptyText|helperText|subtitle|text|toast|pushToast|alert|confirm)\b/

const NON_UI_KEY =
  /\b(id|key|value|role|target|name|type|kind|code|status|htmlFor|aria-labelledby|aria-describedby|aria-controls|data-[\w-]+|testId|data-testid)\s*[:=]\s*\{?\s*$/

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (IGNORE_PATH.test(full)) continue
    if (entry.isDirectory()) yield* walk(full)
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) yield full
  }
}

/** Textos candidatos da linha: literais de string e texto JSX. */
function textsOf(line, isTsx) {
  const out = []
  for (const m of line.matchAll(/'((?:[^'\\]|\\.)*)'|"((?:[^"\\]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g)) {
    // Valor de atributo/chave interna (id, value, role…) não é texto de tela.
    if (NON_UI_KEY.test(line.slice(0, m.index))) continue
    out.push((m[1] ?? m[2] ?? m[3] ?? '').replace(/\$\{[^}]*\}/g, ' '))
  }
  for (const m of line.matchAll(/(?<![=-])>([^<>{}]*[A-Za-zÀ-ú][^<>{}]*)</g)) {
    if (!/&&|\|\||=>|[!=]==?/.test(m[1])) out.push(m[1])
  }
  // Linha que é só texto JSX (continuação de parágrafo entre tags), sem as expressões {…}.
  const prose = line.replace(/\{[^{}]*\}/g, ' ')
  if (
    isTsx &&
    !/[={}'"`<>|]|;\s*$|=>|\w\(|\w\.\w|\s\?\s|\binstanceof\b/.test(prose) &&
    !/^\s*[.#@]/.test(prose) &&
    !/^\s*(return|let|const|var|throw|if|else|case|break|type|export|await|default|for|while|switch|try|catch|new)\b/.test(prose) &&
    /[a-zà-ú]{3,}[\s(—–-]+[a-zà-ú]{3,}/i.test(prose)
  ) {
    out.push(prose)
  }
  return out
}

const SQL = /\b(SELECT|FROM|WHERE|INSERT|UPDATE|DELETE|JOIN|RETURNING|VALUES|GROUP BY|ORDER BY|COALESCE|LIMIT|ON CONFLICT|ALTER|CREATE|DROP|INDEX|AND|OR|IS NULL|IS NOT NULL)\b|\bnow\(\)|\$\d|\$\s|::[a-z]+|\b[a-z_.]+\s*(=|<>|!=)\s*(true|false|TRUE|FALSE|'|\$)/

/** Texto parece frase de tela (tem espaço ou acento), não chave/rota/código/SQL. */
function looksLikeUiText(text) {
  return (/\s/.test(text.trim()) || /[À-ú]/.test(text)) && !SQL.test(text) && !isCodeLike(text)
}

/** Lista de classes CSS, rota de API ou chave técnica montada com `${…}`. */
function isCodeLike(text) {
  const t = text.trim()
  if (/^\/|\/api\//.test(t)) return true
  const tokens = t.split(/\s+/).filter(Boolean)
  const classy = tokens.filter((tk) => /[-:[\]/]/.test(tk) || /^[a-z0-9]+$/.test(tk)).length
  return tokens.length > 1 && /[-:[\]/]/.test(t) && classy === tokens.length && !/[À-ú]/.test(t)
}

function check(text, uiProp) {
  const hits = []
  const ui = looksLikeUiText(text)
  if (ui) {
    for (const m of text.matchAll(/[A-Za-zÀ-ú-]+/g)) {
      const w = m[0].toLowerCase()
      if (Object.hasOwn(PT_PT, w)) hits.push(['PT-PT', m[0], PT_PT[w]])
    }
    const p = text.match(PT_PT_PROGRESSIVE)
    if (p) hits.push(['PT-PT', p[0].trim(), 'gerúndio: "' + p[1].replace(/ar$/, 'ando').replace(/er$/, 'endo').replace(/ir$/, 'indo') + '"'])
  }
  if (ui || (uiProp && !SQL.test(text) && !isCodeLike(text))) {
    const t = text.match(TECH_WORDS)
    if (t) hits.push(['TECNICO', t[0], /steps?/i.test(t[0]) ? 'usar "atividade"' : 'trocar por termo de negócio'])
    // Nome de coluna/identificador só conta em frase (≥ 3 palavras), não em fragmento de código.
    const sentence = (text.match(/(?<![\w_.À-ú])[A-Za-zÀ-ú]{2,}(?![\w_.À-ú])/g) ?? []).length >= 3
    for (const re of sentence ? [UPPER_SNAKE, LOWER_SNAKE, CAMEL_ID] : [UPPER_SNAKE]) {
      const m = text.match(re)
      if (m && !/^(https?|www)/.test(m[0])) hits.push(['TECNICO', m[0], 'nome técnico (código/coluna/tabela)'])
    }
  }
  return hits
}

const only = typeof args.so === 'string' ? args.so.toUpperCase() : null
const rows = []
for (const dir of DIRS) {
  for (const file of walk(join(ROOT, dir))) {
    const lines = readFileSync(file, 'utf8').split(/\r?\n/)
    const isServer = dir.startsWith('server')
    let inBlockComment = false
    let inTemplate = false
    let templateIsSql = false
    lines.forEach((line, i) => {
      // Template literal de várias linhas: pula o corpo quando é SQL.
      const ticks = (line.replace(/\\`/g, '').match(/`/g) ?? []).length
      if (inTemplate) {
        if (SQL.test(line)) templateIsSql = true
        if (ticks % 2 === 1) inTemplate = false
        if (templateIsSql || SQL.test(line)) return
      } else if (ticks % 2 === 1) {
        inTemplate = true
        templateIsSql = SQL.test(line) || /\b(sql|query)\s*[=(]|\.query\(/i.test(line)
        if (templateIsSql) return
      }
      if (inBlockComment) {
        if (line.includes('*/')) inBlockComment = false
        return
      }
      if (/^\s*\/\*/.test(line) && !line.includes('*/')) {
        inBlockComment = true
        return
      }
      if (SKIP_LINE.test(line)) return
      if (isServer && SERVER_INTERNAL_ERROR.test(line)) return
      const uiProp = UI_PROP.test(line)
      const seen = new Set()
      for (const text of textsOf(line, file.endsWith('.tsx'))) {
        for (const [cat, term, hint] of check(text, uiProp)) {
          if (only && cat !== only) continue
          const key = cat + term
          if (seen.has(key)) continue
          seen.add(key)
          rows.push({ cat, file: relative(ROOT, file).replaceAll('\\', '/'), line: i + 1, term, hint, text: line.trim().slice(0, 160) })
        }
      }
    })
  }
}

rows.sort((a, b) => a.cat.localeCompare(b.cat) || a.file.localeCompare(b.file) || a.line - b.line)
for (const r of rows) {
  console.log(`[${r.cat}] ${r.file}:${r.line}  «${r.term}» → ${r.hint}\n          ${r.text}`)
}
const count = (c) => rows.filter((r) => r.cat === c).length
console.log(`\nTotal: ${rows.length}  (PT-PT: ${count('PT-PT')} · TECNICO: ${count('TECNICO')})`)

if (typeof args.csv === 'string') {
  const esc = (v) => `"${String(v).replaceAll('"', '""')}"`
  const csv = ['categoria;arquivo;linha;termo;sugestao;trecho']
    .concat(rows.map((r) => [r.cat, r.file, r.line, r.term, r.hint, r.text].map(esc).join(';')))
    .join('\r\n')
  writeFileSync(resolve(process.cwd(), args.csv), '﻿' + csv, 'utf8')
  console.log(`CSV: ${args.csv}`)
}
process.exitCode = rows.length ? 1 : 0
