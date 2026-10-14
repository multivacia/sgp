import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { extname, join, relative, resolve, sep } from 'node:path'
import type { Plugin } from 'vite'
import {
  MANUAL_IMG_DIR,
  MANUAL_PUBLIC_DIR,
  MANUAL_SOURCE_DIR,
  MANUAL_SOURCE_FILE,
  PRACTICAL_GUIDE_FILES,
} from './src/lib/help/manual-paths'

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
}

function listFiles(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = join(dir, entry.name)
    return entry.isDirectory() ? listFiles(full) : [full]
  })
}

/**
 * Publica os documentos de ajuda de `docs/manual/` em `MANUAL_PUBLIC_DIR`, sem
 * duplicar arquivos no repositório:
 * - Manual do Usuário gerado (`manual-usuario.html`);
 * - Guias Práticos (`colaborador.html`, `gestor-esteira.html`) e suas capturas (`img/`).
 *
 * Desenvolvimento: responde lendo o arquivo a cada acesso.
 * Build: emite o mesmo conteúdo, byte a byte, em `dist/manual/`.
 * Só arquivos listados aqui são publicados (as fontes `.md` ficam de fora).
 */
export function manualUsuarioPlugin(): Plugin {
  const root = process.cwd()
  const sourceDir = resolve(root, MANUAL_SOURCE_DIR)

  /** Caminho público (`/manual/...`) → arquivo de origem. */
  function collect(): Map<string, string> {
    const files = new Map<string, string>()
    const manualPath = resolve(root, MANUAL_SOURCE_FILE)
    if (!existsSync(manualPath)) {
      throw new Error(
        `${MANUAL_SOURCE_FILE} não existe. Rode "npm run manual:usuario:html" antes.`,
      )
    }
    const add = (abs: string) => {
      const rel = relative(sourceDir, abs).split(sep).join('/')
      files.set(`${MANUAL_PUBLIC_DIR}/${rel}`, abs)
    }
    add(manualPath)
    for (const name of Object.values(PRACTICAL_GUIDE_FILES)) {
      const guidePath = join(sourceDir, name)
      if (!existsSync(guidePath)) {
        throw new Error(`${MANUAL_SOURCE_DIR}/${name} não existe.`)
      }
      add(guidePath)
    }
    for (const img of listFiles(join(sourceDir, MANUAL_IMG_DIR))) {
      if (extname(img).toLowerCase() in CONTENT_TYPES) add(img)
    }
    return files
  }

  return {
    name: 'sgp-manual-usuario',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const rawPath = (req.url ?? '').split('?')[0]
        if (!rawPath.startsWith(`${MANUAL_PUBLIC_DIR}/`)) return next()
        try {
          const pathname = decodeURIComponent(rawPath)
          const source = collect().get(pathname)
          if (!source) return next()
          res.statusCode = 200
          res.setHeader(
            'Content-Type',
            CONTENT_TYPES[extname(source).toLowerCase()] ?? 'application/octet-stream',
          )
          res.setHeader('Cache-Control', 'no-cache')
          res.end(readFileSync(source))
        } catch (error) {
          next(error)
        }
      })
    },
    generateBundle() {
      for (const [publicPath, source] of collect()) {
        this.emitFile({
          type: 'asset',
          fileName: publicPath.replace(/^\//, ''),
          source: readFileSync(source),
        })
      }
    },
  }
}
