/**
 * Contrato do gate de linguagem controlada (`scripts/auditar-textos-tela.mjs`).
 * O script roda como processo: importar o módulo executaria a varredura.
 * As fixtures são criadas em tempo de execução num diretório temporário. Não versionar fixture
 * .ts/.tsx (o ESLint aplica regras a esses arquivos). O teste não depende do conteúdo do repositório.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterAll, describe, expect, it } from 'vitest'

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), 'auditar-textos-tela.mjs')
const TMP = mkdtempSync(join(tmpdir(), 'auditoria-textos-'))

afterAll(() => {
  rmSync(TMP, { recursive: true, force: true })
})

/** Cria `<TMP>/<nome>` com os arquivos `{ 'src/a.tsx': ['linha 1', …] }`. */
function makeRoot(name, files) {
  const root = join(TMP, name)
  for (const [rel, lines] of Object.entries(files)) {
    const full = join(root, rel)
    mkdirSync(dirname(full), { recursive: true })
    writeFileSync(full, lines.join('\n') + '\n', 'utf8')
  }
  return root
}

function run(root, ...args) {
  const r = spawnSync(process.execPath, [SCRIPT, `--raiz=${root}`, ...args], { encoding: 'utf8' })
  const findings = [...r.stdout.matchAll(/^\[([A-Z-]+)\] (\S+):(\d+) {2}«(.+?)» → (.*)$/gm)].map((m) => ({
    cat: m[1],
    file: m[2],
    line: Number(m[3]),
    term: m[4],
    hint: m[5],
  }))
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, findings }
}

/** Linhas de [id, texto, categoria, termos esperados] → conteúdo do arquivo + linha de cada caso. */
function layout(cases) {
  return {
    lines: cases.map(([, text]) => text),
    cases: cases.map(([id, , cat, terms], i) => ({ id, line: i + 1, cat, terms })),
  }
}

const screenTerms = (findings, file, line) =>
  findings
    .filter((f) => f.file === file && f.line === line && (f.cat === 'GLOSSARIO' || f.cat === 'PT-PT'))
    .map((f) => `${f.cat}:${f.term}`)
    .sort()

