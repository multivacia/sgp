/**
 * Executa um único arquivo SQL (ex.: após DB já existir com 0001/0002 aplicados).
 * Uso: npx tsx src/scripts/migrate-file.ts migrations/0003_matrix_nodes.sql
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { loadEnv } from '../config/env.js';
const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
async function main() {
    const rel = process.argv[2];
    if (!rel) {
        console.error('Uso: tsx src/scripts/migrate-file.ts <caminho-relativo-ao-server>');
        process.exit(1);
    }
    const env = loadEnv();
    const filePath = path.join(__dirname, '../..', rel);
    const sql = await readFile(filePath, 'utf8');
    const client = new Client(env.pgPoolConfig);
    await client.connect();
    try {
        console.log(`Running ${rel}…`);
        await client.query(sql);
        console.log('OK.');
    }
    finally {
        await client.end();
    }
}
main().catch((e) => {
    console.error(e);
    process.exit(1);
});
//# sourceMappingURL=migrate-file.js.map