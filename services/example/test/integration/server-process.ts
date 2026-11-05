import { spawn, type ChildProcess } from 'node:child_process';
import { createServer } from 'node:net';
import { setTimeout as sleep } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const SERVER_ENTRY = fileURLToPath(new URL('../../dist/server.js', import.meta.url));
const STARTUP_TIMEOUT_MS = 10_000;

export interface ExitResult {
  code: number | null;
  stderr: string;
}

export interface RunningServer {
  baseUrl: string;
  /** Send a signal and wait for the process to exit. */
  stop: (signal?: NodeJS.Signals) => Promise<ExitResult>;
}

/** Ask the OS for a free TCP port on 127.0.0.1. */
async function freePort(): Promise<number> {
  const probe = createServer();
  await new Promise<void>((resolve, reject) => {
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', resolve);
  });
  const address = probe.address();
  await new Promise<void>((resolve) =>
    probe.close(() => {
      resolve();
    }),
  );
  if (address === null || typeof address === 'string') {
    throw new Error('could not get a free port');
  }
  return address.port;
}

function spawnServer(env: Record<string, string>): {
  child: ChildProcess;
  exited: Promise<ExitResult>;
} {
  const child = spawn(process.execPath, [SERVER_ENTRY], {
    env: { ...process.env, HOST: '127.0.0.1', LOG_LEVEL: 'silent', ...env },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  let stderr = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', (chunk: string) => {
    stderr += chunk;
  });
  const exited = new Promise<ExitResult>((resolve) => {
    child.once('exit', (code) => {
      resolve({ code, stderr });
    });
  });
  return { child, exited };
}

/** Start dist/server.js on a free port and wait until /healthz answers. */
export async function startServer(env: Record<string, string> = {}): Promise<RunningServer> {
  const port = await freePort();
  const baseUrl = `http://127.0.0.1:${String(port)}`;
  const { child, exited } = spawnServer({ PORT: String(port), ...env });

  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  for (;;) {
    if (child.exitCode !== null) {
      const { code, stderr } = await exited;
      throw new Error(`server exited during startup with code ${String(code)}:\n${stderr}`);
    }
    try {
      const response = await fetch(`${baseUrl}/healthz`);
      if (response.ok) break;
    } catch {
      // Not listening yet.
    }
    if (Date.now() > deadline) {
      child.kill('SIGKILL');
      throw new Error(`server did not become healthy in ${String(STARTUP_TIMEOUT_MS)} ms`);
    }
    await sleep(50);
  }

  return {
    baseUrl,
    stop: async (signal = 'SIGTERM') => {
      if (child.exitCode === null) child.kill(signal);
      return exited;
    },
  };
}

/** Start dist/server.js and wait for it to exit by itself (for startup-failure tests). */
export async function runUntilExit(env: Record<string, string>): Promise<ExitResult> {
  const { child, exited } = spawnServer(env);
  const timer = setTimeout(() => child.kill('SIGKILL'), STARTUP_TIMEOUT_MS);
  try {
    return await exited;
  } finally {
    clearTimeout(timer);
  }
}
