/** Reduz a foto no próprio celular antes de enviar (até 1000 px, WebP/JPEG, menos de 1 MB). */
export async function prepararFoto(arquivo: Blob): Promise<Blob> {
  const img = await createImageBitmap(arquivo)
  const escala = Math.min(1, 1000 / Math.max(img.width, img.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(img.width * escala)
  canvas.height = Math.round(img.height * escala)
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
  const gerar = (tipo: string, q: number) => new Promise<Blob | null>((ok) => canvas.toBlob(ok, tipo, q))
  for (const q of [0.82, 0.7, 0.55]) {
    let b = await gerar('image/webp', q)
    if (!b || b.type !== 'image/webp') b = await gerar('image/jpeg', q) // navegador sem WebP
    if (b && b.size <= 1024 * 1024) return b
  }
  throw new Error('Não foi possível deixar a foto com menos de 1 MB.')
}
