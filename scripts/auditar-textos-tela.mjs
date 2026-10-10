/**
 * Auditoria de textos de tela do SGP+ — encontra, em texto que o usuário pode ver:
 *   GLOSSARIO termos proibidos pela linguagem controlada: STEP/step, etapa, Kiosk e membership
 *   PT-PT     palavras de Portugal. As que só existem lá (registar, ecrã, utilizador, ficheiro,
 *             planeamento…) bloqueiam o CI. As que também existem no Brasil (guardar, rever,
 *             gerir, equipa…) e o gerúndio "a + infinitivo" ("A carregar…") só vão para o relatório.
 *   TECNICO   jargão técnico (node, conveyor, payload, null…), nomes de coluna/tabela
 *             (snake_case), códigos de estado (EM_ANDAMENTO) e identificadores (stepNodeId)
 *
 * Guia e tabela de termos: docs/sgp-decisoes-praticas-de-ux.md, seção "Linguagem controlada".
 * Ao mudar a tabela do guia, mude também as listas GLOSSARIO, PT_PT_BLOQUEANTE e PT_PT_RELATORIO.
 *
 * Olha só o que pode ir para a tela, em src/ e server/src/: strings ('…', "…", `…`) com espaço ou
 * acento, valor de propriedade de UI (label, title…) e texto JSX. Ignora comentários, imports,
 * logs, testes, mocks, config, migrations e scripts. É uma triagem: confira cada linha (uma string
 * pode ser chave interna e nunca aparecer na tela).
 *
 * Uso (terminal do VS Code / PowerShell / bash, na raiz do repositório):
 *   npm run auditoria:textos                      relatório completo (GLOSSARIO, PT-PT e TECNICO)
 *   npm run auditoria:textos -- --so=GLOSSARIO    só uma categoria (GLOSSARIO | PT-PT | TECNICO)
 *   npm run auditoria:textos -- --csv=saida.csv   também grava CSV (abre no Excel)
 *   npm run auditoria:textos -- --raiz=<dir>      varre <dir>/src e <dir>/server/src (padrão: este repositório)
 *   npm run auditoria:textos:ci                   gate do CI (--ci): só GLOSSARIO e PT-PT bloqueante; ignora --so
 * Sai com código 1 quando encontra algo (no --ci, só o que bloqueia) e com 0 quando não encontra.
 *
 * Exceção legítima: comentário "auditoria-textos: ignorar — <motivo>" na própria linha do achado ou
 * na linha de cima (comentário de linha, de bloco ou de JSX). Sem motivo, a linha continua reportada.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, '').split('=')
    return [k, v ?? true]
  }),
)

const ROOT =
  typeof args.raiz === 'string'
    ? resolve(process.cwd(), args.raiz)
    : resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DIRS = ['src', 'server/src']
const CI = Boolean(args.ci)
/** Aplicado ao caminho relativo à raiz, com "/". */
const IGNORE_PATH =
  /(^|[\\/])(tests|__tests__|mocks|test-utils|config|migrations|scripts)([\\/]|$)|\.(test|spec)\.[tj]sx?$|\.d\.ts$/
