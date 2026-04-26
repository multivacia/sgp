import type pg from 'pg'

/** Pool ou cliente de transação — ambos expõem `.query` compatível. */
export type DbExecutor = pg.Pool | pg.PoolClient
