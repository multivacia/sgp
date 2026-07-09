import { readFileSync } from 'node:fs'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { visualizer } from 'rollup-plugin-visualizer'

type AppVersionManifest = {
  product?: string
  version?: string
  releaseName?: string
}

/** Alinhar com `PORT` em `server/.env` (ex.: 4000) para o proxy não devolver ECONNREFUSED. */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiPort = env.VITE_DEV_API_PORT?.trim() || '4000'
  const apiTarget =
    env.VITE_DEV_API_TARGET?.trim() || `http://127.0.0.1:${apiPort}`
  const appVersion = JSON.parse(
    readFileSync(new URL('./app-version.json', import.meta.url), 'utf-8'),
  ) as AppVersionManifest

  const plugins = [react(), tailwindcss()]
  if (mode === 'analyze') {
    plugins.push(
      visualizer({
        filename: 'dist/stats.html',
        gzipSize: true,
        brotliSize: true,
        open: false,
        template: 'treemap',
      }),
    )
  }

  return {
    define: {
      __SGP_APP_BASE_METADATA__: JSON.stringify({
        product: appVersion.product?.trim() || 'SGP+',
        version: appVersion.version?.trim() || '0.0.0',
        releaseName:
          appVersion.releaseName?.trim() || appVersion.version?.trim() || 'local',
      }),
    },
    plugins,
    server: {
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