/** No backend, `new Error(...)` genérico vira "Serviço temporariamente indisponível" (errorHandler). */
const SERVER_INTERNAL_ERROR = /\bnew Error\(/

/** Termos proibidos em texto de tela → sugestão. Palavra inteira, sem diferenciar maiúsculas. Bloqueiam o CI. */
const GLOSSARIO = {
  step: 'usar "atividade"',
  steps: 'usar "atividade"',
  etapa: 'usar "atividade" (unidade de trabalho) ou "passo" (assistente)',
  etapas: 'usar "atividade" (unidade de trabalho) ou "passo" (assistente)',
  kiosk: 'usar "Modo Fábrica"',
  membership: 'usar "participação em equipe"',
}
const GLOSSARIO_TERM = new RegExp(
  `(?<![\\p{L}\\p{N}_])(?:${Object.keys(GLOSSARIO).join('|')})(?![\\p{L}\\p{N}_])`,
  'giu',
)

/** Palavras só de Portugal → forma do Brasil. Bloqueiam o CI. */
const PT_PT_BLOQUEANTE = {
  registar: 'registrar', registo: 'registro', registos: 'registros', registado: 'registrado',
  registada: 'registrada', registados: 'registrados', registadas: 'registradas', registe: 'registre',
  'ecrã': 'tela', 'ecrãs': 'telas', utilizador: 'usuário', utilizadores: 'usuários',
  ficheiro: 'arquivo', ficheiros: 'arquivos', 'palavra-passe': 'senha', 'telemóvel': 'celular',
  contacto: 'contato', contactos: 'contatos', contacte: 'entre em contato', facto: 'fato', factos: 'fatos',
  actual: 'atual', actualizar: 'atualizar', 'acção': 'ação', 'acções': 'ações', 'selecção': 'seleção',
  seleccionar: 'selecionar', seleccione: 'selecione', objecto: 'objeto', 'direcção': 'direção',
  'óptimo': 'ótimo', premir: 'clicar', aceder: 'acessar', aceda: 'acesse', planeamento: 'planejamento',
  planear: 'planejar', planeado: 'planejado', planeada: 'planejada', planeados: 'planejados',
  planeadas: 'planejadas', 'receção': 'recepção', 'secção': 'seção', 'detetar': 'detectar',
}
/** Palavras de Portugal que também existem no Brasil → sugestão. Só relatório (não bloqueiam o CI). */
const PT_PT_RELATORIO = {
  guardar: 'salvar', guardado: 'salvo', guardada: 'salva', rever: 'revisar', carregue: 'clique',
  prima: 'clique', gerir: 'gerenciar', numa: 'em uma', 'âmbito': 'escopo/filtro',
  partilhar: 'compartilhar', partilhado: 'compartilhado', partilhada: 'compartilhada',
  equipa: 'equipe', equipas: 'equipes', consola: 'console', 'autenticar-se': 'entrar',
  introduza: 'digite', introduzir: 'digitar', contactar: 'contatar',
}
// "A carregar…", "a registar" — gerúndio de Portugal (pt-BR: "Carregando…"). Só relatório.
const PT_PT_PROGRESSIVE =
  /(?:^|[\s(—–-])[Aa] (carregar|guardar|registar|processar|enviar|gravar|abrir|criar|validar|calcular|gerar|importar|exportar|atualizar|remover|eliminar|apagar|guardar|verificar|sincronizar|publicar|aplicar|preparar|imprimir|procurar|pesquisar)\b/

/** Jargão técnico que não deve aparecer em tela. */
const TECH_WORDS =
  /\b([Nn]odes?|[Cc]onveyors?|TASK|AREA|OPTION|ACTIVITY|payload|endpoint|undefined|null|NaN|uuid|UUID|backend|frontend|stack ?trace|query|bucket)\b/
const UPPER_SNAKE = /\b[A-Z]{2,}(?:_[A-Z0-9]+)+\b/ // EM_ANDAMENTO, A_INICIAR
const LOWER_SNAKE = /\b[a-z]+(?:_[a-z0-9]+)+\b/ // conveyor_id, time_entries
const CAMEL_ID = /\b[a-z]+(?:[A-Z][a-z0-9]+)*(?:Id|Ids|At)\b/ // stepNodeId, createdAt

const SKIP_LINE =
  /^\s*(\/\/|\*|\/\*|import\b|export\s+\*|export\s+\{[^}]*\}\s+from)|\b(console|logger|log)\.(log|info|warn|error|debug|trace)\(|\b(it|describe|test)\(/
const UI_PROP_NAMES =
  'label|title|header|placeholder|aria-label|ariaLabel|description|message|hint|tooltip|caption|emptyText|helperText|subtitle|text|toast|pushToast|alert|confirm'
const UI_PROP = new RegExp(`\\b(${UI_PROP_NAMES})\\b`)
/** Literal que é o valor de uma propriedade de UI (`label: '…'`, `title="…"`, `title={`…`}`). */
const UI_PROP_VALUE = new RegExp(`(?:^|[^\\w-])(?:${UI_PROP_NAMES})\\s*[:=]\\s*\\{?\\s*$`)

const NON_UI_KEY =
  /\b(id|key|value|role|target|name|type|kind|code|status|htmlFor|aria-labelledby|aria-describedby|aria-controls|data-[\w-]+|testId|data-testid)\s*[:=]\s*\{?\s*$/

/** Marcador de exceção: `auditoria-textos: ignorar — <motivo>` em comentário. */
const IGNORE_MARKER = /(?:\/\/|\/\*)\s*auditoria-textos:\s*ignorar\s*—(.*)$/
/** `import {` / `export type {` com a lista nas linhas seguintes. */
const IMPORT_LIST_START = /^\s*(import|export)(\s+type)?\s+(\w+\s*,\s*)?\{\s*$/

/** Texto JSX: trecho que tem sinal de código não é texto. `(s)`/`(es)` é removido antes. */
const JSX_CODE_SIGN =
  /['"`<>[\]{}|]|=>|&&|==|!=|\w\(|\w\.\w|\s\?\s|\?\.|\w\?:|![\w$(]|;\s*$|\binstanceof\b/
const JSX_KEYWORD_START =
  /^\s*(return|let|const|var|throw|if|else|case|break|continue|type|interface|enum|class|function|async|await|export|import|default|for|while|switch|try|catch|finally|new|typeof|delete|void|yield|declare|namespace)\b/
/** Propriedade de objeto ou anotação de tipo (`etapa: Tipo`, `kiosk?: boolean`). */
const JSX_PROPERTY_LINE = /^\s*[a-z_$][\w$]*\??\s*:(\s|$)/
const JSX_TAG = /<\/?[A-Za-z][\w.:-]*(?:\s[^<>]*?)?\/?>|<\/?>/g
/** Antes de `/`: o que permite começar uma regex literal (e não uma divisão). */
const REGEX_START = /(?:^|[(,=:[!&|?{};]|\breturn)\s*$/

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name)
    if (IGNORE_PATH.test(relative(ROOT, full).replaceAll('\\', '/'))) continue
    if (entry.isDirectory()) yield* walk(full)
    else if (/\.(tsx?|jsx?)$/.test(entry.name)) yield full
  }
}

/** Textos candidatos da linha para TECNICO: literais de string e texto JSX. */
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

/** Lê o literal que começa em `start` ('…', "…" ou `…`). Em template, cada `${…}` vira "x". */
function readLiteral(line, start) {
  const quote = line[start]
  let value = ''
  let i = start + 1
  while (i < line.length) {
    const c = line[i]
    if (c === '\\') {
      value += line.slice(i, i + 2)
      i += 2
    } else if (c === quote) {
      return { value, end: i + 1 }
    } else if (quote === '`' && c === '$' && line[i + 1] === '{') {
      i = skipExpression(line, i + 2)
      value += 'x'
    } else {
      value += c
      i++
    }
  }
  return { value, end: line.length }
}

/** Pula o conteúdo de `${…}` (com chaves e literais aninhados); devolve o índice depois do `}`. */
function skipExpression(line, start) {
  let depth = 1
  let i = start
  while (i < line.length) {
    const c = line[i]
    if (c === "'" || c === '"' || c === '`') {
      i = readLiteral(line, i).end
      continue
    }
    if (c === '{') depth++
    else if (c === '}' && --depth === 0) return i + 1
    i++
  }
  return line.length
}

/** Fim da regex literal que começa em `start`, ou -1 se a linha não fecha a regex. */
function regexEnd(line, start) {
  let inClass = false
  for (let i = start + 1; i < line.length; i++) {
    const c = line[i]
    if (c === '\\') i++
    else if (c === '[') inClass = true
    else if (c === ']') inClass = false
    else if (c === '/' && !inClass) {
      let end = i + 1
      while (/[a-z]/.test(line[end] ?? '')) end++
      return end
    }
  }
  return -1
}

/**
 * Lê a linha como código: separa os literais de string e tira comentários e regex literais.
 * Devolve o código sem comentários (literais preservados), os literais (com o código antes de
 * cada um) e se a linha termina dentro de um comentário de bloco.
 */
function scanLine(line) {
  let code = ''
  const literals = []
  let i = 0
  while (i < line.length) {
    const c = line[i]
    const next = line[i + 1]
    if (c === '/' && next === '/') break
    if (c === '/' && next === '*') {
      const end = line.indexOf('*/', i + 2)
      if (end < 0) return { code, literals, openComment: true }
      code += ' '
      i = end + 2
      continue
    }
    if (c === '/' && REGEX_START.test(code)) {
      const end = regexEnd(line, i)
      if (end > 0) {
        code += ' '
        i = end
        continue
      }
    }
    if (c === "'" || c === '"' || c === '`') {
      const { value, end } = readLiteral(line, i)
      literals.push({ value, before: code })
      code += line.slice(i, end)
      i = end
      continue
    }
    code += c
    i++
  }
  return { code, literals, openComment: false }
}

/**
 * Textos de tela da linha (fontes de GLOSSARIO e PT-PT):
 *   1. literal com espaço ou acento (não SQL, rota nem lista de classes);
 *   2. template: o trecho literal decide, com `${…}` trocado por "x";
 *   3. valor de propriedade de UI, mesmo com palavra única;
 *   4. chave não-UI (id, key, name…) só exclui valor sem espaço;
 *   5. em .tsx, texto JSX (sem as expressões {…} e as tags).
 * `prose: true` marca texto JSX solto (sem tag na linha): o termo só conta se estiver capitalizado,
 * se não for o primeiro da linha ou se vier seguido de espaço e outra palavra.
 */
function screenTextsOf(scan, isTsx) {
  const out = []
  for (const { value, before } of scan.literals) {
    if (NON_UI_KEY.test(before) && !/\s/.test(value.trim())) continue
    if (looksLikeUiText(value)) out.push({ text: value, prose: false })
    else if (UI_PROP_VALUE.test(before) && /\p{L}/u.test(value) && !SQL.test(value) && !isCodeLike(value)) {
      out.push({ text: value, prose: false })
    }
  }
  if (isTsx) out.push(...jsxTextsOf(scan.code))
  return out
}

/** Texto JSX da linha: tira as expressões {…} (inclusive aninhadas) e as tags; sobra o texto. */
function jsxTextsOf(code) {
  let s = code
  for (let prev = ''; prev !== s; ) {
    prev = s
    s = s.replace(/\{[^{}]*\}/g, ' ')
  }
  const parts = s.split(JSX_TAG)
  const nearTag = parts.length > 1
  const out = []
  for (const part of parts) {
    if (!/\p{L}/u.test(part)) continue
    if (JSX_CODE_SIGN.test(part.replace(/\((?:e?s)\)/g, ''))) continue
    if (JSX_KEYWORD_START.test(part) || /^\s*[.#@]/.test(part) || JSX_PROPERTY_LINE.test(part)) continue
    out.push({ text: part, prose: !nearTag })
  }
  return out
}

/** Em texto JSX solto, o termo conta se estiver capitalizado, não for o primeiro ou vier seguido de outra palavra. */
function proseTermCounts(text, index, length) {
  return (
    /^\p{Lu}/u.test(text[index]) ||
    text.slice(0, index).trim() !== '' ||
    /^\s+[\p{L}\p{N}]/u.test(text.slice(index + length))
  )
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

/** GLOSSARIO e PT-PT de um texto de tela. Cada achado: [categoria, termo, sugestão, bloqueia o CI]. */
function checkScreenText({ text, prose }) {
  const hits = []
  const counts = (m) => !prose || proseTermCounts(text, m.index, m[0].length)
  for (const m of text.matchAll(GLOSSARIO_TERM)) {
    if (counts(m)) hits.push(['GLOSSARIO', m[0], GLOSSARIO[m[0].toLowerCase()], true])
  }
  for (const m of text.matchAll(/[A-Za-zÀ-ú-]+/g)) {
    if (!counts(m)) continue
    const w = m[0].toLowerCase()
    if (Object.hasOwn(PT_PT_BLOQUEANTE, w)) hits.push(['PT-PT', m[0], PT_PT_BLOQUEANTE[w], true])
    else if (Object.hasOwn(PT_PT_RELATORIO, w)) hits.push(['PT-PT', m[0], PT_PT_RELATORIO[w], false])
  }
  const p = text.match(PT_PT_PROGRESSIVE)
  if (p && counts(p)) {
    hits.push(['PT-PT', p[0].trim(), 'gerúndio: "' + p[1].replace(/ar$/, 'ando').replace(/er$/, 'endo').replace(/ir$/, 'indo') + '"', false])
  }
  return hits
}

/** TECNICO de um texto candidato (extração de `textsOf`). */
function checkTechnical(text, uiProp) {
  const hits = []
  if (looksLikeUiText(text) || (uiProp && !SQL.test(text) && !isCodeLike(text))) {
    const t = text.match(TECH_WORDS)
    if (t) hits.push(['TECNICO', t[0], 'trocar por termo de negócio', false])
    // Nome de coluna/identificador só conta em frase (≥ 3 palavras), não em fragmento de código.
    const sentence = (text.match(/(?<![\w_.À-ú])[A-Za-zÀ-ú]{2,}(?![\w_.À-ú])/g) ?? []).length >= 3
    for (const re of sentence ? [UPPER_SNAKE, LOWER_SNAKE, CAMEL_ID] : [UPPER_SNAKE]) {
      const m = text.match(re)
      if (m && !/^(https?|www)/.test(m[0])) hits.push(['TECNICO', m[0], 'nome técnico (código/coluna/tabela)', false])
    }
  }
  return hits
}

/** O comentário da linha tem o marcador de exceção com motivo (ao menos uma letra)? */
function hasIgnoreMarker(line) {
  const m = line?.match(IGNORE_MARKER)
  return Boolean(m) && /\p{L}/u.test(m[1].replace(/\*\/.*$/, ''))
}

const only = !CI && typeof args.so === 'string' ? args.so.toUpperCase() : null
const rows = []
for (const dir of DIRS) {
  const base = join(ROOT, dir)
  if (!existsSync(base)) continue
  for (const file of walk(base)) {
    const lines = readFileSync(file, 'utf8').split(/\r?\n/)
    const isServer = dir.startsWith('server')
    const isTsx = file.endsWith('.tsx')
    let inBlockComment = false
    let inImportList = false
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
      const scan = scanLine(line)
      // Comentário de bloco aberto no meio da linha (ex.: `{/*` de JSX) continua nas próximas.
      if (scan.openComment) inBlockComment = true
      if (inImportList) {
        if (line.includes('}')) inImportList = false
        return
      }
      if (IMPORT_LIST_START.test(line)) {
        inImportList = true
        return
      }
      if (SKIP_LINE.test(line)) return
      if (isServer && SERVER_INTERNAL_ERROR.test(line)) return
      if (hasIgnoreMarker(line) || hasIgnoreMarker(lines[i - 1])) return
      const hits = []
      for (const text of screenTextsOf(scan, isTsx)) hits.push(...checkScreenText(text))
      const uiProp = UI_PROP.test(line)
      for (const text of textsOf(line, isTsx)) hits.push(...checkTechnical(text, uiProp))
      const seen = new Set()
      for (const [cat, term, hint, blocking] of hits) {
        if (CI ? !blocking : only && cat !== only) continue
        const key = cat + term
        if (seen.has(key)) continue
        seen.add(key)
        rows.push({ cat, file: relative(ROOT, file).replaceAll('\\', '/'), line: i + 1, term, hint, text: line.trim().slice(0, 160) })
      }
    })
  }
}

rows.sort((a, b) => a.cat.localeCompare(b.cat) || a.file.localeCompare(b.file) || a.line - b.line)
for (const r of rows) {
  console.log(`[${r.cat}] ${r.file}:${r.line}  «${r.term}» → ${r.hint}\n          ${r.text}`)
}
const count = (c) => rows.filter((r) => r.cat === c).length
console.log(
  CI
    ? `\nTotal bloqueante: ${rows.length}  (GLOSSARIO: ${count('GLOSSARIO')} · PT-PT: ${count('PT-PT')})`
    : `\nTotal: ${rows.length}  (GLOSSARIO: ${count('GLOSSARIO')} · PT-PT: ${count('PT-PT')} · TECNICO: ${count('TECNICO')})`,
)

if (typeof args.csv === 'string') {
  const esc = (v) => `"${String(v).replaceAll('"', '""')}"`
  const csv = ['categoria;arquivo;linha;termo;sugestao;trecho']
    .concat(rows.map((r) => [r.cat, r.file, r.line, r.term, r.hint, r.text].map(esc).join(';')))
    .join('\r\n')
  writeFileSync(resolve(process.cwd(), args.csv), '﻿' + csv, 'utf8')
  console.log(`CSV: ${args.csv}`)
}
process.exitCode = rows.length ? 1 : 0
