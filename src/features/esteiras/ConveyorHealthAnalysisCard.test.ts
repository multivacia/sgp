import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ConveyorHealthAnalysisCard } from './ConveyorHealthAnalysisCard'

describe('ConveyorHealthAnalysisCard', () => {
  it('não renderiza ARGOS Health quando a flag de UI está desligada', () => {
    const html = renderToStaticMarkup(
      createElement(ConveyorHealthAnalysisCard, { conveyorId: 'et-001' }),
    )

    expect(html).toBe('')
    expect(html).not.toContain('ARGOS Health')
    expect(html).not.toContain('Analisar saúde com ARGOS')
  })
})
