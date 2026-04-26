import { loadEnv } from './config/env.js';
import { createLogger } from './plugins/logger.js';
import { getPool } from './plugins/db.js';
import { createApp } from './app.js';
const env = loadEnv();
const pool = getPool(env);
const logger = createLogger(env.logLevel);
const app = createApp(pool, logger, env);
app.listen(env.port, () => {
    logger.info({ port: env.port }, 'sgp-api listening');
});
//# sourceMappingURL=server.js.map