// F-P (GLOSSARIO) e F-Q (PT-PT bloqueante): reportados no padrão e no --ci.
const POSITIVOS = {
  'src/a.tsx': layout([
    ['P1', '<p className="mt-1">STEP: {stepStatus}</p>', 'GLOSSARIO', ['STEP']],
    ['P2', '<th className="py-2">{labels.previsto} (STEPS)</th>', 'GLOSSARIO', ['STEPS']],
    ['P3', '          {labels.previsto} (STEPS)', 'GLOSSARIO', ['STEPS']],
    ['P4', '            (step): {real}', 'GLOSSARIO', ['step']],
    ['P5', "              {labels.previsto} (step):{' '}", 'GLOSSARIO', ['step']],
    ['P6', '          Step · equipe e apontamentos', 'GLOSSARIO', ['Step']],
    ['P7', "          matriz · step{' '}", 'GLOSSARIO', ['step']],
    ['P8', "        Etapa: {rs.step ?? 'Não informado'} · Tempo: {fmt(rs.plannedMinutes)} ·", 'GLOSSARIO', ['Etapa']],
    ['P9', "                      Etapa{' '}", 'GLOSSARIO', ['Etapa']],
    ['P10', '                  ({a.activities.length} etapa(s), {fmt(a.plannedMinutes)})', 'GLOSSARIO', ['etapa']],
    ['P11', "            Tipo: {subtree.rootNodeType} · Áreas: {subtree.totalAreas} · Etapas:{' '}", 'GLOSSARIO', ['Etapas']],
    ['P12', "          Ordem: {labels.previsto} (etapas) ·{' '}", 'GLOSSARIO', ['etapas']],
    ['P13', '          Por colaborador: {labels.previsto} = soma das etapas alocadas; minutos', 'GLOSSARIO', ['etapas']],
    ['P14', '            Realizado na etapa: <span className="text-slate-300">{real}</span>', 'GLOSSARIO', ['etapa']],
    ['P15', '                        <label className="text-[10px] uppercase">Etapa</label>', 'GLOSSARIO', ['Etapa']],
    ['P16', '          Etapa 1 · Partes do serviço', 'GLOSSARIO', ['Etapa']],
    ['P17', '                  etapas anteriores pendentes.', 'GLOSSARIO', ['etapas']],
    ['P18', '                  name={`${labels.previsto} (etapas)`}', 'GLOSSARIO', ['etapas']],
    ['P19', '      aria-label="Etapas da Nova Esteira"', 'GLOSSARIO', ['Etapas']],
    ['P20', '      aria-label={`Etapa ${n} de ${total}`}', 'GLOSSARIO', ['Etapa']],
    ['P21', '      <button title={`Voltar ao Kiosk ${nome}`}>', 'GLOSSARIO', ['Kiosk']],
    ['P22', '<p className="text-sm">Voltando ao Kiosk…</p>', 'GLOSSARIO', ['Kiosk']],
    ['P23', '        subtitle="com etapas alcançadas por membership de equipe"', 'GLOSSARIO', ['etapas', 'membership']],
    ['Q1', '<h3 className="text-sm">Factos extraídos</h3>', 'PT-PT', ['Factos']],
    ['Q2', '               Estrutura proposta. Edite títulos e tempos planeados', 'PT-PT', ['planeados']],
    ['Q5', '           Ficheiro: {nome} · Planeamento: {x}', 'PT-PT', ['Ficheiro', 'Planeamento']],
    ['Q6', '       <Tab label="Ficheiros" />', 'PT-PT', ['Ficheiros']],
  ]),
  'src/b.ts': layout([
    ['P24', '        m.set(st.id, name || `Etapa ${st.orderIndex}`)', 'GLOSSARIO', ['Etapa']],
    ['P25', '      metric: `${labels.previsto} (etapas)`,', 'GLOSSARIO', ['etapas']],
    ['P26', '    return `Aguardando etapa ${title}`', 'GLOSSARIO', ['etapa']],
    ['P27', "  { key: 'a', label: 'Etapa' },", 'GLOSSARIO', ['Etapa']],
    ['P28', "  pendenciaTempoStep: 'Pendência de tempo (etapa)',", 'GLOSSARIO', ['etapa']],
    ['Q3', "    toast('Não foi possível registar o apontamento.')", 'PT-PT', ['registar']],
    ['Q4', "  const msg = 'Utilizador sem acesso ao ecrã.'", 'PT-PT', ['Utilizador', 'ecrã']],
  ]),
  'server/src/c.ts': layout([
    ['P29', '      sequenceWarningLabel: `Etapa anterior pendente: ${title}`,', 'GLOSSARIO', ['Etapa']],
    ['P30', "    throw new AppError('Etapa não encontrada nesta esteira.', 404, ErrorCodes.NOT_FOUND)", 'GLOSSARIO', ['Etapa']],
    [
      'P31',
      "      'O resumo inclui pelo menos uma etapa alcançada por alocação em equipe (membership de time).',",
      'GLOSSARIO',
      ['etapa', 'membership'],
    ],
    ['P32', "        message: 'Colaborador duplicado na etapa.',", 'GLOSSARIO', ['etapa']],
  ]),
}

