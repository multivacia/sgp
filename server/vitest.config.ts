import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: [
      'src/tests/**/*.test.ts',
      'src/modules/conveyors/health/**/*.test.ts',
      'src/modules/conveyors/conveyorNodeWorkload.service.test.ts',
      'src/modules/argos/**/*.test.ts',
      'src/modules/operation-matrix/**/*.test.ts',
      'src/modules/system-settings/**/*.test.ts',
      'src/modules/auth/**/*.test.ts',
    ],
    testTimeout: 30000,
    fileParallelism: false,
    env: {
      JWT_SECRET: 'test-jwt-secret-minimum-16-chars',
    },
  },
})
