/**
 * Gerador oficial do Manual do Usuário SGP+ em HTML.
 *
 * Fonte:  docs/manual/source/MANUAL_USUARIO_SGP.md (canônica — nunca é escrita por este script)
 * Saída:  docs/manual/manual-usuario.html (artefato derivado — não editar à mão)
 *
 * Uso:
 *   npm run manual:usuario:html          gera o HTML e valida a estrutura
 *   npm run manual:usuario:html:check    só valida: falha se o HTML em disco estiver
 *                                        desatualizado em relação à fonte ou inválido
 *
 * A saída é determinística: mesma fonte gera o mesmo HTML, byte a byte
 * (sem data de geração nem qualquer valor variável).
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Marked } from 'marked'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE_REL = 'docs/manual/source/MANUAL_USUARIO_SGP.md'
const OUTPUT_REL = 'docs/manual/manual-usuario.html'
const SOURCE = resolve(ROOT, SOURCE_REL)
const OUTPUT = resolve(ROOT, OUTPUT_REL)
const EXPECTED_CHAPTERS = 21
const IMAGE_PLACEHOLDER_PREFIX = '[IMAGEM SUGERIDA:'

const CHAPTER_RE = /^(\d+)\.\s+(.+)$/
const CHAPTER_PREFIX_RE = /^\d+\.\s+/
const NUMBERED_SECTION_RE = /^(\d+)\.(\d+)\s+/

function slugify(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, '')
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function createMarked({ breaks }) {
  const marked = new Marked({ gfm: true, breaks })
  marked.use({
    renderer: {
      heading(token) {
        const level = Math.min(token.depth + 1, 6)
        const inner = this.parser.parseInline(token.tokens)
        const id = token.anchorId ? ` id="${token.anchorId}"` : ''
        if (token.chapterNumber) {
          const title = inner.replace(CHAPTER_PREFIX_RE, '')
          return `<h${level}${id} class="chapter-title"><span class="num">${token.chapterNumber}</span> ${title}</h${level}>\n`
        }
        return `<h${level}${id}>${inner}</h${level}>\n`
      },
      paragraph(token) {
        if (token.text.startsWith(IMAGE_PLACEHOLDER_PREFIX)) {
          return `<p class="image-placeholder">${this.parser.parseInline(token.tokens)}</p>\n`
        }
        return false
      },
      blockquote(token) {
        return `<blockquote class="callout">\n${this.parser.parse(token.tokens)}</blockquote>\n`
      },
    },
  })
  return marked
}

function wrapTables(html) {
  return html.replace(/<table>/g, '<div class="table-wrap">\n<table>').replace(/<\/table>/g, '</table>\n</div>')
}

function readSource() {
  return readFileSync(SOURCE, 'utf8')
}

/**
 * Divide a fonte em: título, preâmbulo (metadados do topo) e capítulos (`# N. Título`).
 * Atribui IDs estáveis: `cap-N` para capítulos, `sec-N-M` para seções numeradas e
 * `cap-N-<slug>` (com sufixo `-2`, `-3`… se repetido no capítulo) para os demais títulos.
 */
