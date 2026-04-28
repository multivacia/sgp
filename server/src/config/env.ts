import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { config } from 'dotenv'
import { z } from 'zod'

const __dirname = dirname(fileURLToPath(import.meta.url))
/** Diretório `server/` (pai de `src/config/`) */
const serverRoot = join(__dirname, '../..')

const serverEnvPath = join(serverRoot, '.env')

const baseSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']),
  PORT: z.coerce
    .number({ invalid_type_error: 'PORT deve ser um número inteiro' })
    .int('PORT deve ser um inteiro')
    .min(1, 'PORT deve ser no mínimo 1')
    .max(65535, 'PORT deve ser no máximo 65535'),
  CORS_ORIGIN: z.string().trim().min(1, 'CORS_ORIGIN é obrigatório e não pode ser vazio'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']),
  /** Assinatura dos JWT de sessão (cookie httpOnly). Mínimo 16 caracteres. */
  JWT_SECRET: z.string().min(16, 'JWT_SECRET deve ter pelo menos 16 caracteres'),
  JWT_EXPIRES_DAYS: z.coerce.number().int().min(1).max(365).default(7),
  AUTH_COOKIE_NAME: z.string().trim().min(1).default('sgp_auth'),
  LOGIN_MAX_FAILED_ATTEMPTS: z.coerce.number().int().min(1).max(100),
  LOGIN_LOCKOUT_MINUTES: z.coerce.number().int().min(1).max(10080),
})

/** Configuração passada ao `pg` sem montar URL (evita encoding com senhas especiais). */
export type PgPoolConfigBase =
  | { connectionString: string }
  | {
      host: string
      port: number
      database: string
      user: string
      password: string
    }

export type Env = {
  nodeEnv: string
  port: number
  /** Sempre resolvido (Modo A: `connectionString`; Modo B: host/port/database/user/password). */
  pgPoolConfig: PgPoolConfigBase
  /** Presente só no Modo A (`DATABASE_URL`). */
  databaseUrl?: string
  corsOrigin: string
  logLevel: string
  pgPoolMax?: number
  requireDbOnStartup?: boolean
  jwtSecret: string
  jwtExpiresDays: number
  authCookieName: string
  loginMaxFailedAttempts: number
  loginLockoutMinutes: number
  /**
   * Quando definido (≥32 caracteres), `GET /health/db` em produção aceita também
   * o header `X-SGP-Infra-Token` com este valor (comparação segura no servidor).
   */
  healthInfraToken?: string
  /** URL completa do endpoint ARGOS de ingestão (opcional; sem isto usa adapter stub). */
  argosIngestUrl?: string
  /** Bearer opcional para `Authorization` no cliente HTTP ARGOS. */
  argosIngestToken?: string
  /**
   * Ambiente do chamador enviado ao gateway ARGOS (`callerEnvironment`, opcional).
   * Ex.: `production`, `staging`.
   */
  argosCallerEnvironment?: string
  /**
   * Modo de política do pipeline documental no ARGOS (`economy` | `balanced` | `quality`).
   * Deve coincidir com `policyModeSchema` do argos-gateway.
   */
  argosPolicyMode: 'economy' | 'balanced' | 'quality'
  /** Timeout ms para pedidos HTTP ao ARGOS. */
  argosIngestTimeoutMs: number
  /** Tamanho máximo do ficheiro em `POST .../conveyors/document-draft`. */
  documentDraftMaxFileBytes: number
  /**
   * Base URL do serviço ARGOS (ex.: `https://argos.example.com`) — usada com
   * `argosConveyorHealthAnalyzePath` para análise de saúde de esteira.
   * Diferente de `argosIngestUrl` (URL completa do multipart de documentos).
   */
  argosBaseUrl?: string
  /**
   * Path do `POST` de análise de saúde, relativo a `argosBaseUrl`.
   * Padrão: `/api/v1/specialists/conveyor-health/analyze`
   */
  argosConveyorHealthAnalyzePath: string
  /**
   * Timeout dedicado para análise de saúde. Se ausente, reutiliza o parsing de
   * `ARGOS_HEALTH_TIMEOUT_MS` ou, em último caso, `argosIngestTimeoutMs`.
   */
  argosHealthTimeoutMs: number
  /**
   * Quando `false` (ex. `ARGOS_HEALTH_ENABLED=0`), o cliente de health recusa chamadas.
   * `undefined` = não definido no ambiente — comportamento ligado por defeito.
   */
  argosHealthEnabled?: boolean
  /**
   * Quando true, exige `ARGOS_INGEST_URL` — falha no arranque se o endpoint remoto
   * não estiver configurado (evita usar pipeline local ou stub sem decisão explícita).
   */
  argosRemoteRequired: boolean
  /**
   * Quando true, sem URL remoto usa apenas o stub mínimo (testes); caso contrário
   * usa o pipeline heurístico local (`LocalPipelineArgosDocumentDraftAdapter`).
   */
  argosUseMinimalStub: boolean
  supportTicketsEnabled?: boolean
  supportEmailEnabled?: boolean
  supportWhatsappEnabled?: boolean
  supportRoutingDefaultEmail?: string
  supportRoutingDefaultWhatsapp?: string
  supportRoutingMediumEmail?: string
  supportRoutingHighEmail?: string
  supportRoutingHighWhatsapp?: string
  /** Remetente obrigatório quando SUPPORT_EMAIL_ENABLED=1 e envio real. */
  supportEmailFrom?: string
  supportEmailReplyTo?: string
  /** Prefixo do assunto; padrão [SGP]. */
  supportEmailSubjectPrefix: string
  smtpHost?: string
  smtpPort: number
  smtpSecure: boolean
  smtpUser?: string
  smtpPass?: string
  smtpRequireTls: boolean
}

