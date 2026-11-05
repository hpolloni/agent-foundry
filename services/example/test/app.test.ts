import { describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.ts';

describe('buildApp', () => {
  it.each(['silent', 'warn', 'debug'] as const)(
    'uses LOG_LEVEL=%s for the logger',
    async (level) => {
      const app = await buildApp({ LOG_LEVEL: level });
      expect(app.log.level).toBe(level);
      await app.close();
    },
  );

  it('rejects a route without a response schema', async () => {
    const app = await buildApp({ LOG_LEVEL: 'silent' });
    expect(() => app.get('/no-schema', () => 'x')).toThrow(
      'Route GET /no-schema has no response schema',
    );
    expect(() => app.get('/empty-response', { schema: { response: {} } }, () => 'x')).toThrow(
      'Route GET /empty-response has no response schema',
    );
    await app.close();
  });
});
