import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

const HealthResponse = z.object({ status: z.literal('ok') });

// eslint-disable-next-line @typescript-eslint/require-await -- Fastify plugins must be async.
export const healthRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get('/healthz', { schema: { response: { 200: HealthResponse } } }, () => ({
    status: 'ok' as const,
  }));

  app.get('/readyz', { schema: { response: { 200: HealthResponse } } }, () => ({
    status: 'ok' as const,
  }));
};
