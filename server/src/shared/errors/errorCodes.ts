export const ErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  ROUTE_NOT_FOUND: 'ROUTE_NOT_FOUND',
  CONFLICT: 'CONFLICT',
  INTERNAL: 'INTERNAL_ERROR',
  INVALID_STATUS_TRANSITION: 'INVALID_STATUS_TRANSITION',
  UNAUTHORIZED: 'UNAUTHORIZED',
  /** JWT válido na assinatura mas emitido antes da última alteração de senha. */
  SESSION_REVOKED_CREDENTIALS_CHANGED: 'SESSION_REVOKED_CREDENTIALS_CHANGED',
  /** Sessão expirada por inatividade ou limite absoluto. */
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  ACCOUNT_INACTIVE: 'ACCOUNT_INACTIVE',
  /** Bloqueio temporário por tentativas falhadas de login (locked_until). */
  ACCOUNT_TEMPORARILY_LOCKED: 'ACCOUNT_TEMPORARILY_LOCKED',
  FORBIDDEN: 'FORBIDDEN',
  /** Dependência de armazenamento indisponível (ex.: migration não aplicada). */
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  /** Etapa STEP espúria (rollup de TASK) em área placeholder quando já há setores reais. */
  CONVEYOR_SYNTHETIC_ROLLUP_STEP: 'CONVEYOR_SYNTHETIC_ROLLUP_STEP',
  /** Apontamento em atividade sem alocação exige justificativa (`exceptionJustification`). */
  TIME_ENTRY_UNASSIGNED_REQUIRES_JUSTIFICATION:
    'TIME_ENTRY_UNASSIGNED_REQUIRES_JUSTIFICATION',
  /** Apontamento com atividades anteriores ainda pendentes na esteira. */
  TIME_ENTRY_OUT_OF_SEQUENCE_REQUIRES_JUSTIFICATION:
    'TIME_ENTRY_OUT_OF_SEQUENCE_REQUIRES_JUSTIFICATION',
  /** Conclusão explícita com atividades anteriores ainda pendentes. */
  STEP_COMPLETION_OUT_OF_SEQUENCE_REQUIRES_JUSTIFICATION:
    'STEP_COMPLETION_OUT_OF_SEQUENCE_REQUIRES_JUSTIFICATION',
} as const
