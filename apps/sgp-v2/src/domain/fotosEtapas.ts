/**
 * Fotos das etapas (SGP+ V2, tabela própria `v2_etapa_imagens`, migration 0054).
 * A foto é da etapa da matriz; na esteira a etapa é achada pelo nome (a esteira não guarda o id da matriz).
 * Sem foto, vale a ilustração provisória.
 */
import { displayName } from './novaEsteira'

export type FotoEtapa = { matrixNodeId: string; nome: string; atualizadaEm: string; url?: string }

/** Endereço da foto; muda quando a foto é trocada (o navegador não mostra a antiga). */
export function urlFoto(f: FotoEtapa): string {
  return f.url ?? `/api/v1/v2/etapa-imagens/${f.matrixNodeId}?v=${encodeURIComponent(f.atualizadaEm)}`
}

const chave = (nome: string) => displayName(nome).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

/** Pela etapa da matriz (id) ou, na esteira, pelo nome da etapa ("15 - BANCOS DIANTEIROS" = "Bancos dianteiros"). */
export function fotoDaEtapa(fotos: FotoEtapa[], nome: string, matrixNodeId?: string): string | null {
  const f = (matrixNodeId && fotos.find((x) => x.matrixNodeId === matrixNodeId)) || (!matrixNodeId ? fotos.find((x) => chave(x.nome) === chave(nome)) : undefined)
  return f ? urlFoto(f) : null
}
