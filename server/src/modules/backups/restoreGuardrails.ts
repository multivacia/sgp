/**
 * Guardrails de restauração (V1: contrato apenas — restore não é implementado).
 *
 * Pseudocódigo obrigatório antes de qualquer restore futuro:
 * 1. createPreRestoreSnapshot() → aguardar COMPLETED + VALID
 * 2. assertPreRestoreSnapshotReady(snapshot)
 * 3. somente então executar restore em janela controlada
 *
 * Nunca restaurar sem snapshot prévio validado da base atual.
 */

export class RestoreBlockedError extends Error {
  readonly code = 'RESTORE_BLOCKED'

  constructor(message: string) {
    super(message)
    this.name = 'RestoreBlockedError'
  }
}

export async function assertPreRestoreSnapshotReady(snapshot: {
  status: string
  integrityStatus: string
}): Promise<void> {
  if (snapshot.status !== 'COMPLETED' || snapshot.integrityStatus !== 'VALID') {
    throw new RestoreBlockedError(
      'A restauração foi bloqueada porque o snapshot da base atual não foi concluído e validado.',
    )
  }
}

/**
 * Stub documentado: cria snapshot PRE_RESTORE_SNAPSHOT antes de restore.
 * Não implementado na V1 — interface reservada para evolução futura.
 */
export async function createPreRestoreSnapshot(_input?: {
  actorUserId?: string | null
}): Promise<{ id: string; status: string; integrityStatus: string }> {
  throw new Error(
    'createPreRestoreSnapshot não está implementado na V1. Restore administrativo permanece bloqueado.',
  )
}
