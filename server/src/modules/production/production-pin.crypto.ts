import argon2 from 'argon2'

/**
 * Hash do PIN operacional do Modo Fábrica (Argon2id).
 * Separado de {@link hashPassword} administrativo para não acoplar políticas.
 */
export async function hashProductionPin(pin: string): Promise<string> {
  return argon2.hash(pin, { type: argon2.argon2id })
}

export async function verifyProductionPin(
  pin: string,
  pinHash: string,
): Promise<boolean> {
  if (!pinHash.startsWith('$argon2')) {
    return false
  }
  try {
    return await argon2.verify(pinHash, pin)
  } catch {
    return false
  }
}
