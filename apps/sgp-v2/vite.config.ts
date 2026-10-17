import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/** SGP+ V2: servido em /V2/ ao lado da V1. Em dev, /api vai para o mesmo backend da V1. */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget = env.VITE_DEV_API_TARGET?.trim() || 'http://127.0.0.1:4000'
  return {
    base: '/V2/',
    plugins: [react(), tailwindcss()],
    server: { port: 5174, proxy: { '/api': { target: apiTarget, changeOrigin: true } } },
    test: { environment: 'jsdom', include: ['src/**/*.test.tsx'] },
  }
})
