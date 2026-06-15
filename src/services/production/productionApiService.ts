import { ApiError } from '../../lib/api/apiErrors'
import { productionRequestJson } from '../../lib/production/productionApiClient'
import { getProductionKioskToken } from '../../lib/api/env'
import type {
  ProductionCollaboratorSummary,
  ProductionCollaboratorsList,
  ProductionSession,
  ProductionTimeEntryPayload,
  ProductionTimeEntryResult,
  ProductionWorkQueueResponse,
} from '../../domain/production/production.types'

const BASE = '/api/v1/production'

export const PRODUCTION_LIST_EMPTY_MESSAGE =
  'Nenhum colaborador ativo encontrado no cadastro operacional.'

export const PRODUCTION_CHANGE_PIN_ERROR_MESSAGE =
  'Não foi possível alterar o PIN agora. Tente novamente.'

export const PRODUCTION_DEFAULT_PIN_MESSAGE =
  'Escolha um PIN diferente do PIN inicial padrão.'

const CREDENTIAL_STATUSES = new Set([
  'READY',
  'NEEDS_INITIAL_PIN',
  'LOCKED',
  'DISABLED',
])

export const PRODUCTION_LIST_ERROR_MESSAGE =
  'Não foi possível carregar os colaboradores.'

export const PRODUCTION_LIST_KIOSK_MESSAGE =
  'Este dispositivo não está autorizado para o modo produção.'

export const PRODUCTION_PIN_INVALID_MESSAGE =
  'PIN inválido ou acesso não habilitado.'

export const PRODUCTION_LOGIN_ERROR_MESSAGE =
  'Não foi possível entrar agora. Tente novamente.'

const KIOSK_REQUIRED_CODE = 'PRODUCTION_KIOSK_REQUIRED'

/** Retorna os headers de kiosk quando configurados. */
function kioskHeaders(): Record<string, string> {
  const token = getProductionKioskToken()
  if (!token) return {}
  return { 'X-SGP-Kiosk-Token': token }
}

const PIN_INVALID_CODES = new Set([
  'PRODUCTION_PIN_INVALID',
  'PRODUCTION_ACCESS_DISABLED',
  'PRODUCTION_AUTH_INVALID',
])

const LOGIN_RETRY_CODES = new Set([
  'PRODUCTION_PIN_LOCKED',
  'NETWORK_ERROR',
])

function assertCollaboratorSummary(
  raw: unknown,
  label: string,
): ProductionCollaboratorSummary {
  if (
    !raw ||
    typeof raw !== 'object' ||
    typeof (raw as ProductionCollaboratorSummary).id !== 'string'
  ) {
    throw new ApiError(
      `Resposta inválida do servidor (${label}).`,
      500,
    )
  }
  const item = raw as ProductionCollaboratorSummary
  const fullName =
    typeof item.fullName === 'string'
      ? item.fullName
      : typeof item.name === 'string'
        ? item.name
        : null
  if (!fullName) {
    throw new ApiError(`Resposta inválida (${label}: name).`, 500)
  }
  const avatarUrl = item.avatarUrl
  const initials = item.initials
  if (avatarUrl !== null && typeof avatarUrl !== 'string') {
    throw new ApiError(`Resposta inválida (${label}: avatar).`, 500)
  }
  if (typeof initials !== 'string') {
    throw new ApiError(`Resposta inválida (${label}: initials).`, 500)
  }
  if (!CREDENTIAL_STATUSES.has(item.productionCredentialStatus)) {
    throw new ApiError(
      `Resposta inválida (${label}: productionCredentialStatus).`,
      500,
    )
  }
  return {
    id: item.id,
    fullName,
    name: typeof item.name === 'string' ? item.name : fullName,
    displayName:
      typeof item.displayName === 'string' ? item.displayName : fullName,
    avatarUrl: avatarUrl ?? null,
    initials,
    teamName: item.teamName ?? null,
    productionCredentialStatus: item.productionCredentialStatus,
    ...(item.mustChangePin === true ? { mustChangePin: true } : {}),
  }
}

