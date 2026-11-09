import { defineConfig } from 'vitest/config';

// Unit tests: in-process, with app.inject(). Integration tests use vitest.integration.config.ts.
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['test/integration/**'],
    environment: 'node',
    // Coverage runs only with `--coverage` (`npm run test:coverage`), so a run of one test file
    // does not fail the thresholds.
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // server.ts only listens and handles signals. The integration tests cover it.
      exclude: ['src/server.ts'],
      reporter: ['text', 'html'],
      thresholds: {
        lines: 90,
        functions: 90,
        branches: 90,
        statements: 90,
      },
    },
  },
});
