/** Cliente do backend da V1 (/api/v1). A sessão é o mesmo cookie httpOnly da V1. */

export class ApiError extends Error {
  readonly status: number
  readonly code: string | null

  constructor(status: number, message: string, code: string | null = null) {
    super(message)
    this.status = status
    this.code = code
  }
}

type Unauthorized = () => void
let onUnauthorized: Unauthorized = () => {}

/** Chamado em qualquer 401: a sessão acabou e o app volta para o login. */
export function setUnauthorizedHandler(fn: Unauthorized): void {
  onUnauthorized = fn
}

/** `avisar401: false` = o 401 é da tela (ex.: PIN errado no tablet), não da sessão da gestora. */
export async function api<T>(path: string, init: RequestInit = {}, avisar401 = true): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init.headers },
  })
  if (res.status === 204) return undefined as T
  const body = (await res.json().catch(() => null)) as
    | { data?: T; error?: { code?: string; message?: string } }
    | null
  if (!res.ok) {
    if (res.status === 401 && avisar401) onUnauthorized()
    throw new ApiError(res.status, body?.error?.message ?? 'Não foi possível falar com o servidor.', body?.error?.code ?? null)
  }
  return body?.data as T
}
