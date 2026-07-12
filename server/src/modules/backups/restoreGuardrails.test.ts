import { describe, expect, it } from 'vitest'
import {
  assertPreRestoreSnapshotReady,
  createPreRestoreSnapshot,
  RestoreBlockedError,
} from './restoreGuardrails.js'

describe('restoreGuardrails', () => {
  it('bloqueia restauração sem snapshot COMPLETED+VALID', async () => {
    await expect(
      assertPreRestoreSnapshotReady({
        status: 'FAILED',
        integrityStatus: 'INVALID',
      }),
    ).rejects.toBeInstanceOf(RestoreBlockedError)

    await expect(
      assertPreRestoreSnapshotReady({
        status: 'COMPLETED',
        integrityStatus: 'INVALID',
      }),
    ).rejects.toThrow(/bloqueada/)

    await expect(
      assertPreRestoreSnapshotReady({
        status: 'RUNNING',
        integrityStatus: 'VALID',
      }),
    ).rejects.toBeInstanceOf(RestoreBlockedError)
  })

  it('permite seguir quando snapshot está COMPLETED e VALID', async () => {
    await expect(
      assertPreRestoreSnapshotReady({
        status: 'COMPLETED',
        integrityStatus: 'VALID',
      }),
    ).resolves.toBeUndefined()
  })

  it('createPreRestoreSnapshot permanece stub na V1', async () => {
    await expect(createPreRestoreSnapshot()).rejects.toThrow(/não está implementado/)
  })
})
