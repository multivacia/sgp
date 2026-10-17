import { api } from './client'

export type FotoEsteira = { id: string; criadaEm: string; url?: string }

/** Fotos do veículo já enviadas ao banco (módulo V2, migration 0056). */
export function listarFotosEsteira(conveyorId: string): Promise<FotoEsteira[]> {
  return api<FotoEsteira[]>(`/v2/esteiras/${conveyorId}/fotos`)
}

export function urlFotoEsteira(conveyorId: string, f: FotoEsteira): string {
  return f.url ?? `/api/v1/v2/esteiras/${conveyorId}/fotos/${f.id}`
}

/** Envia uma foto (`conveyors.create`). Até 10 por esteira. */
export function enviarFotoEsteira(conveyorId: string, foto: Blob): Promise<FotoEsteira> {
  return api<FotoEsteira>(`/v2/esteiras/${conveyorId}/fotos`, { method: 'POST', body: foto, headers: { 'Content-Type': foto.type } })
}

export async function removerFotoEsteira(conveyorId: string, fotoId: string): Promise<void> {
  await api<unknown>(`/v2/esteiras/${conveyorId}/fotos/${fotoId}`, { method: 'DELETE' })
}