// F-N: nenhum GLOSSARIO ou PT-PT em nenhum modo (casos de código real).
const NEGATIVOS = {
  'src/n.tsx': [
    "{rs.step ?? 'Não informado'}",
    "{alt.sector ?? '—'} · {alt.step ?? '—'} · {fmt(alt.plannedMinutes)}{' '}",
    "type Step = 'search' | 'confirm'",
    "{step === 'success' ? (",
    ") : step === 'review' && candidate ? (",
    'variant="kiosk"',
    '{[...ar.etapas]',
    "export type CriarMatrizEtapaId = 'dados' | 'estrutura' | 'revisao'",
    '  etapa: NovaEsteiraEtapaPersistida',
    '  etapa,',
    '  steps,',
    '  steps: JornadaStepDefinition[]',
    '          kiosk',
    '    [loading, step, setActivePin, submitConfirm],',
    '                step={1}',
    "aria-current={aba === t ? 'step' : undefined}",
    'id={`sgp-step-${st.id}`}   idPrefix={`kiosk-outra-atividade-justificativa-${c.stepNodeId}`}   menuKey={`step-abort-reason-${row.code}`}',
    'aria-labelledby="abort-step-title"   data-testid="kiosk-activity-list-scroll"   data-sgp-surface="kiosk"',
    'to={`/app/esteiras/${id}?step=${s.stepId}`}',
    '// Conclui a etapa (STEP) no Kiosk',
    '/** Alocação por etapa — membership de time */',
    '/**',
    ' * etapa STEP Kiosk (em bloco)',
    ' */',
    '{/* etapa antiga do Kiosk */}',
    "import { NovaEsteiraEtapaDraft } from '../mocks/x'",
    "import type { StepAnaliticoDetalhe } from './step-analitico.types'",
    "console.warn('Etapa sem STEP no Kiosk')",
    "logger.info('membership de time recalculada')",
    '<Step',
    'function Step({',
    'const nEtapas = countStepsInRoots(manualRoots)',
  ],
  'src/n.ts': [
    'const n = ar.etapas.map((e) => e.id)',
    "  { type: 'STEP', id: 'x' },",
    "  appendKind: 'STEP',",
    "const PATH = '/api/v1/conveyors/step-abort-reasons'",
    "return { 'X-SGP-Kiosk-Token': token }",
    String.raw`const RE = /\[Planeamento\]\s*Tempo total previsto:\s*\d+\s*min/gi`,
    '// Conclui a etapa (STEP) no Kiosk',
    "console.warn('Etapa sem STEP no Kiosk')",
  ],
  'server/src/n.ts': [
    "if (row.node_type !== 'STEP') {",
    "throw new Error('Fingerprint STEP exige step.')",
    "logger.info('membership de time recalculada')",
    'const sql = `',
    '  SELECT step.id FROM conveyor_nodes step',
    "  WHERE step.node_type = 'STEP' AND step.name = 'Etapa padrão'",
    '`',
  ],
  'src/mocks/m.ts': ["const t = 'Toda etapa precisa de um título.'"],
  'src/f/x.test.ts': ["const t = 'Aguardando etapa X'"],
  'server/src/tests/y.ts': ["const t = 'Etapa 1'"],
  'server/src/config/z.ts': ["const t = 'sem proteção kiosk'"],
}

// F-R (PT-PT só relatório) e F-T (TECNICO): aparecem só no modo padrão.
const RELATORIO = {
  'src/r.ts': layout([
    ['R1', "const a = 'Guardar alterações'", 'PT-PT', ['Guardar']],
    ['R2', "const b = 'A carregar dados…'", 'PT-PT', ['A carregar']],
    ['R3', "const c = 'Membros da equipa'", 'PT-PT', ['equipa']],
    ['R4', "const d = 'Gerir permissões'", 'PT-PT', ['Gerir']],
  ]),
  'src/b.ts': layout([['T1', "const e = 'Valor null recebido do backend'", 'TECNICO', []]]),
  'src/a.tsx': layout([['T2', '      title="Situação EM_ANDAMENTO"', 'TECNICO', []]]),
}

// F-M: marcador `auditoria-textos: ignorar — <motivo>`.
const MARCADOR = {
  'src/m.ts': [
    'const ok =',
    "  m.includes('utilizador sem colaborador') || // auditoria-textos: ignorar — reconhece mensagem legada do servidor",
    '  false',
    '// auditoria-textos: ignorar — fórmula técnica não exibida',
    "  'realizado nos steps alocados × STEP; null se previsto ≤ 0'",
    '// auditoria-textos: ignorar',
    "const m4 = 'Etapa não encontrada.'",
    '/* auditoria-textos: ignorar — */',
    "const m5 = 'Etapa não encontrada.'",
    '// auditoria-textos: ignorar — motivo válido',
    'const outra = 1',
    "const m6 = 'Etapa não encontrada.'",
    '/* auditoria-textos: ignorar — rótulo legado */',
    "const m7 = 'Etapa não encontrada.'",
  ],
  'src/m.tsx': ['{/* auditoria-textos: ignorar — rótulo legado */}', '<span className="x">Etapa · </span>'],
}
const MARCADOR_IGNORADOS = [
  ['M1', 'src/m.ts', 2],
  ['M2', 'src/m.ts', 5],
  ['M3', 'src/m.tsx', 2],
  ['M7 (bloco)', 'src/m.ts', 14],
]
const MARCADOR_REPORTADOS = [
  ['M4', 'src/m.ts', 7],
  ['M5', 'src/m.ts', 9],
  ['M6', 'src/m.ts', 12],
]

const filesOf = (spec) => Object.fromEntries(Object.entries(spec).map(([file, v]) => [file, v.lines ?? v]))
const casesOf = (spec) => Object.entries(spec).flatMap(([file, v]) => v.cases.map((c) => ({ ...c, file })))

