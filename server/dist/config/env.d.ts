/** Configuração passada ao `pg` sem montar URL (evita encoding com senhas especiais). */
export type PgPoolConfigBase = {
    connectionString: string;
} | {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
};
export type Env = {
    nodeEnv: string;
    port: number;
    /** Sempre resolvido (Modo A: `connectionString`; Modo B: host/port/database/user/password). */
    pgPoolConfig: PgPoolConfigBase;
    /** Presente só no Modo A (`DATABASE_URL`). */
    databaseUrl?: string;
    corsOrigin: string;
    logLevel: string;
    pgPoolMax?: number;
    requireDbOnStartup?: boolean;
    jwtSecret: string;
    jwtExpiresDays: number;
    authCookieName: string;
    loginMaxFailedAttempts: number;
    loginLockoutMinutes: number;
    /**
     * Quando definido (≥32 caracteres), `GET /health/db` em produção aceita também
     * o header `X-SGP-Infra-Token` com este valor (comparação segura no servidor).
     */
    healthInfraToken?: string;
    /** URL completa do endpoint ARGOS de ingestão (opcional; sem isto usa adapter stub). */
    argosIngestUrl?: string;
    /** Bearer opcional para `Authorization` no cliente HTTP ARGOS. */
    argosIngestToken?: string;
    /**
     * Ambiente do chamador enviado ao gateway ARGOS (`callerEnvironment`, opcional).
     * Ex.: `production`, `staging`.
     */
    argosCallerEnvironment?: string;
    /**
     * Modo de política do pipeline documental no ARGOS (`economy` | `balanced` | `quality`).
     * Deve coincidir com `policyModeSchema` do argos-gateway.
     */
    argosPolicyMode: 'economy' | 'balanced' | 'quality';
    /** Timeout ms para pedidos HTTP ao ARGOS. */
    argosIngestTimeoutMs: number;
    /** Tamanho máximo do ficheiro em `POST .../conveyors/document-draft`. */
    documentDraftMaxFileBytes: number;
    /**
     * Quando true, exige `ARGOS_INGEST_URL` — falha no arranque se o endpoint remoto
     * não estiver configurado (evita usar pipeline local ou stub sem decisão explícita).
     */
    argosRemoteRequired: boolean;
    /**
     * Quando true, sem URL remoto usa apenas o stub mínimo (testes); caso contrário
     * usa o pipeline heurístico local (`LocalPipelineArgosDocumentDraftAdapter`).
     */
    argosUseMinimalStub: boolean;
    supportTicketsEnabled?: boolean;
    supportEmailEnabled?: boolean;
    supportWhatsappEnabled?: boolean;
    supportRoutingDefaultEmail?: string;
    supportRoutingDefaultWhatsapp?: string;
    supportRoutingMediumEmail?: string;
    supportRoutingHighEmail?: string;
    supportRoutingHighWhatsapp?: string;
    /** Remetente obrigatório quando SUPPORT_EMAIL_ENABLED=1 e envio real. */
    supportEmailFrom?: string;
    supportEmailReplyTo?: string;
    /** Prefixo do assunto; padrão [SGP]. */
    supportEmailSubjectPrefix: string;
    smtpHost?: string;
    smtpPort: number;
    smtpSecure: boolean;
    smtpUser?: string;
    smtpPass?: string;
    smtpRequireTls: boolean;
};
/** Para testes de integração que precisam alterar `process.env` antes de `loadEnv()`. */
export declare function resetEnvCacheForTests(): void;
/**
 * Precedência: Modo A (`DATABASE_URL` não vazia após trim) vence.
 * Modo B: `PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD` obrigatórios.
 * No Modo B, retorna objeto estruturado (sem URL) para o `pg` lidar bem com senhas especiais.
 */
export declare function resolvePgPoolConfig(processEnv: NodeJS.ProcessEnv): PgPoolConfigBase;
/**
 * Indica se o ambiente atual sugere banco configurado (antes de validar o restante do schema).
 * Útil para `describe.skipIf` em testes de integração.
 */
export declare function hasDatabaseConnectionInEnv(processEnv: NodeJS.ProcessEnv): boolean;
/**
 * Carrega exclusivamente `server/.env` (única fonte de verdade do backend).
 * `override: true` garante que valores deste arquivo prevaleçam sobre variáveis
 * já definidas no processo (ex.: testes que chamam `dotenv` antes).
 */
export declare function loadDotenvFiles(): void;
export declare function loadEnv(): Env;
//# sourceMappingURL=env.d.ts.map