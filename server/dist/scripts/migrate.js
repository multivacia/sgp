import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { loadEnv } from '../config/env.js';
const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
async function main() {
    const env = loadEnv();
    const client = new Client(env.pgPoolConfig);
    const migrationsDir = path.join(__dirname, '../../migrations');
    const files = (await readdir(migrationsDir))
        .filter((f) => f.endsWith('.sql'))
        .sort();
    await client.connect();
    try {
        for (const file of files) {
            const sql = await readFile(path.join(migrationsDir, file), 'utf8');
            console.log(`Running ${file}…`);
            await client.query(sql);
        }
        console.log('Migrations concluídas.');
    }
    finally {
        await client.end();
    }
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
//# sourceMappingURL=migrate.js.map