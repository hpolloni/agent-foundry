import { defineConfig } from 'vitest/config';

// Unit tests: in-process, with app.inject(). Integration tests use vitest.integration.config.ts.
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['test/integration/**'],
    environment: 'node',
  },
});
