import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['src/tests/**/*.test.ts'],
    testTimeout: 30000,
    env: {
      JWT_SECRET: 'test-jwt-secret-minimum-16-chars',
    },
  },
})