let cached: Env | undefined

/** Para testes de integração que precisam alterar `process.env` antes de `loadEnv()`. */
export function resetEnvCacheForTests(): void {
  cached = undefined
}

function formatZodEnvError(err: z.ZodError): string {
  const lines = err.issues.map((issue) => {
    const path = issue.path.length ? `${issue.path.join('.')}: ` : ''
    return `${path}${issue.message}`
  })
  return [
    'Variáveis de ambiente inválidas ou ausentes (fonte: server/.env).',
    'Copie server/.env.example para server/.env e preencha os valores.',
    '',
    ...lines,
  ].join('\n')
}

function parsePortLabel(raw: string, label: string): number {
  const s = raw.trim()
  const n = Number.parseInt(s, 10)
  if (Number.isNaN(n) || String(n) !== s || n < 1 || n > 65535) {
    throw new Error(`${label} deve ser um inteiro entre 1 e 65535`)
  }
  return n
}

function parseOptionalPgPoolMax(v: string | undefined): number | undefined {
  if (v === undefined || v.trim() === '') return undefined
  const n = Number.parseInt(v.trim(), 10)
  if (Number.isNaN(n) || n < 1 || n > 1000) {
    throw new Error('PG_POOL_MAX deve ser um inteiro entre 1 e 1000')
  }
  return n
}

function parseOptionalBooleanFlag(v: string | undefined): boolean | undefined {
  if (v === undefined || v.trim() === '') return undefined
  const l = v.trim().toLowerCase()
  if (['1', 'true', 'yes', 'on'].includes(l)) return true
  if (['0', 'false', 'no', 'off'].includes(l)) return false
  throw new Error(
    'REQUIRE_DB_ON_STARTUP deve ser um de: 1, 0, true, false, yes, no, on, off',
  )
}

/**
 * Precedência: Modo A (`DATABASE_URL` não vazia após trim) vence.
 * Modo B: `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD` obrigatórios.
 * No Modo B, retorna objeto estruturado (sem URL) para o `pg` lidar bem com senhas especiais.
 */
export function resolvePgPoolConfig(processEnv: NodeJS.ProcessEnv): PgPoolConfigBase {
  const url = processEnv.DATABASE_URL?.trim()
  if (url) {
    return { connectionString: url }
  }

  const missing: string[] = []
  const host = processEnv.PGHOST?.trim()
  const portRaw = processEnv.PGPORT
  const database = processEnv.PGDATABASE?.trim()
  const user = processEnv.PGUSER?.trim()
  const passwordRaw = processEnv.PGPASSWORD

  if (!host) missing.push('PGHOST')
  if (!portRaw?.trim()) missing.push('PGPORT')
  if (!database) missing.push('PGDATABASE')
  if (!user) missing.push('PGUSER')
  if (passwordRaw === undefined || passwordRaw === '') {
    missing.push('PGPASSWORD')
  } else if (passwordRaw.trim() === '') {
    throw new Error(
      'PGPASSWORD não pode ser vazio ou só espaços (Modo B). Use DATABASE_URL (Modo A) ou defina uma senha válida.',
    )
  }

  if (missing.length > 0) {
    throw new Error(
      [
        'Configure o banco: Modo A com DATABASE_URL preenchida, ou Modo B com todas as variáveis PG*.',
        `Faltando ou inválido: ${missing.join(', ')}.`,
      ].join(' '),
    )
  }

  const port = parsePortLabel(portRaw!, 'PGPORT')
  return {
    host: host!,
    port,
    database: database!,
    user: user!,
    password: passwordRaw!,
  }
}

