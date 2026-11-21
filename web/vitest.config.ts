import { defineConfig } from 'vitest/config'

// Unit tests only cover pure functions (no DOM), so the Node environment is enough.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
})
