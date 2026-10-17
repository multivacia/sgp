/** Regras puras das fotos de etapa da SGP+ V2 (sem banco). */

export const V2_ETAPA_IMAGEM_MAX_BYTES = 1024 * 1024

export type V2EtapaImagemTipo = 'image/webp' | 'image/jpeg' | 'image/png'

export const V2_ETAPA_IMAGEM_TIPOS: readonly V2EtapaImagemTipo[] = ['image/webp', 'image/jpeg', 'image/png']

/** Tipo real pelo conteúdo (assinatura do arquivo), não pelo cabeçalho enviado. */
export function detectarTipoImagem(b: Buffer): V2EtapaImagemTipo | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'image/jpeg'
  if (b.length >= 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'image/png'
  if (b.length >= 12 && b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp'
  return null
}

/** Mensagem de erro ou null se a imagem pode ser guardada. */
export function validarImagem(b: unknown, contentType: string | undefined): string | null {
  if (!Buffer.isBuffer(b) || b.length === 0) return 'Envie a imagem (WebP, JPEG ou PNG).'
  if (b.length > V2_ETAPA_IMAGEM_MAX_BYTES) return 'A imagem passa de 1 MB.'
  const tipo = detectarTipoImagem(b)
  if (!tipo) return 'O arquivo não é uma imagem WebP, JPEG ou PNG.'
  if (contentType && contentType.split(';')[0].trim() !== tipo) return 'O tipo informado não confere com o conteúdo da imagem.'
  return null
}
