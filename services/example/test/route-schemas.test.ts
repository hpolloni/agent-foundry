import type { FastifyInstance } from 'fastify';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { z } from 'zod';

import { buildApp } from '../src/app.ts';

const response = { 200: z.object({ ok: z.boolean() }) };
const params = z.object({ id: z.string() });
const body = z.object({ name: z.string() });
const handler = (): { ok: boolean } => ({ ok: true });

describe('route schema gate', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildApp({ LOG_LEVEL: 'silent' });
  });

  afterEach(async () => {
    await app.close();
  });

  it('rejects a path parameter without a params schema', () => {
    expect(() => app.get('/items/:id', { schema: { response } }, handler)).toThrow(
      'Route GET /items/:id has no params schema',
    );
  });

  it('accepts a path parameter with a params schema', () => {
    expect(() => app.get('/items/:id', { schema: { params, response } }, handler)).not.toThrow();
  });

  it.each(['POST', 'PUT', 'PATCH'] as const)('rejects %s without a body schema', (method) => {
    expect(() => app.route({ method, url: '/items', schema: { response }, handler })).toThrow(
      `Route ${method} /items has no body schema`,
    );
  });

  it.each(['POST', 'PUT', 'PATCH'] as const)('accepts %s with a body schema', (method) => {
    expect(() =>
      app.route({ method, url: '/items', schema: { body, response }, handler }),
    ).not.toThrow();
  });

  it.each(['GET', 'DELETE'] as const)('accepts %s without a body schema', (method) => {
    expect(() => app.route({ method, url: '/items', schema: { response }, handler })).not.toThrow();
  });

  it('rejects a method list that includes a method with a body', () => {
    expect(() =>
      app.route({ method: ['GET', 'POST'], url: '/items', schema: { response }, handler }),
    ).toThrow('Route GET,POST /items has no body schema');
  });

  it('checks the response schema before the other schemas', () => {
    expect(() => app.post('/items/:id', handler)).toThrow(
      'Route POST /items/:id has no response schema',
    );
  });
});
