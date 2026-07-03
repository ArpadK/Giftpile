import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    globals: true,
    // Unit tests only. The e2e specs are Playwright tests (run via `npm run e2e`) and must
    // not be collected by Vitest, or they fail with "test.describe() not expected here".
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    exclude: ['**/node_modules/**', 'src/__tests__/e2e/**'],
  },
})
