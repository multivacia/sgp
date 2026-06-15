import type pg from 'pg'
import { loadEnv } from '../config/env.js'
import { hashProductionPin } from '../modules/production/production-pin.crypto.js'
import { signProductionSessionToken } from '../modules/production/production-auth.jwt.js'
import { defaultSessionActivityAtLogin } from '../modules/auth/session-timeout.service.js'
import { upsertProductionCredentialForTest } from '../modules/production/production-auth.repository.js'

export const SEED_COLLABORATOR_MARIA_ID =
  '3a5f3c72-2e75-4e0a-8f6e-6d4d086e5f1c'

export async function seedProductionPinForCollaborator(
  pool: pg.Pool,
  collaboratorId: string,
  pin: string,
  enabled = true,
  mustChangePin = false,
): Promise<void> {
  const pinHash = await hashProductionPin(pin)
  await upsertProductionCredentialForTest(pool, {
    collaboratorId,
    pinHash,
    enabled,
    mustChangePin,
  })
}

export function productionSessionCookie(
  collaboratorId: string,
  activity = defaultSessionActivityAtLogin(),
): string {
  const env = loadEnv()
  const token = signProductionSessionToken(collaboratorId, activity, env)
  return `${env.productionAuthCookieName}=${token}`
}
