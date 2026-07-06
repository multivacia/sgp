/**
 * Resolve a source_key de lineage de um nó de origem.
 * Regra: source_key preenchida (trim não-vazio) vence; senão, o id do nó de origem.
 * NUNCA passar aqui o novo id gerado num clone — sempre o nó de ORIGEM.
 */
export function resolveNodeSourceKey(node: {
  id: string
  source_key?: string | null
}): string {
  const sk = node.source_key?.trim()
  return sk && sk.length > 0 ? sk : node.id
}