describe('auditar-textos-tela — GLOSSARIO e PT-PT bloqueante (F-P, F-Q)', () => {
  const root = makeRoot('positivos', filesOf(POSITIVOS))
  const padrao = run(root)
  const ci = run(root, '--ci')

  it.each(casesOf(POSITIVOS).map((c) => [c.id, c]))('%s é reportado com categoria e termo', (_id, c) => {
    const expected = c.terms.map((t) => `${c.cat}:${t}`).sort()
    expect(screenTerms(padrao.findings, c.file, c.line)).toEqual(expected)
    expect(screenTerms(ci.findings, c.file, c.line)).toEqual(expected)
  })

  it('P8 não reporta «step» (conteúdo de {…} nunca é examinado)', () => {
    const p8 = casesOf(POSITIVOS).find((c) => c.id === 'P8')
    for (const out of [padrao, ci]) {
      expect(out.findings.filter((f) => f.line === p8.line && f.file === p8.file && /^steps?$/i.test(f.term))).toEqual([])
    }
  })

  it('sugestões do GLOSSARIO', () => {
    const hint = (term) => padrao.findings.find((f) => f.cat === 'GLOSSARIO' && f.term === term)?.hint
    expect(hint('STEP')).toBe('usar "atividade"')
    expect(hint('Etapa')).toBe('usar "atividade" (unidade de trabalho) ou "passo" (assistente)')
    expect(hint('Kiosk')).toBe('usar "Modo Fábrica"')
    expect(hint('membership')).toBe('usar "participação em equipe"')
  })

  it('--ci sai com 1, não lista TECNICO e resume só o bloqueante', () => {
    expect(ci.status).toBe(1)
    expect(ci.findings.some((f) => f.cat === 'TECNICO')).toBe(false)
    const g = ci.findings.filter((f) => f.cat === 'GLOSSARIO').length
    const p = ci.findings.filter((f) => f.cat === 'PT-PT').length
    expect(ci.stdout).toContain(`Total bloqueante: ${g + p}  (GLOSSARIO: ${g} · PT-PT: ${p})`)
  })

  it('--ci ignora --so', () => {
    const out = run(root, '--ci', '--so=TECNICO')
    expect(out.findings.length).toBe(ci.findings.length)
    expect(out.findings.some((f) => f.cat === 'GLOSSARIO')).toBe(true)
  })

  it('C7: caminho relativo à raiz, com "/", e resumo com a contagem de GLOSSARIO', () => {
    expect(padrao.status).toBe(1)
    expect(padrao.findings.some((f) => f.file === 'server/src/c.ts')).toBe(true)
    expect(padrao.findings.every((f) => !f.file.includes('\\') && !f.file.startsWith('/'))).toBe(true)
    const n = (cat) => padrao.findings.filter((f) => f.cat === cat).length
    expect(padrao.stdout).toContain(
      `Total: ${padrao.findings.length}  (GLOSSARIO: ${n('GLOSSARIO')} · PT-PT: ${n('PT-PT')} · TECNICO: ${n('TECNICO')})`,
    )
    expect(n('GLOSSARIO')).toBeGreaterThan(0)
  })

  it('C8: nenhum achado TECNICO tem termo STEP/step', () => {
    expect(padrao.findings.filter((f) => f.cat === 'TECNICO' && /^steps?$/i.test(f.term))).toEqual([])
  })

  it('C5: --so=GLOSSARIO só imprime linhas [GLOSSARIO]', () => {
    const out = run(root, '--so=GLOSSARIO')
    const tagged = out.stdout.split('\n').filter((l) => l.startsWith('['))
    expect(tagged.length).toBeGreaterThan(0)
    expect(tagged.every((l) => l.startsWith('[GLOSSARIO] '))).toBe(true)
    expect(out.status).toBe(1)
  })
})

describe('auditar-textos-tela — negativos (F-N)', () => {
  const root = makeRoot('negativos', NEGATIVOS)

  it('C4: --ci sai com 0', () => {
    const out = run(root, '--ci')
    expect(out.stderr).toBe('')
    expect(out.findings).toEqual([])
    expect(out.stdout).toContain('Total bloqueante: 0  (GLOSSARIO: 0 · PT-PT: 0)')
    expect(out.status).toBe(0)
  })

  it('C4: modo padrão não tem GLOSSARIO nem PT-PT', () => {
    const out = run(root)
    expect(out.findings.filter((f) => f.cat === 'GLOSSARIO' || f.cat === 'PT-PT')).toEqual([])
  })

  it('caminhos de tests, mocks e config não são varridos', () => {
    const out = run(root)
    const ignored = ['src/mocks/m.ts', 'src/f/x.test.ts', 'server/src/tests/y.ts', 'server/src/config/z.ts']
    expect(out.findings.filter((f) => ignored.includes(f.file))).toEqual([])
  })
})

