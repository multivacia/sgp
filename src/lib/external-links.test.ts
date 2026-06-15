import { describe, expect, it } from 'vitest'
import { BRAVO_HOME_URL } from './external-links'

describe('external-links', () => {
  it('BRAVO_HOME_URL aponta para o site oficial HTTPS da Bravo Tapeçaria', () => {
    expect(BRAVO_HOME_URL).toBe('https://www.bravotapecaria.com.br/')
    const url = new URL(BRAVO_HOME_URL)
    expect(url.protocol).toBe('https:')
    expect(url.hostname).toBe('www.bravotapecaria.com.br')
  })
})