function assertProductionSession(data: unknown, label: string): ProductionSession {
  if (!data || typeof data !== 'object') {
    throw new ApiError(`Resposta inválida (${label}).`, 500)
  }
  const collaborator = assertCollaboratorSummary(
    (data as ProductionSession).collaborator,
    `${label}.collaborator`,
  )
  const scope = (data as ProductionSession).scope
  if (scope !== 'PRODUCTION_MODE') {
    throw new ApiError(`Resposta inválida (${label}: scope).`, 500)
  }
  const status = (data as ProductionSession).status
  const mustChangePin = (data as ProductionSession).mustChangePin
  return {
    collaborator,
    scope,
    ...(status === 'AUTHENTICATED' || status === 'PIN_CHANGE_REQUIRED'
      ? { status }
      : {}),
    ...(mustChangePin === true ? { mustChangePin: true } : {}),
  }
}

export async function listProductionCollaborators(): Promise<ProductionCollaboratorsList> {
  try {
    const data = await productionRequestJson<ProductionCollaboratorsList>(
      'GET',
      `${BASE}/collaborators`,
      { headers: kioskHeaders() },
    )
    if (!data || typeof data !== 'object' || !Array.isArray(data.items)) {
      throw new ApiError(PRODUCTION_LIST_ERROR_MESSAGE, 500)
    }
    return {
      items: data.items.map((item, i) =>
        assertCollaboratorSummary(item, `collaborators[${i}]`),
      ),
    }
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 403 && e.code === KIOSK_REQUIRED_CODE) {
        throw new ApiError(PRODUCTION_LIST_KIOSK_MESSAGE, 403, {
          code: KIOSK_REQUIRED_CODE,
          cause: e,
        })
      }
      throw new ApiError(PRODUCTION_LIST_ERROR_MESSAGE, e.status, {
        code: e.code,
        cause: e,
      })
    }
    throw new ApiError(PRODUCTION_LIST_ERROR_MESSAGE, 503, { cause: e })
  }
}

export function mapProductionLoginError(err: unknown): ApiError {
  if (err instanceof ApiError) {
    if (err.status === 401 && PIN_INVALID_CODES.has(err.code ?? '')) {
      return new ApiError(PRODUCTION_PIN_INVALID_MESSAGE, err.status, {
        code: err.code,
        cause: err,
      })
    }
    if (
      LOGIN_RETRY_CODES.has(err.code ?? '') ||
      err.status >= 500 ||
      err.status === 403
    ) {
      return new ApiError(PRODUCTION_LOGIN_ERROR_MESSAGE, err.status, {
        code: err.code,
        cause: err,
      })
    }
    if (err.status === 401) {
      return new ApiError(PRODUCTION_PIN_INVALID_MESSAGE, err.status, {
        code: err.code,
        cause: err,
      })
    }
    return new ApiError(PRODUCTION_LOGIN_ERROR_MESSAGE, err.status, {
      code: err.code,
      cause: err,
    })
  }
  return new ApiError(PRODUCTION_LOGIN_ERROR_MESSAGE, 503, { cause: err })
}

export async function loginProduction(
  collaboratorId: string,
  pin: string,
): Promise<ProductionSession> {
  try {
    const data = await productionRequestJson<ProductionSession>(
      'POST',
      `${BASE}/auth/login`,
      { body: { collaboratorId, pin } },
    )
    const session = assertProductionSession(data, 'login')
    if (session.status === 'PIN_CHANGE_REQUIRED' || session.mustChangePin) {
      return { ...session, mustChangePin: true, status: 'PIN_CHANGE_REQUIRED' }
    }
    return { ...session, mustChangePin: false, status: 'AUTHENTICATED' }
  } catch (e) {
    throw mapProductionLoginError(e)
  }
}

