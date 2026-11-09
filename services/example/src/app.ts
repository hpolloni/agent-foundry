import Fastify, { type FastifyInstance } from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';

import type { Config } from './config.ts';
import { greetingRoutes } from './routes/greetings.ts';
import { healthRoutes } from './routes/health.ts';

/** Build the Fastify app without listening, so tests can use `app.inject()`. */
export async function buildApp(config: Pick<Config, 'LOG_LEVEL'>): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: config.LOG_LEVEL },
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Every route must declare its response shape, so responses never leak unvalidated data.
  app.addHook('onRoute', (route) => {
    const response: unknown = route.schema?.response;
    if (typeof response !== 'object' || response === null || Object.keys(response).length === 0) {
      throw new Error(`Route ${String(route.method)} ${route.url} has no response schema`);
    }
  });

  await app.register(healthRoutes);
  await app.register(greetingRoutes, { prefix: '/v1' });

  return app;
}
