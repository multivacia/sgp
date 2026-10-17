import { describe, expect, it } from 'vitest'
import { fotoDaEtapa, type FotoEtapa } from './fotosEtapas'

const FOTOS: FotoEtapa[] = [{ matrixNodeId: 'm15', nome: '15 - BANCOS DIANTEIROS', atualizadaEm: '2026-10-18T10:00:00.000Z' }]

describe('foto da etapa', () => {
  it('na matriz acha pelo id; na esteira acha pelo nome (número e acento não importam); troca de foto muda o endereço', () => {
    expect(fotoDaEtapa(FOTOS, 'qualquer', 'm15')).toBe('/api/v1/v2/etapa-imagens/m15?v=2026-10-18T10%3A00%3A00.000Z')
    expect(fotoDaEtapa(FOTOS, '15 - BANCOS DIANTEIROS', 'outra-matriz')).toBeNull()
    expect(fotoDaEtapa(FOTOS, 'Bancos Dianteiros')).not.toBeNull()
    expect(fotoDaEtapa(FOTOS, '14 - BANCOS TRASEIROS')).toBeNull()
    expect(fotoDaEtapa([{ ...FOTOS[0], atualizadaEm: '2026-10-19T08:00:00.000Z' }], '', 'm15')).not.toBe(fotoDaEtapa(FOTOS, '', 'm15'))
  })
})