export async function changeProductionPin(
  newPin: string,
  confirmPin: string,
): Promise<void> {
  try {
    await productionRequestJson<void>('POST', `${BASE}/auth/change-pin`, {
      body: { newPin, confirmPin },
    })
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.code === 'PRODUCTION_DEFAULT_PIN_NOT_ALLOWED') {
        throw new ApiError(PRODUCTION_DEFAULT_PIN_MESSAGE, e.status, {
          code: e.code,
          cause: e,
        })
      }
      if (e.status === 401) {
        throw new ApiError('Sua sessão expirou. Entre novamente.', e.status, {
          code: e.code,
          cause: e,
        })
      }
      throw new ApiError(PRODUCTION_CHANGE_PIN_ERROR_MESSAGE, e.status, {
        code: e.code,
        cause: e,
      })
    }
    throw new ApiError(PRODUCTION_CHANGE_PIN_ERROR_MESSAGE, 503, { cause: e })
  }
}

export async function getProductionSession(): Promise<ProductionSession> {
  const data = await productionRequestJson<ProductionSession>(
    'GET',
    `${BASE}/auth/session`,
  )
  const session = assertProductionSession(data, 'session')
  return {
    ...session,
    mustChangePin: session.mustChangePin === true,
  }
}

export async function logoutProduction(): Promise<void> {
  await productionRequestJson<void>('POST', `${BASE}/auth/logout`, {})
}

export const PRODUCTION_TIME_ENTRY_ERROR_MESSAGE =
  'Não foi possível registrar o apontamento.'

export const PRODUCTION_TIME_ENTRY_UNASSIGNED_MESSAGE =
  'Essa atividade não permite apontamento agora.'

export const PRODUCTION_WORK_QUEUE_ERROR_MESSAGE =
  'Não foi possível carregar suas atividades.'

const TIME_ENTRY_UNASSIGNED_CODE = 'TIME_ENTRY_UNASSIGNED_REQUIRES_JUSTIFICATION'

export async function createProductionTimeEntry(
  input: ProductionTimeEntryPayload,
): Promise<ProductionTimeEntryResult> {
  try {
    const data = await productionRequestJson<ProductionTimeEntryResult>(
      'POST',
      `${BASE}/time-entries`,
      { body: input },
    )
    return data
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.code === TIME_ENTRY_UNASSIGNED_CODE) {
        throw new ApiError(PRODUCTION_TIME_ENTRY_UNASSIGNED_MESSAGE, e.status, {
          code: e.code,
          cause: e,
        })
      }
      if (e.status === 401) {
        throw new ApiError('Sua sessão expirou. Entre novamente.', e.status, {
          code: e.code,
          cause: e,
        })
      }
      throw new ApiError(PRODUCTION_TIME_ENTRY_ERROR_MESSAGE, e.status, {
        code: e.code,
        cause: e,
      })
    }
    throw new ApiError(PRODUCTION_TIME_ENTRY_ERROR_MESSAGE, 503, { cause: e })
  }
}

export async function getProductionWorkQueue(
  date?: string,
): Promise<ProductionWorkQueueResponse> {
  try {
    const path = date
      ? `${BASE}/me/work-queue?date=${encodeURIComponent(date)}`
      : `${BASE}/me/work-queue`
    const data = await productionRequestJson<ProductionWorkQueueResponse>('GET', path)
    if (!data || typeof data !== 'object' || !Array.isArray(data.items)) {
      throw new ApiError(PRODUCTION_WORK_QUEUE_ERROR_MESSAGE, 500)
    }
    return data
  } catch (e) {
    if (e instanceof ApiError) {
      throw new ApiError(PRODUCTION_WORK_QUEUE_ERROR_MESSAGE, e.status, {
        code: e.code,
        cause: e,
      })
    }
    throw new ApiError(PRODUCTION_WORK_QUEUE_ERROR_MESSAGE, 503, { cause: e })
  }
}