/**
 * Indica se o ambiente atual sugere banco configurado (antes de validar o restante do schema).
 * Útil para `describe.skipIf` em testes de integração.
 */
export function hasDatabaseConnectionInEnv(processEnv: NodeJS.ProcessEnv): boolean {
  if (processEnv.DATABASE_URL?.trim()) return true
  return (
    !!processEnv.PGHOST?.trim() &&
    !!processEnv.PGPORT?.trim() &&
    !!processEnv.PGDATABASE?.trim() &&
    !!processEnv.PGUSER?.trim() &&
    processEnv.PGPASSWORD !== undefined &&
    processEnv.PGPASSWORD !== '' &&
    processEnv.PGPASSWORD.trim() !== ''
  )
}

/**
 * Carrega exclusivamente `server/.env` (única fonte de verdade do backend).
 * `override: true` garante que valores deste arquivo prevaleçam sobre variáveis
 * já definidas no processo (ex.: testes que chamam `dotenv` antes).
 */
export function loadDotenvFiles(): void {
  config({ path: serverEnvPath, override: true })
}

/** Se definido e não vazio, exige pelo menos 32 caracteres. */
function parseHealthInfraToken(raw: string | undefined): string | undefined {
  if (raw === undefined) return undefined
  const t = raw.trim()
  if (t === '') return undefined
  if (t.length < 32) {
    throw new Error(
      'HEALTH_INFRA_TOKEN, quando definido, deve ter pelo menos 32 caracteres.',
    )
  }
  return t
}

