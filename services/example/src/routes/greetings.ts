import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod';
import { z } from 'zod';

const GreetingRequest = z.object({
  name: z.string().trim().min(1).max(100),
});

const GreetingResponse = z.object({
  message: z.string(),
});

// eslint-disable-next-line @typescript-eslint/require-await -- Fastify plugins must be async.
export const greetingRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post(
    '/greetings',
    { schema: { body: GreetingRequest, response: { 200: GreetingResponse } } },
    (request) => ({ message: `Hello, ${request.body.name}!` }),
  );
};
