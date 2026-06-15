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
  /** Modo Fábrica: cookie/sessão de produção ausente. */
  PRODUCTION_AUTH_REQUIRED: 'PRODUCTION_AUTH_REQUIRED',
  /** Modo Fábrica: JWT de produção inválido ou expirado. */
  PRODUCTION_AUTH_INVALID: 'PRODUCTION_AUTH_INVALID',
  /** Modo Fábrica: PIN incorreto ou acesso não habilitado (mensagem genérica). */
  PRODUCTION_PIN_INVALID: 'PRODUCTION_PIN_INVALID',
  /** Modo Fábrica: credencial bloqueada por tentativas (locked_until). */
  PRODUCTION_PIN_LOCKED: 'PRODUCTION_PIN_LOCKED',
  /** Modo Fábrica: colaborador/credencial desabilitada para produção. */
  PRODUCTION_ACCESS_DISABLED: 'PRODUCTION_ACCESS_DISABLED',
  /** Modo Fábrica: requisição sem X-SGP-Kiosk-Token ou com token incorreto. */
  PRODUCTION_KIOSK_REQUIRED: 'PRODUCTION_KIOSK_REQUIRED',
  /** Modo Fábrica: troca de PIN obrigatória antes de acessar a fila. */
  PRODUCTION_PIN_CHANGE_REQUIRED: 'PRODUCTION_PIN_CHANGE_REQUIRED',
  /** Modo Fábrica: novo PIN não pode ser o PIN inicial padrão. */
  PRODUCTION_DEFAULT_PIN_NOT_ALLOWED: 'PRODUCTION_DEFAULT_PIN_NOT_ALLOWED',
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
  /** Exclusão física: apontamentos registrados. */
  CONVEYOR_DELETE_HAS_TIME_ENTRIES: 'CONVEYOR_DELETE_HAS_TIME_ENTRIES',
  /** Exclusão física: plano da esteira ou planejamento semanal. */
  CONVEYOR_DELETE_HAS_DEPENDENCIES: 'CONVEYOR_DELETE_HAS_DEPENDENCIES',
  /** Substituição de estrutura: itens de planejamento vinculados a atividades. */
  CONVEYOR_STRUCTURE_REPLACE_HAS_DEPENDENCIES:
    'CONVEYOR_STRUCTURE_REPLACE_HAS_DEPENDENCIES',
  /** Apontamento bloqueado pelo status da esteira. */
  CONVEYOR_TIME_ENTRY_STATUS_NOT_ALLOWED: 'CONVEYOR_TIME_ENTRY_STATUS_NOT_ALLOWED',
  /** Finalização exige gestor/admin (conveyors.edit_status). */
  CONVEYOR_FINISH_REQUIRES_MANAGER: 'CONVEYOR_FINISH_REQUIRES_MANAGER',
  /** Retrocesso para backlog: status de origem não permitido. */
  CONVEYOR_RETURN_TO_BACKLOG_STATUS_NOT_ALLOWED:
    'CONVEYOR_RETURN_TO_BACKLOG_STATUS_NOT_ALLOWED',
  /** Retrocesso para planejamento: status de origem não permitido. */
  CONVEYOR_RETURN_TO_PLANNING_STATUS_NOT_ALLOWED:
    'CONVEYOR_RETURN_TO_PLANNING_STATUS_NOT_ALLOWED',
  /** Retrocesso operacional sem motivo válido. */
  CONVEYOR_RETURN_REASON_REQUIRED: 'CONVEYOR_RETURN_REASON_REQUIRED',
} as const
