import { buildApp } from './app.ts';
import { loadConfig } from './config.ts';

const config = loadConfig();
const app = await buildApp(config);

const shutdown = async (signal: NodeJS.Signals): Promise<void> => {
  app.log.info({ signal }, 'shutting down');
  try {
    await app.close();
    process.exit(0);
  } catch (error: unknown) {
    app.log.error({ err: error }, 'error during shutdown');
    process.exit(1);
  }
};

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, (s) => void shutdown(s));
}

try {
  await app.listen({ host: config.HOST, port: config.PORT });
} catch (error: unknown) {
  app.log.fatal({ err: error }, 'failed to start');
  process.exit(1);
}
