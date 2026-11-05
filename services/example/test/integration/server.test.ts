import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { runUntilExit, startServer, type RunningServer } from './server-process.ts';

describe('server process: HTTP', () => {
  let server: RunningServer;

  beforeAll(async () => {
    server = await startServer();
  });

  afterAll(async () => {
    await server.stop();
  });

  it.each(['/healthz', '/readyz'])('GET %s returns 200 JSON', async (path) => {
    const response = await fetch(`${server.baseUrl}${path}`);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toMatch(/^application\/json/);
    expect(await response.json()).toEqual({ status: 'ok' });
  });

  it('POST /v1/greetings returns a greeting', async () => {
    const response = await fetch(`${server.baseUrl}/v1/greetings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ name: 'Ada' }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ message: 'Hello, Ada!' });
  });

  it('POST /v1/greetings rejects malformed JSON with 400', async () => {
    const response = await fetch(`${server.baseUrl}/v1/greetings`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{not json',
    });
    expect(response.status).toBe(400);
  });

  it('returns 404 for an unknown route', async () => {
    const response = await fetch(`${server.baseUrl}/does-not-exist`);
    expect(response.status).toBe(404);
  });
});

describe('server process: lifecycle', () => {
  it.each(['SIGTERM', 'SIGINT'] as const)('exits with code 0 on %s', async (signal) => {
    const server = await startServer();
    const result = await server.stop(signal);
    expect(result.code).toBe(0);
  });

  it('exits with code 1 on invalid configuration', async () => {
    const result = await runUntilExit({ PORT: 'abc' });
    expect(result.code).toBe(1);
    expect(result.stderr).toContain('Invalid configuration');
  });
});
