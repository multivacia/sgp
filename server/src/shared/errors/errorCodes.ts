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
  /** Já existe plano operacional ativo para a esteira. */
  CONVEYOR_OPERATIONAL_PLAN_ALREADY_EXISTS: 'CONVEYOR_OPERATIONAL_PLAN_ALREADY_EXISTS',
  /** Plano já possui itens; geração exige overwrite explícito. */
  CONVEYOR_OPERATIONAL_PLAN_ITEMS_EXIST: 'CONVEYOR_OPERATIONAL_PLAN_ITEMS_EXIST',
  /** Plano possui itens que precisam revisão antes de aprovar. */
  CONVEYOR_OPERATIONAL_PLAN_ITEMS_NEED_REVIEW: 'CONVEYOR_OPERATIONAL_PLAN_ITEMS_NEED_REVIEW',
  /** Plano ou itens vinculados à fábrica impedem regeneração. */
  CONVEYOR_OPERATIONAL_PLAN_FACTORY_LINKED: 'CONVEYOR_OPERATIONAL_PLAN_FACTORY_LINKED',
  /** Exclusão física: esteira fora de NO_BACKLOG. */
  CONVEYOR_DELETE_STATUS_NOT_ALLOWED: 'CONVEYOR_DELETE_STATUS_NOT_ALLOWED',
  /** Exclusão física: apontamentos, plano da esteira ou planejamento semanal. */
  CONVEYOR_DELETE_HAS_DEPENDENCIES: 'CONVEYOR_DELETE_HAS_DEPENDENCIES',
} as const
