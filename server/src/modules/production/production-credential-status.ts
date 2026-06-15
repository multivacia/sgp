import type { ProductionCredentialStatus } from './production.types.js'

export type ProductionCredentialListInput = {
  hasCredential: boolean
  enabled: boolean | null
  lockedUntil: Date | null
}

export function resolveProductionCredentialStatus(
  input: ProductionCredentialListInput,
  nowMs = Date.now(),
): ProductionCredentialStatus {
  if (!input.hasCredential) {
    return 'NEEDS_INITIAL_PIN'
  }
  if (input.enabled !== true) {
    return 'DISABLED'
  }
  if (input.lockedUntil && input.lockedUntil.getTime() > nowMs) {
    return 'LOCKED'
  }
  return 'READY'
}
