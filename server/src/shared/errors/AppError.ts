import { ErrorCodes } from './errorCodes.js'
import type { ErrorRef } from './errorRefs.js'

type Code = (typeof ErrorCodes)[keyof typeof ErrorCodes] | string
type ErrorCategory =
  | 'VALIDATION'
  | 'AUTH'
  | 'RBAC'
  | 'API'
  | 'DB'
  | 'INTEGRATION'
  | 'BUSINESS'
  | 'SYSTEM'
  | 'UNKNOWN'
type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical'

type AppErrorMeta = {
  errorRef?: ErrorRef | string
  category?: ErrorCategory
  severity?: ErrorSeverity
}

export class AppError extends Error {
  readonly statusCode: number
  readonly code: Code
  readonly details?: unknown
  readonly errorRef?: ErrorRef | string
  readonly category?: ErrorCategory
  readonly severity?: ErrorSeverity

  constructor(
    message: string,
    statusCode: number,
    code: Code,
    details?: unknown,
    meta?: AppErrorMeta,
  ) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
    this.errorRef = meta?.errorRef
    this.category = meta?.category
    this.severity = meta?.severity
  }
}