function buildDocument(source) {
  const bodyMarked = createMarked({ breaks: false })
  const preambleMarked = createMarked({ breaks: true })
  const tokens = bodyMarked.lexer(source)

  let title = null
  const preamble = []
  const chapters = []
  let current = null

  for (const token of tokens) {
    if (token.type === 'heading' && token.depth === 1) {
      const match = token.text.match(CHAPTER_RE)
      if (!match) {
        if (title !== null || current) {
          throw new Error(`Título de nível 1 inesperado (fora do padrão "# N. Título"): "${token.text}"`)
        }
        title = token.text
        continue
      }
      const number = Number(match[1])
      token.chapterNumber = number
      token.anchorId = `cap-${number}`
      current = { number, heading: token, titleText: match[2], tokens: [token], sections: [], usedSlugs: new Map() }
      chapters.push(current)
      continue
    }
    if (!current) {
      if (token.type !== 'hr') preamble.push(token)
      continue
    }
    if (token.type === 'heading') {
      const numbered = token.text.match(NUMBERED_SECTION_RE)
      let id
      if (token.depth === 2 && numbered) {
        id = `sec-${numbered[1]}-${numbered[2]}`
      } else {
        const base = `cap-${current.number}-${slugify(token.text) || 'secao'}`
        const count = (current.usedSlugs.get(base) ?? 0) + 1
        current.usedSlugs.set(base, count)
        id = count === 1 ? base : `${base}-${count}`
      }
      token.anchorId = id
      if (token.depth === 2) current.sections.push({ id, token })
    }
    current.tokens.push(token)
  }

  if (title === null) throw new Error('Título principal (# ...) não encontrado na fonte.')

  for (const chapter of chapters) {
    while (chapter.tokens.length && ['hr', 'space'].includes(chapter.tokens.at(-1).type)) chapter.tokens.pop()
  }

  const revision = source.match(/\*\*Revisão deste manual:\*\*\s*(\S+)/)?.[1] ?? null
  const appVersion = source.match(/\*\*Versão da aplicação nesta revisão:\*\*\s*(\S+)/)?.[1] ?? null

  const preambleHtml = wrapTables(preambleMarked.parse(preamble.map((token) => token.raw).join('')))
  const chaptersHtml = chapters.map((chapter) => ({
    ...chapter,
    titleHtml: bodyMarked.parseInline(chapter.titleText),
    sectionsHtml: chapter.sections.map(({ id, token }) => ({ id, label: bodyMarked.parseInline(token.text) })),
    html: wrapTables(bodyMarked.parser(chapter.tokens)),
  }))

  return { title, revision, appVersion, preambleHtml, chapters: chaptersHtml }
}

function renderToc(chapters) {
  const items = chapters
    .map((chapter) => {
      const subs = chapter.sectionsHtml
        .map(({ id, label }) => `<a href="#${id}">${stripTags(label)}</a>`)
        .join('<span class="sep" aria-hidden="true"> · </span>')
      const subBlock = subs ? `\n        <div class="toc-sub">${subs}</div>` : ''
      return `      <li>\n        <a class="toc-chapter" href="#cap-${chapter.number}"><span class="toc-num">${chapter.number}</span>${stripTags(chapter.titleHtml)}</a>${subBlock}\n      </li>`
    })
    .join('\n')
  return `  <nav class="toc" id="indice" aria-label="Índice">\n    <div class="toc-title">Índice</div>\n    <ol>\n${items}\n    </ol>\n  </nav>`
}

function renderHtml(doc) {
  const chaptersMarkup = doc.chapters
    .map(
      (chapter) =>
        `  <section class="chapter" aria-labelledby="cap-${chapter.number}">\n${chapter.html}<p class="back-to-top"><a href="#indice">↑ Voltar ao índice</a></p>\n  </section>`,
    )
    .join('\n\n')

  const footerLeft = `Gerado a partir de <code>${SOURCE_REL}</code>`
  const footerRight = doc.revision ? `Revisão ${escapeHtml(doc.revision)}` : ''

  return `<!DOCTYPE html>
<!--
  ARQUIVO GERADO — NÃO EDITAR MANUALMENTE.
  Fonte canônica: ${SOURCE_REL}
  Regenerar com: npm run manual:usuario:html
-->
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="generator" content="scripts/generate-manual-usuario-html.mjs" />
  <title>${escapeHtml(doc.title)}</title>
  <style>
${CSS}
  </style>
</head>
<body>
<div class="page-wrap">

  <header class="doc-header">
    <div class="badge">SGP+ · Manual do Usuário</div>
    <h1>${escapeHtml(doc.title)}</h1>
    <div class="doc-meta">
${doc.preambleHtml}    </div>
  </header>

${renderToc(doc.chapters)}

  <main>
${chaptersMarkup}
  </main>

  <footer class="doc-footer">
    <span>${footerLeft}</span>
    <span>${footerRight}</span>
  </footer>

</div>
</body>
</html>
`
}