describe('auditar-textos-tela — só relatório (F-R, F-T)', () => {
  const root = makeRoot('relatorio', filesOf(RELATORIO))

  it('F-R e F-T aparecem no modo padrão (C3: sai com 1)', () => {
    const out = run(root)
    for (const c of casesOf(RELATORIO)) {
      const at = out.findings.filter((f) => f.file === c.file && f.line === c.line)
      expect(at.some((f) => f.cat === c.cat), `${c.id} em ${c.file}:${c.line}`).toBe(true)
      for (const t of c.terms) expect(at.map((f) => f.term)).toContain(t)
    }
    expect(out.status).toBe(1)
  })

  it('F-R e F-T não aparecem nem contam no --ci (C3: sai com 0)', () => {
    const out = run(root, '--ci')
    expect(out.findings).toEqual([])
    expect(out.stdout).toContain('Total bloqueante: 0  (GLOSSARIO: 0 · PT-PT: 0)')
    expect(out.status).toBe(0)
  })

  it('--csv no --ci grava só o que o modo reporta', () => {
    const csv = join(TMP, 'relatorio-ci.csv')
    run(root, '--ci', `--csv=${csv}`)
    expect(readFileSync(csv, 'utf8')).toBe('﻿categoria;arquivo;linha;termo;sugestao;trecho')
  })
})

describe('auditar-textos-tela — marcador (F-M)', () => {
  const root = makeRoot('marcador', MARCADOR)

  for (const args of [[], ['--ci']]) {
    const modo = args.length ? '--ci' : 'padrão'

    it(`M1–M3 (e bloco) ignoram a linha no modo ${modo}`, () => {
      const out = run(root, ...args)
      for (const [id, file, line] of MARCADOR_IGNORADOS) {
        expect(out.findings.filter((f) => f.file === file && f.line === line), id).toEqual([])
      }
    })

    it(`M4–M6 continuam reportados no modo ${modo}`, () => {
      const out = run(root, ...args)
      for (const [id, file, line] of MARCADOR_REPORTADOS) {
        expect(screenTerms(out.findings, file, line), id).toEqual(['GLOSSARIO:Etapa'])
      }
      expect(out.status).toBe(1)
    })
  }
})

describe('auditar-textos-tela — execução (F-C)', () => {
  it('C1: raiz só com src/ não lança exceção e sai conforme os achados', () => {
    const comAchado = run(makeRoot('so-src-com', { 'src/x.ts': ["const t = 'Etapa concluída'"] }))
    expect(comAchado.stderr).toBe('')
    expect(comAchado.status).toBe(1)
    const semAchado = run(makeRoot('so-src-sem', { 'src/x.ts': ["const t = 'Atividade concluída'"] }))
    expect(semAchado.stderr).toBe('')
    expect(semAchado.status).toBe(0)
    expect(run(makeRoot('so-src-sem-ci', { 'src/x.ts': ["const t = 'Atividade concluída'"] }), '--ci').status).toBe(0)
  })

  it('C2: raiz com pasta-mãe chamada "tests" continua varrendo src/', () => {
    const out = run(makeRoot(join('tests', 'repo'), { 'src/x.ts': ["const t = 'Etapa concluída'"] }))
    expect(out.findings).toContainEqual(expect.objectContaining({ cat: 'GLOSSARIO', file: 'src/x.ts', line: 1, term: 'Etapa' }))
  })

  it('C6: --csv grava o cabeçalho atual e a linha GLOSSARIO (BOM e CRLF)', () => {
    const root = makeRoot('csv', { 'src/x.ts': ["const t = 'Etapa concluída'"] })
    const csv = join(TMP, 's.csv')
    const out = run(root, `--csv=${csv}`)
    expect(out.stdout).toContain(`CSV: ${csv}`)
    const content = readFileSync(csv, 'utf8')
    expect(content.startsWith('﻿')).toBe(true)
    const lines = content.slice(1).split('\r\n')
    expect(lines[0]).toBe('categoria;arquivo;linha;termo;sugestao;trecho')
    expect(lines[1]).toBe(
      '"GLOSSARIO";"src/x.ts";"1";"Etapa";"usar ""atividade"" (unidade de trabalho) ou ""passo"" (assistente)";"const t = \'Etapa concluída\'"',
    )
  })
})
