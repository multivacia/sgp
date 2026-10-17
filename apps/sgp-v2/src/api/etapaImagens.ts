import type { FotoEtapa } from '../domain/fotosEtapas'
import { api } from './client'

let cache: Promise<FotoEtapa[]> | null = null

/** Lista das fotos (uma leitura por sessão; recarrega depois de trocar). */
export function listarFotos(fresco = false): Promise<FotoEtapa[]> {
  if (!cache || fresco) {
    cache = api<FotoEtapa[]>('/v2/etapa-imagens').catch(() => [])
  }
  return cache
}

/** Grava a foto (`operation_matrix.manage`). Corpo binário WebP/JPEG/PNG até 1 MB. */
export async function enviarFoto(matrixNodeId: string, foto: Blob): Promise<void> {
  await api<unknown>(`/v2/etapa-imagens/${matrixNodeId}`, { method: 'PUT', body: foto, headers: { 'Content-Type': foto.type } })
  cache = null
}

export async function removerFoto(matrixNodeId: string): Promise<void> {
  await api<unknown>(`/v2/etapa-imagens/${matrixNodeId}`, { method: 'DELETE' })
  cache = null
}
