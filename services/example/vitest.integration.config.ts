import { defineConfig } from 'vitest/config';

// Integration tests: start dist/server.js as a real process. Run `npm run build` first.
export default defineConfig({
  test: {
    include: ['test/integration/**/*.test.ts'],
    environment: 'node',
    testTimeout: 15_000,
    hookTimeout: 15_000,
  },
});
