import Fastify, { type FastifyInstance } from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';

import type { Config } from './config.ts';
import { assertRouteSchemas } from './route-schemas.ts';
import { greetingRoutes } from './routes/greetings.ts';
import { healthRoutes } from './routes/health.ts';

/** Build the Fastify app without listening, so tests can use `app.inject()`. */
export async function buildApp(config: Pick<Config, 'LOG_LEVEL'>): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: config.LOG_LEVEL },
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Reject routes without the required Zod schemas when they are registered.
  app.addHook('onRoute', assertRouteSchemas);

  await app.register(healthRoutes);
  await app.register(greetingRoutes, { prefix: '/v1' });

  return app;
}