const CSS = `    :root {
      --gold:        #c9a227;
      --gold-dim:    #a07e18;
      --navy:        #101824;
      --void:        #050a12;
      --blue-bright: #3e7baa;
      --emerald:     #34d399;
      --surface:     #141e2b;
      --surface-2:   #1a2637;
      --border:      rgba(255,255,255,0.08);
      --text:        #e2e8f0;
      --text-muted:  #94a3b8;
      --font-title:  'Montserrat', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      --font-body:   'Open Sans', 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      --font-mono:   'Cascadia Mono', Consolas, 'Courier New', monospace;
    }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    html { scroll-behavior: smooth; }

    body {
      background: var(--void);
      color: var(--text);
      font-family: var(--font-body);
      font-size: 15px;
      line-height: 1.7;
      overflow-wrap: break-word;
    }

    .page-wrap {
      max-width: 920px;
      margin: 0 auto;
      padding: 48px 24px 80px;
    }

    a { color: var(--blue-bright); }
    a:hover { color: var(--gold); }

    /* ── Header ── */
    .doc-header {
      border-bottom: 1px solid var(--border);
      padding-bottom: 28px;
      margin-bottom: 40px;
    }
    .doc-header .badge {
      display: inline-block;
      font-family: var(--font-title);
      font-size: 11px;
      font-weight: 700;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: var(--gold);
      border: 1px solid rgba(201,162,39,.35);
      background: rgba(201,162,39,.08);
      border-radius: 4px;
      padding: 3px 10px;
      margin-bottom: 14px;
    }
    .doc-header h1 {
      font-family: var(--font-title);
      font-size: 2rem;
      font-weight: 700;
      color: #fff;
      line-height: 1.2;
      margin-bottom: 16px;
    }
    .doc-meta { color: var(--text-muted); font-size: 14px; }
    .doc-meta p { margin-bottom: 12px; }
    .doc-meta strong { color: var(--text); }

    /* ── Índice ── */
    .toc {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 20px 24px;
      margin-bottom: 48px;
    }
    .toc-title {
      font-family: var(--font-title);
      font-size: 12px;
      font-weight: 700;
      letter-spacing: .08em;
      text-transform: uppercase;
      color: var(--text-muted);
      margin-bottom: 12px;
    }
    .toc ol { list-style: none; }
    .toc li { padding: 6px 0; border-bottom: 1px solid var(--border); }
    .toc li:last-child { border-bottom: none; }
    .toc a { color: var(--blue-bright); text-decoration: none; }
    .toc a:hover { color: var(--gold); text-decoration: underline; }
    .toc-chapter { font-weight: 600; font-size: 14px; display: inline-flex; gap: 10px; align-items: baseline; }
    .toc-num {
      display: inline-block;
      min-width: 26px;
      text-align: center;
      font-family: var(--font-title);
      font-size: 12px;
      color: var(--gold);
      background: rgba(201,162,39,.15);
      border-radius: 6px;
      padding: 1px 4px;
    }
    .toc-sub { margin: 4px 0 2px 36px; font-size: 12.5px; line-height: 1.8; color: var(--text-muted); }
    .toc-sub .sep { color: var(--text-muted); }

    /* ── Capítulos ── */
    .chapter {
      margin-bottom: 56px;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--border);
    }

    h2, h3, h4, h5, h6 { font-family: var(--font-title); scroll-margin-top: 24px; }

    h2 {
      font-size: 1.35rem;
      font-weight: 700;
      color: var(--gold);
      border-bottom: 1px solid rgba(201,162,39,.2);
      padding-bottom: 8px;
      margin-bottom: 20px;
    }
    h2 .num {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 30px;
      height: 30px;
      padding: 0 4px;
      background: rgba(201,162,39,.15);
      border-radius: 6px;
      font-size: 14px;
      margin-right: 8px;
      vertical-align: middle;
    }
    h3 {
      font-size: 1.05rem;
      font-weight: 700;
      color: #fff;
      margin: 32px 0 12px;
    }
    h4 {
      font-size: .95rem;
      font-weight: 600;
      color: #cbd5e1;
      margin: 24px 0 10px;
    }
    h5, h6 {
      font-size: .88rem;
      font-weight: 600;
      color: var(--text-muted);
      margin: 20px 0 8px;
    }

    p { margin-bottom: 14px; }
    strong { color: #f1f5f9; }

    ul, ol { padding-left: 24px; margin-bottom: 14px; }
    li { margin-bottom: 4px; }
    li > ul, li > ol { margin: 4px 0 4px; }

    code {
      font-family: var(--font-mono);
      font-size: 13px;
      background: rgba(62,123,170,.18);
      color: #93c5fd;
      padding: 2px 6px;
      border-radius: 4px;
    }
    pre {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 18px 22px;
      margin-bottom: 18px;
      overflow-x: auto;
    }
    pre code {
      background: none;
      padding: 0;
      color: #cbd5e1;
      line-height: 1.8;
      white-space: pre;
    }

    hr { border: none; border-top: 1px solid var(--border); margin: 28px 0; }

    /* ── Tabelas ── */
    .table-wrap { overflow-x: auto; margin-bottom: 18px; border: 1px solid var(--border); border-radius: 8px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    thead th {
      background: var(--surface-2);
      color: var(--text-muted);
      font-weight: 600;
      font-size: 12px;
      letter-spacing: .04em;
      text-transform: uppercase;
      padding: 10px 14px;
      text-align: left;
      border-bottom: 1px solid var(--border);
    }
    tbody td {
      padding: 10px 14px;
      border-bottom: 1px solid var(--border);
      vertical-align: top;
      min-width: 120px;
    }
    tbody tr:last-child td { border-bottom: none; }
    tbody tr:hover { background: rgba(255,255,255,.025); }

    /* ── Avisos ── */
    .callout {
      background: rgba(62,123,170,.12);
      border-left: 3px solid var(--blue-bright);
      border-radius: 8px;
      padding: 14px 18px;
      margin-bottom: 18px;
      font-size: 14px;
      color: #dbeafe;
    }
    .callout p:last-child { margin-bottom: 0; }
    .callout strong { color: #fff; }

    .image-placeholder {
      border: 1px dashed rgba(148,163,184,.35);
      border-radius: 8px;
      padding: 10px 14px;
      font-size: 12.5px;
      color: var(--text-muted);
      font-style: italic;
    }

    .back-to-top { font-size: 12px; text-align: right; margin-top: 8px; }
    .back-to-top a { text-decoration: none; color: var(--text-muted); }
    .back-to-top a:hover { color: var(--gold); }

    .doc-footer {
      margin-top: 64px;
      padding-top: 24px;
      border-top: 1px solid var(--border);
      font-size: 12px;
      color: var(--text-muted);
      display: flex;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 8px;
    }

    @media (max-width: 600px) {
      .page-wrap { padding: 28px 14px 56px; }
      .doc-header h1 { font-size: 1.6rem; }
      h2 { font-size: 1.15rem; }
      .toc { padding: 16px; }
      .toc-sub { margin-left: 0; }
    }

    @media print {
      :root { --border: #cbd5e1; --text-muted: #475569; }
      html { scroll-behavior: auto; }
      body { background: #fff; color: #111; font-size: 11pt; }
      .page-wrap { max-width: none; padding: 0; }
      .doc-header h1, h3, strong, .callout strong, .doc-meta strong { color: #111; }
      h2 { color: #7a5c0c; border-bottom-color: #c9a227; }
      h4 { color: #334155; }
      a { color: #1d4ed8; text-decoration: none; }
      .toc, pre, thead th { background: #f8fafc; }
      .toc { break-after: page; }
      .chapter { break-before: page; border-bottom: none; }
      h2, h3, h4, h5 { break-after: avoid; }
      tr, pre, .callout, .image-placeholder { break-inside: avoid; }
      code { background: #eef2f7; color: #1e3a8a; }
      pre code { color: #111; }
      .callout { background: #eff6ff; color: #111; border-left-color: #3e7baa; }
      .table-wrap { overflow: visible; }
      tbody tr:hover { background: none; }
      .back-to-top { display: none; }
    }`

