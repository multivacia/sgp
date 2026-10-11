import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  COLABORADOR_NAV_ITEMS,
  CONTA_NAV_ITEMS,
  GESTAO_NAV_ITEMS,
} from '../shell/app-nav-config'
import {
  buildManualUrl,
  manualThemeFor,
  resolveScreenHelp,
  SCREEN_HELP,
} from './manual-help'
import { MANUAL_PUBLIC_PATH, MANUAL_SOURCE_FILE } from './manual-paths'

const html = readFileSync(resolve(process.cwd(), MANUAL_SOURCE_FILE), 'utf8')
const manualIds = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))

describe('mapa de ajuda contextual', () => {
  it('toda âncora mapeada existe no HTML gerado do manual', () => {
    const missing = SCREEN_HELP.filter(
      (e) => e.anchor && !manualIds.has(e.anchor),
    ).map((e) => `${e.pattern} -> ${e.anchor}`)
    expect(missing).toEqual([])
  })

  it('não repete padrões de rota e exige motivo quando não há âncora', () => {
    const patterns = SCREEN_HELP.map((e) => e.pattern)
    expect(new Set(patterns).size).toBe(patterns.length)
    for (const e of SCREEN_HELP) {
      if (!e.anchor) expect(e.noHelpReason, e.pattern).toBeTruthy()
    }
  })

  it('toda tela exposta no menu lateral tem ajuda contextual', () => {
    const navItems = [
      ...GESTAO_NAV_ITEMS,
      ...COLABORADOR_NAV_ITEMS,
      ...CONTA_NAV_ITEMS,
    ]
    for (const item of navItems) {
      const help = resolveScreenHelp(item.to)
      expect(help.anchor, `${item.label} (${item.to})`).not.toBeNull()
    }
  })

  it.each([
    ['/app/backlog', 'cap-5'],
    ['/app/nova-esteira', 'cap-6-6-3-as-formas-de-criar-uma-esteira'],
    ['/app/importar-os', 'cap-17'],
    ['/app/planejamento-semanal', 'cap-8'],
    ['/app/agenda-semanal', 'cap-9'],
    ['/app/minha-fila', 'cap-10'],
    ['/app/jornada', 'cap-11'],
    ['/app/gestao/jornada-colaborador', 'cap-12'],
    ['/app/gestao/evolucao-esteiras', 'cap-14'],
    ['/app/dashboard', 'cap-15'],
    ['/app/colaboradores/saude-operacional', 'cap-18'],
    ['/app/usuarios', 'cap-16-16-7-consultar-usuarios'],
  ])('%s abre %s', (path, anchor) => {
    expect(resolveScreenHelp(path).anchor).toBe(anchor)
  })

  it('rotas com parâmetros, barra final e query resolvem para a ajuda da tela', () => {
    expect(resolveScreenHelp('/app/esteiras/abc-123').anchor).toBe(
      'cap-6-6-2-ler-o-detalhe-de-uma-esteira',
    )
    expect(resolveScreenHelp('/app/esteiras/abc-123/alterar').anchor).toBe(
      'cap-6-6-10-alterar-uma-esteira-existente',
    )
    expect(resolveScreenHelp('/app/apontamento/t-9?origem=fila').anchor).toBe(
      'cap-7',
    )
    expect(resolveScreenHelp('/app/equipes/42/').anchor).toBe(
      'cap-16-16-18-equipes-membros-e-referencia',
    )
    expect(resolveScreenHelp('/app/matrizes-operacao/m1/preview').anchor).toBe(
      'cap-6-6-5-criar-a-partir-de-uma-matriz',
    )
  })

  it('telas sem capítulo não recebem âncora inventada', () => {
    for (const path of [
      '/app/gestao/esteiras/laboratorio',
      '/app/minhas-atividades',
      '/app/rota-inexistente',
    ]) {
      const help = resolveScreenHelp(path)
      expect(help.anchor).toBeNull()
      expect(help.noHelpReason).toBeTruthy()
    }
  })
})

describe('URL do manual', () => {
  it('usa a URL estável, o tema e o modo integrado, sem dados de sessão', () => {
    const url = buildManualUrl({ theme: 'claro', anchor: 'cap-5' })
    expect(url).toBe(`${MANUAL_PUBLIC_PATH}?integrado=1&tema=claro#cap-5`)
    expect(buildManualUrl({ theme: 'escuro' })).toBe(
      `${MANUAL_PUBLIC_PATH}?integrado=1&tema=escuro`,
    )
  })

  it('só Light Executive é tema claro', () => {
    expect(manualThemeFor('light-executive')).toBe('claro')
    expect(manualThemeFor('argos-dark')).toBe('escuro')
    expect(manualThemeFor('slate-dark')).toBe('escuro')
  })
})
