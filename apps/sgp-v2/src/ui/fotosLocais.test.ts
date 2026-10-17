import { describe, expect, it } from 'vitest'
import { listarLocais, removerLocal, salvarLocal } from './fotosLocais'

describe('fotos guardadas no aparelho antes de enviar', () => {
  it('guarda por etapa (uma, a nova substitui) e por esteira (várias); some ao enviar/descartar', async () => {
    const b = new Blob(['x'], { type: 'image/webp' })
    await salvarLocal({ chave: 'etapa:m15', tipo: 'etapa', alvoId: 'm15', nome: 'Bancos', blob: b, criadaEm: '2026-10-18T10:00:00Z' })
    await salvarLocal({ chave: 'etapa:m15', tipo: 'etapa', alvoId: 'm15', nome: 'Bancos', blob: b, criadaEm: '2026-10-18T11:00:00Z' })
    await salvarLocal({ chave: 'esteira:c1:a', tipo: 'esteira', alvoId: 'c1', blob: b, criadaEm: '2026-10-18T10:00:00Z' })
    await salvarLocal({ chave: 'esteira:c1:b', tipo: 'esteira', alvoId: 'c1', blob: b, criadaEm: '2026-10-18T10:01:00Z' })
    await salvarLocal({ chave: 'esteira:c2:a', tipo: 'esteira', alvoId: 'c2', blob: b, criadaEm: '2026-10-18T10:02:00Z' })
    expect((await listarLocais('etapa')).map((f) => f.criadaEm)).toEqual(['2026-10-18T11:00:00Z'])
    expect((await listarLocais('esteira', 'c1')).map((f) => f.chave)).toEqual(['esteira:c1:a', 'esteira:c1:b'])
    await removerLocal('esteira:c1:a')
    expect((await listarLocais('esteira', 'c1')).map((f) => f.chave)).toEqual(['esteira:c1:b'])
  })
})