/** Validação estrutural do HTML gerado. Retorna a lista de problemas (vazia = válido). */
function validate(html, doc) {
  const problems = []
  const must = [
    [/^<!DOCTYPE html>/i, 'DOCTYPE ausente'],
    [/<html lang="pt-BR">/, '<html lang="pt-BR"> ausente'],
    [/<head>[\s\S]*<\/head>/, '<head> ausente'],
    [/<body>[\s\S]*<\/body>/, '<body> ausente'],
    [/<meta charset="UTF-8"/i, 'charset UTF-8 ausente'],
    [/<title>[^<]+<\/title>/, '<title> ausente ou vazio'],
    [/<\/html>\s*$/, '</html> ausente no final'],
  ]
  for (const [re, message] of must) if (!re.test(html)) problems.push(message)

  const h1Count = (html.match(/<h1[\s>]/g) ?? []).length
  if (h1Count !== 1) problems.push(`esperado exatamente 1 <h1>, encontrado ${h1Count}`)

  const numbers = doc.chapters.map((chapter) => chapter.number)
  const expected = Array.from({ length: EXPECTED_CHAPTERS }, (_, i) => i + 1)
  if (numbers.join(',') !== expected.join(',')) {
    problems.push(`capítulos fora do esperado: [${numbers.join(', ')}] (esperado 1 a ${EXPECTED_CHAPTERS}, em ordem)`)
  }
  for (const n of expected) {
    if (!html.includes(`<h2 id="cap-${n}" class="chapter-title">`)) problems.push(`título do capítulo ${n} ausente no HTML`)
    if (!html.includes(`href="#cap-${n}"`)) problems.push(`capítulo ${n} ausente no índice`)
  }

  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])
  const idSet = new Set(ids)
  const duplicated = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))]
  if (duplicated.length) problems.push(`IDs duplicados: ${duplicated.join(', ')}`)

  const internalLinks = [...html.matchAll(/href="#([^"]*)"/g)].map((m) => m[1])
  const broken = [...new Set(internalLinks.filter((target) => !idSet.has(target)))]
  if (broken.length) problems.push(`links internos sem destino: ${broken.map((t) => `#${t}`).join(', ')}`)

  const external = [...html.matchAll(/<(?:link|script|img|iframe)\b[^>]*(?:href|src)="(https?:)?\/\//gi)]
  if (external.length) problems.push(`dependência de rede encontrada (${external.length} referência(s) externas)`)

  if (/PENDENTE DE ENRIQUECIMENTO/i.test(html)) problems.push('marcador "PENDENTE DE ENRIQUECIMENTO" presente')
  if (html.includes('\uFFFD')) problems.push('caractere de substituição U+FFFD presente (acentuação corrompida)')
  if (/Ã[\u0080-\u00BF]|Â[\u0080-\u00BF]/.test(html)) problems.push('sequência típica de mojibake (UTF-8 lido como Latin-1) presente')

  if (!doc.revision) problems.push('linha "Revisão deste manual" não encontrada na fonte')
  else if (!html.includes(doc.revision)) problems.push(`revisão ${doc.revision} ausente no HTML`)

  return problems
}

function main() {
  const checkOnly = process.argv.includes('--check')
  const sourceBefore = readSource()
  const doc = buildDocument(sourceBefore)
  const html = renderHtml(doc)

  if (readSource() !== sourceBefore) {
    throw new Error(`A fonte ${SOURCE_REL} mudou durante a geração. Abortado.`)
  }

  const problems = validate(html, doc)

  if (checkOnly) {
    if (!existsSync(OUTPUT)) problems.push(`${OUTPUT_REL} não existe — rode npm run manual:usuario:html`)
    else if (readFileSync(OUTPUT, 'utf8') !== html) {
      problems.push(`${OUTPUT_REL} está desatualizado em relação à fonte — rode npm run manual:usuario:html`)
    }
  }

  if (problems.length) {
    console.error(`Manual do usuário: ${problems.length} problema(s) encontrado(s):`)
    for (const problem of problems) console.error(`  - ${problem}`)
    process.exit(1)
  }

  if (!checkOnly) writeFileSync(OUTPUT, html, 'utf8')

  const sectionCount = doc.chapters.reduce((sum, chapter) => sum + chapter.sectionsHtml.length, 0)
  const verb = checkOnly ? 'Validado (em dia com a fonte)' : 'Gerado'
  console.log(`${verb}: ${OUTPUT_REL}`)
  console.log(`  título: ${doc.title}`)
  console.log(`  revisão: ${doc.revision} · versão da aplicação: ${doc.appVersion ?? '—'}`)
  console.log(`  capítulos: ${doc.chapters.length} · seções no índice: ${sectionCount}`)
  console.log(`  tamanho: ${Buffer.byteLength(html, 'utf8')} bytes`)
}

main()
