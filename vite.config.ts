import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { visualizer } from 'rollup-plugin-visualizer'

/** Alinhar com `PORT` em `server/.env` (ex.: 4000) para o proxy não devolver ECONNREFUSED. */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiPort = env.VITE_DEV_API_PORT?.trim() || '4000'
  const apiTarget =
    env.VITE_DEV_API_TARGET?.trim() || `http://127.0.0.1:${apiPort}`

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
