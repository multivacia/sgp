/**
 * Geração determinística de identificadores para materialização mockada.
 * Mesma entrada normalizada ⇒ mesmos ids (sem Date.now/Math.random no resultado).
 */

export function hashDeterministic(parts: string[]): string {
  const s = parts.join('\u001e')
  let h = 5381
  for (let i = 0; i < s.length; i++) {
    h = (h * 33) ^ s.charCodeAt(i)
  }
  const u = h >>> 0
  return u.toString(16).padStart(8, '0')
}

export function idEsteiraMaterializada(seed: string): string {
  return `ne-${hashDeterministic([seed, 'esteira'])}`
}

export function idTarefaBlocoMaterializada(seed: string, ordem: number): string {
  return `tb-${hashDeterministic([seed, 'tarefa', String(ordem)])}`
}

export function refOsDeterministic(seed: string, placaTrim: string): string {
  if (placaTrim) return placaTrim
  const n = parseInt(hashDeterministic([seed, 'ref']), 16) % 900
  return `OS ${4610 + n}`
}

/** ISO fixo derivado da semente — evita Date.now() na materialização mockada. */
export function enteredAtDeterministic(seed: string): string {
  const n = parseInt(hashDeterministic([seed, 'enteredAt']), 16)
  const ms = 1_704_067_200_000 + (n % 86_400_000)
  return new Date(ms).toISOString()
}
