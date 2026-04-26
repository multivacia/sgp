import { ErrorCodes } from './errorCodes.js'

type Code = (typeof ErrorCodes)[keyof typeof ErrorCodes] | string

export class AppError extends Error {
  readonly statusCode: number
  readonly code: Code
  readonly details?: unknown

  constructor(
    message: string,
    statusCode: number,
    code: Code,
    details?: unknown,
  ) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}
