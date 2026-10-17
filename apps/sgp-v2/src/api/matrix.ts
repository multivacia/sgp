import type { Collaborator, MatrixNode } from '../domain/novaEsteira'
import { api } from './client'

export type MatrixItem = { id: string; name: string; description: string | null; is_active: boolean }

/** Matrizes ativas (GET /api/v1/operation-matrix/items). */
export function listMatrices(): Promise<MatrixItem[]> {
  return api<MatrixItem[]>('/operation-matrix/items?is_active=true')
}

/** Árvore completa da matriz: etapas → setores → atividades. */
export function getMatrixTree(id: string): Promise<MatrixNode> {
  return api<MatrixNode>(`/operation-matrix/items/${id}/tree`)
}

/** Colaboradores ativos (para trocar responsável). */
export function listCollaborators(): Promise<Collaborator[]> {
  return api<Collaborator[]>('/collaborators?status=ACTIVE')
}
