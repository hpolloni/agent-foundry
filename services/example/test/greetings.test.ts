import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.ts';

describe('POST /v1/greetings', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ LOG_LEVEL: 'silent' });
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns a greeting for a valid name', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/greetings',
      payload: { name: '  Ada ' },
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ message: 'Hello, Ada!' });
  });

  it.each([{}, { name: '' }, { name: 42 }])('rejects invalid body %j with 400', async (payload) => {
    const response = await app.inject({ method: 'POST', url: '/v1/greetings', payload });
    expect(response.statusCode).toBe(400);
  });
});
