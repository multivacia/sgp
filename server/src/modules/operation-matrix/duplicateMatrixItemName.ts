/**
 * Gera o próximo nome disponível para raiz ITEM ao duplicar matriz:
 * `Nome (Cópia)`, `Nome (Cópia 2)`, …
 */
export async function pickDuplicateMatrixRootName(
  nameExists: (candidate: string) => Promise<boolean>,
  originalName: string,
): Promise<string> {
  const base = originalName.trim()
  for (let n = 1; n < 1000; n += 1) {
    const candidate =
      n === 1 ? `${base} (Cópia)` : `${base} (Cópia ${n})`
    if (!(await nameExists(candidate))) return candidate
  }
  throw new Error('pickDuplicateMatrixRootName: limite de tentativas')
}
