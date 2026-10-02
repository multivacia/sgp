/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const css = readFileSync(fileURLToPath(new URL('../index.css', import.meta.url)), 'utf8')

const sources = import.meta.glob<string>(['../**/*.ts', '../**/*.tsx', '!../**/*.test.*'], {
  query: '?raw',
  import: 'default',
  eager: true,
})

const lightCss = css.slice(css.indexOf('html[data-theme="light-executive"]'))

const HUES = ['amber', 'yellow', 'rose', 'red', 'emerald', 'green', 'sky', 'blue', 'violet']
const LIGHT_SHADES = new Set(['50', '100', '200', '300', '400'])

function usedLightTextTokens(): Set<string> {
  const used = new Set<string>()
  const re = new RegExp(`(?<![:\\w-])text-(${HUES.join('|')})-(\\d{2,3})(?![\\w-])`, 'g')
  for (const text of Object.values(sources)) {
    for (const m of text.matchAll(re)) {
      if (LIGHT_SHADES.has(m[2])) used.add(`text-${m[1]}-${m[2]}`)
    }
  }
  return used
}

describe('light-executive: tons claros de texto precisam de override', () => {
  it('cobre todo text-<cor>-(50..400) usado no código', () => {
    expect(css.length).toBeGreaterThan(1000)
    const missing = [...usedLightTextTokens()].filter(
      (token) => !lightCss.includes(`.${token}`) && !lightCss.includes(`${token}/`),
    )
    expect(missing).toEqual([])
  })

  it('mantém o placeholder acima de 4.5:1 sobre branco (#64748b)', () => {
    expect(css).not.toMatch(/::placeholder\s*{\s*color:\s*#94a3b8/)
  })
})