export function loadEnv(): Env {
  if (cached) return cached
  loadDotenvFiles()

  const raw = {
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT,
    CORS_ORIGIN: process.env.CORS_ORIGIN,
    LOG_LEVEL: process.env.LOG_LEVEL,
    JWT_SECRET: process.env.JWT_SECRET,
    JWT_EXPIRES_DAYS: process.env.JWT_EXPIRES_DAYS,
    AUTH_COOKIE_NAME: process.env.AUTH_COOKIE_NAME,
    LOGIN_MAX_FAILED_ATTEMPTS:
      process.env.LOGIN_MAX_FAILED_ATTEMPTS?.trim() || '5',
    LOGIN_LOCKOUT_MINUTES:
      process.env.LOGIN_LOCKOUT_MINUTES?.trim() || '15',
  }

  const parsed = baseSchema.safeParse(raw)
  if (!parsed.success) {
    throw new Error(formatZodEnvError(parsed.error))
  }

  let pgPoolConfig: PgPoolConfigBase
  try {
    pgPoolConfig = resolvePgPoolConfig(process.env)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(
      ['Falha ao resolver conexão com o PostgreSQL (server/.env).', msg].join('\n'),
    )
  }

  let pgPoolMax: number | undefined
  let requireDbOnStartup: boolean | undefined
  try {
    pgPoolMax = parseOptionalPgPoolMax(process.env.PG_POOL_MAX)
    requireDbOnStartup = parseOptionalBooleanFlag(process.env.REQUIRE_DB_ON_STARTUP)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(
      ['Variáveis opcionais de banco inválidas (server/.env).', msg].join('\n'),
    )
  }

  let healthInfraToken: string | undefined
  try {
    healthInfraToken = parseHealthInfraToken(process.env.HEALTH_INFRA_TOKEN)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new Error(
      ['HEALTH_INFRA_TOKEN inválido (server/.env).', msg].join('\n'),
    )
  }

  /**
   * Apenas para testes de integração (`SGP_TEST_LOCAL_DOCUMENT_ADAPTER=1`):
   * força adapter documental local mesmo com `ARGOS_INGEST_URL` no `.env`.
   */
  const forceLocalDocumentAdapter =
    process.env.SGP_TEST_LOCAL_DOCUMENT_ADAPTER === '1'
  const argosIngestUrl = forceLocalDocumentAdapter
    ? undefined
    : (process.env.ARGOS_INGEST_URL?.trim() || undefined)
  const argosIngestToken = process.env.ARGOS_INGEST_TOKEN?.trim() || undefined

  let argosRemoteRequired = false
  const rawRemoteReq = process.env.ARGOS_REMOTE_REQUIRED?.trim()
  if (rawRemoteReq !== undefined && rawRemoteReq !== '') {
    const l = rawRemoteReq.toLowerCase()
    if (['1', 'true', 'yes', 'on'].includes(l)) argosRemoteRequired = true
    else if (['0', 'false', 'no', 'off'].includes(l)) argosRemoteRequired = false
    else {
      throw new Error(
        'ARGOS_REMOTE_REQUIRED deve ser um de: 1, 0, true, false, yes, no, on, off.',
      )
    }
  }

  let argosUseMinimalStub = false
  const rawStub = process.env.ARGOS_USE_MINIMAL_STUB?.trim()
  if (rawStub !== undefined && rawStub !== '') {
    const l = rawStub.toLowerCase()
    if (['1', 'true', 'yes', 'on'].includes(l)) argosUseMinimalStub = true
    else if (['0', 'false', 'no', 'off'].includes(l)) argosUseMinimalStub = false
    else {
      throw new Error(
        'ARGOS_USE_MINIMAL_STUB deve ser um de: 1, 0, true, false, yes, no, on, off.',
      )
    }
  }

  if (argosRemoteRequired && !argosIngestUrl) {
    throw new Error(
      [
        'ARGOS_REMOTE_REQUIRED está ativo mas ARGOS_INGEST_URL está vazio.',
        'Configure o endpoint remoto ARGOS ou desative ARGOS_REMOTE_REQUIRED.',
      ].join(' '),
    )
  }

  const argosCallerEnvironment =
    process.env.ARGOS_CALLER_ENVIRONMENT?.trim() || undefined

  let argosPolicyMode: 'economy' | 'balanced' | 'quality' = 'balanced'
  const rawPolicy = process.env.ARGOS_POLICY_MODE?.trim().toLowerCase()
  if (rawPolicy !== undefined && rawPolicy !== '') {
    if (rawPolicy === 'economy' || rawPolicy === 'balanced' || rawPolicy === 'quality') {
      argosPolicyMode = rawPolicy
    } else {
      throw new Error(
        'ARGOS_POLICY_MODE deve ser um de: economy, balanced, quality.',
      )
    }
  }

  let argosIngestTimeoutMs = 120_000
  const rawTimeout = process.env.ARGOS_INGEST_TIMEOUT_MS?.trim()
  if (rawTimeout !== undefined && rawTimeout !== '') {
    const n = Number.parseInt(rawTimeout, 10)
    if (Number.isNaN(n) || n < 1000 || n > 3_600_000) {
      throw new Error(
        'ARGOS_INGEST_TIMEOUT_MS deve ser um inteiro entre 1000 e 3600000 (ms).',
      )
    }
    argosIngestTimeoutMs = n
  }

  const argosBaseUrl = process.env.ARGOS_BASE_URL?.trim() || undefined

  const DEFAULT_ARGOS_HEALTH_PATH = '/api/v1/specialists/conveyor-health/analyze'
  const rawHealthPath = process.env.ARGOS_CONVEYOR_HEALTH_ANALYZE_PATH?.trim()
  const argosConveyorHealthAnalyzePath =
    rawHealthPath && rawHealthPath !== '' ? rawHealthPath : DEFAULT_ARGOS_HEALTH_PATH

  let argosHealthTimeoutMs = argosIngestTimeoutMs
  const rawHealthTimeout = process.env.ARGOS_HEALTH_TIMEOUT_MS?.trim()
  if (rawHealthTimeout !== undefined && rawHealthTimeout !== '') {
    const n = Number.parseInt(rawHealthTimeout, 10)
    if (Number.isNaN(n) || n < 1000 || n > 3_600_000) {
      throw new Error(
        'ARGOS_HEALTH_TIMEOUT_MS deve ser um inteiro entre 1000 e 3600000 (ms).',
      )
    }
    argosHealthTimeoutMs = n
  }

  let argosHealthEnabled: boolean | undefined
  const rawHealthEn = process.env.ARGOS_HEALTH_ENABLED?.trim()
  if (rawHealthEn !== undefined && rawHealthEn !== '') {
    const l = rawHealthEn.toLowerCase()
    if (['1', 'true', 'yes', 'on'].includes(l)) argosHealthEnabled = true
    else if (['0', 'false', 'no', 'off'].includes(l)) argosHealthEnabled = false
    else {
      throw new Error(
        'ARGOS_HEALTH_ENABLED deve ser um de: 1, 0, true, false, yes, no, on, off.',
      )
    }
  }

  let documentDraftMaxFileBytes = 15 * 1024 * 1024
  const rawMax = process.env.DOCUMENT_DRAFT_MAX_FILE_BYTES?.trim()
  if (rawMax !== undefined && rawMax !== '') {
    const n = Number.parseInt(rawMax, 10)
    if (Number.isNaN(n) || n < 1024 || n > 200 * 1024 * 1024) {
      throw new Error(
        'DOCUMENT_DRAFT_MAX_FILE_BYTES deve ser um inteiro entre 1024 e 209715200.',
      )
    }
    documentDraftMaxFileBytes = n
  }

  const supportTicketsEnabled = parseOptionalBooleanFlag(process.env.SUPPORT_TICKETS_ENABLED) ?? false
  const supportEmailEnabled = parseOptionalBooleanFlag(process.env.SUPPORT_EMAIL_ENABLED) ?? false
  const supportWhatsappEnabled = parseOptionalBooleanFlag(process.env.SUPPORT_WHATSAPP_ENABLED) ?? false

  const supportEmailFrom = process.env.SUPPORT_EMAIL_FROM?.trim() || undefined
  const supportEmailReplyTo = process.env.SUPPORT_EMAIL_REPLY_TO?.trim() || undefined
  const supportEmailSubjectPrefix =
    process.env.SUPPORT_EMAIL_SUBJECT_PREFIX?.trim() || '[SGP]'

  const smtpHost = process.env.SMTP_HOST?.trim() || undefined
  let smtpPort = 587
  const rawSmtpPort = process.env.SMTP_PORT?.trim()
  if (rawSmtpPort !== undefined && rawSmtpPort !== '') {
    const n = Number.parseInt(rawSmtpPort, 10)
    if (Number.isNaN(n) || n < 1 || n > 65535) {
      throw new Error('SMTP_PORT deve ser um inteiro entre 1 e 65535.')
    }
    smtpPort = n
  }
  const smtpSecure = parseOptionalBooleanFlag(process.env.SMTP_SECURE) ?? false
  const smtpUser = process.env.SMTP_USER?.trim() || undefined
  const smtpPass =
    process.env.SMTP_PASS !== undefined ? process.env.SMTP_PASS : undefined
  const smtpRequireTls =
    parseOptionalBooleanFlag(process.env.SMTP_REQUIRE_TLS) ?? smtpPort === 587

  const v = parsed.data
  const databaseUrl =
    'connectionString' in pgPoolConfig ? pgPoolConfig.connectionString : undefined

  cached = {
    nodeEnv: v.NODE_ENV,
    port: v.PORT,
    pgPoolConfig,
    databaseUrl,
    corsOrigin: v.CORS_ORIGIN,
    logLevel: v.LOG_LEVEL,
    pgPoolMax,
    requireDbOnStartup,
    jwtSecret: v.JWT_SECRET,
    jwtExpiresDays: v.JWT_EXPIRES_DAYS,
    authCookieName: v.AUTH_COOKIE_NAME,
    loginMaxFailedAttempts: v.LOGIN_MAX_FAILED_ATTEMPTS,
    loginLockoutMinutes: v.LOGIN_LOCKOUT_MINUTES,
    healthInfraToken,
    argosIngestUrl,
    argosIngestToken,
    argosCallerEnvironment,
    argosPolicyMode,
    argosIngestTimeoutMs,
    argosBaseUrl,
    argosConveyorHealthAnalyzePath,
    argosHealthTimeoutMs,
    argosHealthEnabled,
    documentDraftMaxFileBytes,
    argosRemoteRequired,
    argosUseMinimalStub,
    supportTicketsEnabled,
    supportEmailEnabled,
    supportWhatsappEnabled,
    supportRoutingDefaultEmail: process.env.SUPPORT_ROUTING_DEFAULT_EMAIL?.trim() || undefined,
    supportRoutingDefaultWhatsapp:
      process.env.SUPPORT_ROUTING_DEFAULT_WHATSAPP?.trim() || undefined,
    supportRoutingMediumEmail: process.env.SUPPORT_ROUTING_MEDIUM_EMAIL?.trim() || undefined,
    supportRoutingHighEmail: process.env.SUPPORT_ROUTING_HIGH_EMAIL?.trim() || undefined,
    supportRoutingHighWhatsapp: process.env.SUPPORT_ROUTING_HIGH_WHATSAPP?.trim() || undefined,
    supportEmailFrom,
    supportEmailReplyTo,
    supportEmailSubjectPrefix,
    smtpHost,
    smtpPort,
    smtpSecure,
    smtpUser,
    smtpPass,
    smtpRequireTls,
  }
  return cached
}
