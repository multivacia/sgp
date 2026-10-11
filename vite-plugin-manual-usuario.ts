import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Plugin } from 'vite'
import {
  MANUAL_PUBLIC_PATH,
  MANUAL_SOURCE_FILE,
} from './src/lib/help/manual-paths'

/**
 * Publica o Manual do Usuário gerado (`docs/manual/manual-usuario.html`) em
 * `MANUAL_PUBLIC_PATH`, sem duplicar o arquivo no repositório:
 * - desenvolvimento: responde a requisição lendo o arquivo gerado a cada acesso;
 * - build: emite o mesmo conteúdo, byte a byte, em `dist/manual/manual-usuario.html`.
 */
export function manualUsuarioPlugin(): Plugin {
  const sourcePath = resolve(process.cwd(), MANUAL_SOURCE_FILE)
  const outputFileName = MANUAL_PUBLIC_PATH.replace(/^\//, '')

  function readManual(): string {
    if (!existsSync(sourcePath)) {
      throw new Error(
        `${MANUAL_SOURCE_FILE} não existe. Rode "npm run manual:usuario:html" antes.`,
      )
    }
    return readFileSync(sourcePath, 'utf8')
  }

  return {
    name: 'sgp-manual-usuario',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = (req.url ?? '').split('?')[0]
        if (pathname !== MANUAL_PUBLIC_PATH) return next()
        try {
          res.statusCode = 200
          res.setHeader('Content-Type', 'text/html; charset=utf-8')
          res.setHeader('Cache-Control', 'no-cache')
          res.end(readManual())
        } catch (error) {
          next(error)
        }
      })
    },
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: outputFileName,
        source: readManual(),
      })
    },
  }
}
