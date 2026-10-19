import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { buildGuideUrl, manualThemeFor, visiblePracticalGuides } from './manual-help'
import { MANUAL_SOURCE_DIR, PRACTICAL_GUIDE_FILES } from './manual-paths'

describe('tema dos guias', () => {
  it('só Light Executive é tema claro', () => {
    expect(manualThemeFor('light-executive')).toBe('claro')
    expect(manualThemeFor('argos-dark')).toBe('escuro')
    expect(manualThemeFor('slate-dark')).toBe('escuro')
  })
})

describe('Guias Práticos', () => {
  it('URL leva o tema e o modo integrado, sem dados de sessão', () => {
    expect(buildGuideUrl({ guide: 'colaborador', theme: 'escuro' })).toBe(
      '/manual/colaborador.html?integrado=1&tema=escuro',
    )
    expect(buildGuideUrl({ guide: 'gestor', theme: 'claro' })).toBe(
      '/manual/gestor-esteira.html?integrado=1&tema=claro',
    )
  })

  it('guia do gestor exige permissão de gestão; o do colaborador é para todos', () => {
    const ids = (perms: string[]) =>
      visiblePracticalGuides((codes) => codes.some((c) => perms.includes(c))).map(
        (g) => g.id,
      )
    expect(ids([])).toEqual(['colaborador'])
    expect(ids(['conveyors.create'])).toEqual(['colaborador', 'gestor'])
    expect(ids(['collaborators_admin.view'])).toEqual(['colaborador', 'gestor'])
  })

  it.each(Object.values(PRACTICAL_GUIDE_FILES))(
    '%s tem seletor de tema, retorno ao SGP+ e todas as capturas existentes',
    (file) => {
      const guidePath = resolve(process.cwd(), MANUAL_SOURCE_DIR, file)
      const guide = readFileSync(guidePath, 'utf8')
      expect(guide).toContain('class="theme-switch"')
      expect(guide).toContain(':root[data-theme="claro"]')
      expect(guide).toContain("localStorage.getItem('sgp.manual.tema')")
      expect(guide).toContain('id="voltar-sgp"')
      const images = [...guide.matchAll(/\s(?:src|href)="(img\/[^"]+)"/g)].map(
        (m) => m[1],
      )
      expect(images.length).toBeGreaterThan(0)
      const missing = images.filter(
        (img) => !existsSync(resolve(process.cwd(), MANUAL_SOURCE_DIR, img)),
      )
      expect(missing).toEqual([])
    },
  )

  it.each(Object.values(PRACTICAL_GUIDE_FILES))(
    '%s não orienta o usuário para recursos ausentes nesta release',
    (file) => {
      const guide = readFileSync(resolve(process.cwd(), MANUAL_SOURCE_DIR, file), 'utf8')
      // Texto visível (sem <style>/<script>): o Manual do Usuário integrado e a ajuda
      // contextual não fazem parte desta release.
      const visible = guide
        .replace(/<style[\s\S]*?<\/style>/g, '')
        .replace(/<script[\s\S]*?<\/script>/g, '')
      expect(visible).not.toMatch(/Ajuda\s*(→|->)\s*Manual do usuário/i)
      expect(visible).not.toMatch(/Como usar esta tela/i)
      expect(visible).not.toContain('manual-usuario.html')
    },
  )
})
