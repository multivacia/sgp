export type SessionIdlePolicy = {
  idleTimeoutMinutes: number
  idleWarningMinutes: number
  lastActivityAt: string
  idleExpiresAt: string
}
